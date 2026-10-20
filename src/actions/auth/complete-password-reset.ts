'use server';

import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { getRateLimitWait } from '@/lib/rate-limit';
import { newPasswordSchema } from '@/lib/validations/auth-schemas';
import { findValidPasswordResetToken } from '@/lib/verification-codes';
import { revokeUserOAuthTokens } from '@/lib/oauth/tokens';

export type CompletePasswordResetResult =
  | { success: true }
  | { success: false; error: 'WEAK_PASSWORD'; message: string }
  | { success: false; error: 'INVALID_CODE' }
  | { success: false; error: 'RATE_LIMIT'; waitSeconds: number };

/** Paso 3 del reseteo: vuelve a validar el código y guarda la contraseña nueva. */
export const completePasswordReset = async (
  email: string,
  code: string,
  newPassword: string,
): Promise<CompletePasswordResetResult> => {
  const waitSeconds = await getRateLimitWait('verifyCode');
  if (waitSeconds > 0) return { success: false, error: 'RATE_LIMIT', waitSeconds };

  // El formulario ya valida, pero la action se puede llamar directo
  const parsedPassword = newPasswordSchema.safeParse(newPassword);
  if (!parsedPassword.success) {
    return {
      success: false,
      error: 'WEAK_PASSWORD',
      message: parsedPassword.error.issues[0].message,
    };
  }

  const token = await findValidPasswordResetToken(email, code);
  if (!token) return { success: false, error: 'INVALID_CODE' };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, suspendedAt: true },
  });
  // Una cuenta suspendida no puede cambiar la contraseña
  if (!user || user.suspendedAt) return { success: false, error: 'INVALID_CODE' };

  const hashedPassword = await hashPassword(newPassword);

  // Actualizar contraseña y marcar token como usado en una transacción
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { used: true },
    }),
    // Eliminar todas las sesiones del usuario por seguridad
    prisma.session.deleteMany({
      where: { userId: user.id },
    }),
    // And every MCP connection (src/lib/oauth): whoever had the old password may have made one.
    revokeUserOAuthTokens(user.id),
  ]);

  return { success: true };
};
