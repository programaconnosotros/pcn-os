'use server';

import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentSession } from '@/actions/auth/get-current-session';
import { DEACTIVATED_EMAIL_DOMAIN, DEACTIVATED_NAME, DEACTIVATION_PHRASE } from '@/lib/active-user';
import { lockEvent, notifyPromotions, promoteFromWaitlist } from '@/lib/event-waitlist';
import { hashPassword } from '@/lib/password';
import prisma from '@/lib/prisma';
import { enforceRateLimit } from '@/lib/rate-limit';
import { deleteCurrentSession } from '@/lib/session';

const inputSchema = z.object({
  password: z.string().min(1, 'Ingresá tu contraseña.').max(200),
  confirmation: z.string().max(50),
});

type Result = { success: true } | { success: false; error: string };

/**
 * Leaves every upcoming event the person signed up or is waiting for, handing their spot to whoever
 * is next on the waitlist, like a regular cancellation would.
 */
const leaveUpcomingEvents = async (userId: string) => {
  const now = new Date();
  const upcoming = { OR: [{ endDate: { gt: now } }, { endDate: null, date: { gt: now } }] };
  await prisma.eventWaitlistEntry.updateMany({
    where: { userId, cancelledAt: null, promotedAt: null },
    data: { cancelledAt: now },
  });
  const registrations = await prisma.eventRegistration.findMany({
    where: { userId, cancelledAt: null, event: upcoming },
    select: { id: true, eventId: true },
  });

  for (const registration of registrations) {
    const outcome = await prisma.$transaction(async (tx) => {
      const event = await lockEvent(tx, registration.eventId);
      await tx.eventRegistration.update({
        where: { id: registration.id },
        data: { cancelledAt: new Date() },
      });
      return event ? { event, promoted: await promoteFromWaitlist(tx, event) } : null;
    });
    if (outcome?.promoted.length) await notifyPromotions(outcome.event, outcome.promoted);
    revalidatePath(`/eventos/${registration.eventId}`);
  }
};

/**
 * The signed-in person deactivates their own account (a soft delete). The User row stays so what
 * they published keeps working, but it's anonymized, can't sign in again and frees the email for a
 * new account. The places they were tagged in (photos, projects, talks, articles, events) stay up:
 * only the link to them goes, and names typed as plain text there remain.
 */
export const deactivateAccount = async (input: z.infer<typeof inputSchema>): Promise<Result> => {
  const session = await getCurrentSession();
  if (!session) throw new Error('Debes estar autenticado');
  // Same budget as other password and code checks, so it can't be used to guess the password.
  await enforceRateLimit('verifyCode');

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  if (parsed.data.confirmation.trim().toLowerCase() !== DEACTIVATION_PHRASE) {
    return { success: false, error: `Escribí "${DEACTIVATION_PHRASE}" para confirmar.` };
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    omit: { password: false },
  });
  if (!user) throw new Error('Usuario no encontrado');
  if (user.role === 'ADMIN') {
    return {
      success: false,
      error: 'Una cuenta admin no se puede desactivar: pedile a otro admin que te quite el rol.',
    };
  }
  if (!(await bcrypt.compare(parsed.data.password, user.password))) {
    return { success: false, error: 'La contraseña no es correcta.' };
  }

  await leaveUpcomingEvents(userId);

  const where = { userId };
  await prisma.$transaction([
    // Tags and memberships: the photo, project, talk or event stays, the link to the person goes.
    prisma.galleryItemTag.deleteMany({ where }),
    prisma.articleAuthor.deleteMany({ where }),
    prisma.eventOrganizer.deleteMany({ where }),
    prisma.projectMember.updateMany({ where, data: { userId: null } }),
    prisma.talkSpeaker.updateMany({ where, data: { userId: null } }),
    prisma.talkProposalSpeaker.updateMany({ where, data: { userId: null } }),
    prisma.eventFlyerDesigner.updateMany({ where, data: { userId: null } }),
    prisma.identityLink.deleteMany({ where }),
    prisma.userBadge.deleteMany({ where }),
    // Their reactions and personal lists.
    prisma.like.deleteMany({ where }),
    prisma.commentLike.deleteMany({ where }),
    prisma.forumPostLike.deleteMany({ where }),
    prisma.forumCommentLike.deleteMany({ where }),
    prisma.setupLike.deleteMany({ where }),
    prisma.contentMark.deleteMany({ where }),
    prisma.notification.deleteMany({ where }),
    // Profile data.
    prisma.userLanguage.deleteMany({ where }),
    prisma.userStackItem.deleteMany({ where }),
    prisma.userPosition.deleteMany({ where }),
    prisma.twoFactorChallenge.deleteMany({ where }),
    prisma.user.update({
      where: { id: userId },
      data: {
        deactivatedAt: new Date(),
        name: DEACTIVATED_NAME,
        email: `${userId}@${DEACTIVATED_EMAIL_DOMAIN}`,
        // Nobody knows it: the account can't be signed into again.
        password: await hashPassword(randomBytes(32).toString('base64url')),
        emailVerified: false,
        role: 'REGULAR',
        isAmbassador: false,
        isCofounder: false,
        phoneNumber: null,
        image: null,
        countryOfOrigin: null,
        province: null,
        xAccountUrl: null,
        linkedinUrl: null,
        gitHubUrl: null,
        instagramUrl: null,
        youtubeUrl: null,
        twitchUrl: null,
        kickUrl: null,
        slogan: null,
        jobTitle: null,
        enterprise: null,
        career: null,
        studyPlace: null,
        specialties: [],
        operatingSystems: [],
        favoriteIde: null,
        twoFactorSecret: null,
        twoFactorEnabledAt: null,
        twoFactorRecoveryCodes: [],
        twoFactorLastStep: null,
      },
    }),
    // Logged out everywhere, this browser included (its cookie goes below).
    prisma.session.deleteMany({ where }),
    // And off the MCP server, if it was an admin who connected Claude.
    prisma.oAuthToken.deleteMany({ where }),
  ]);

  await deleteCurrentSession();
  revalidatePath('/', 'layout');
  return { success: true };
};
