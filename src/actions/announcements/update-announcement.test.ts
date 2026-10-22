import { prismaMock } from '@/test/prisma';
import { mockCookies } from '@/test/cookies';
import { revalidatePath } from 'next/cache';
import { updateAnnouncement } from './update-announcement';

const adminUser = {
  id: 'user-admin',
  name: 'Admin',
  email: 'admin@pcn.com',
  password: 'hash',
  emailVerified: true,
  role: 'ADMIN' as const,
  phoneNumber: null,
  image: null,
  countryOfOrigin: null,
  province: null,
  xAccountUrl: null,
  linkedinUrl: null,
  gitHubUrl: null,
  slogan: null,
  jobTitle: null,
  enterprise: null,
  career: null,
  studyPlace: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const adminSession = {
  id: 'session-admin',
  userId: 'user-admin',
  expires: new Date('2027-01-01'),
  user: adminUser,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const regularUser = { ...adminUser, id: 'user-regular', role: 'REGULAR' as const };
const regularSession = {
  ...adminSession,
  id: 'session-regular',
  userId: 'user-regular',
  user: regularUser,
};

const validData = {
  title: 'Updated Announcement Title',
  content: 'This is updated announcement content for testing.',
  category: 'general',
  pinned: false,
  published: true,
  eventId: null,
};

const updatedAnnouncement = {
  id: 'ann-1',
  ...validData,
  authorId: 'user-admin',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('updateAnnouncement', () => {
  it('throws when there is no sessionId cookie', async () => {
    mockCookies();

    await expect(updateAnnouncement('ann-1', validData)).rejects.toThrow('No autorizado');
    expect(prismaMock.announcement.update).not.toHaveBeenCalled();
  });

  it('throws when the session is not found in the database', async () => {
    mockCookies({ sessionId: 'session-admin' });
    prismaMock.session.findUnique.mockResolvedValue(null);

    await expect(updateAnnouncement('ann-1', validData)).rejects.toThrow('No autorizado');
    expect(prismaMock.announcement.update).not.toHaveBeenCalled();
  });

  it('throws when the session belongs to a non-admin user', async () => {
    mockCookies({ sessionId: 'session-regular' });
    prismaMock.session.findUnique.mockResolvedValue(regularSession as any);

    await expect(updateAnnouncement('ann-1', validData)).rejects.toThrow(
      'No tienes permisos para editar anuncios',
    );
    expect(prismaMock.announcement.update).not.toHaveBeenCalled();
  });

  it('updates the announcement and revalidates /anuncios on success', async () => {
    mockCookies({ sessionId: 'session-admin' });
    prismaMock.session.findUnique.mockResolvedValue(adminSession as any);
    prismaMock.announcement.findUnique.mockResolvedValue({ eventId: null } as any);
    prismaMock.announcement.update.mockResolvedValue(updatedAnnouncement as any);

    const result = await updateAnnouncement('ann-1', validData);

    expect(prismaMock.announcement.update).toHaveBeenCalledWith({
      where: { id: 'ann-1' },
      data: {
        title: validData.title,
        content: validData.content,
        category: validData.category,
        pinned: validData.pinned,
        published: validData.published,
        eventId: null,
      },
    });
    expect(result).toEqual(updatedAnnouncement);
    expect(revalidatePath).toHaveBeenCalledWith('/anuncios');
  });

  it('revalidates both the new and the old event path when eventId changes', async () => {
    const dataWithEvent = { ...validData, category: 'evento', eventId: 'event-new' };
    mockCookies({ sessionId: 'session-admin' });
    prismaMock.session.findUnique.mockResolvedValue(adminSession as any);
    // previous announcement had a different eventId
    prismaMock.announcement.findUnique.mockResolvedValue({ eventId: 'event-old' } as any);
    prismaMock.announcement.update.mockResolvedValue({
      ...updatedAnnouncement,
      category: 'evento',
      eventId: 'event-new',
    } as any);

    await updateAnnouncement('ann-1', dataWithEvent);

    expect(revalidatePath).toHaveBeenCalledWith('/anuncios');
    expect(revalidatePath).toHaveBeenCalledWith('/eventos/event-new');
    expect(revalidatePath).toHaveBeenCalledWith('/eventos/event-old');
  });
});
