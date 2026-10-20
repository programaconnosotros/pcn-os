import { prismaMock } from '@/test/prisma';
import { mockCookies } from '@/test/cookies';
import { revalidatePath } from 'next/cache';
import { deleteAnnouncement } from './delete-announcement';

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

describe('deleteAnnouncement', () => {
  it('throws when there is no sessionId cookie', async () => {
    mockCookies();

    await expect(deleteAnnouncement('ann-1')).rejects.toThrow('No autorizado');
    expect(prismaMock.announcement.delete).not.toHaveBeenCalled();
  });

  it('throws when the session is not found in the database', async () => {
    mockCookies({ sessionId: 'session-admin' });
    prismaMock.session.findUnique.mockResolvedValue(null);

    await expect(deleteAnnouncement('ann-1')).rejects.toThrow('No autorizado');
    expect(prismaMock.announcement.delete).not.toHaveBeenCalled();
  });

  it('throws when the session belongs to a non-admin user', async () => {
    mockCookies({ sessionId: 'session-regular' });
    prismaMock.session.findUnique.mockResolvedValue(regularSession as any);

    await expect(deleteAnnouncement('ann-1')).rejects.toThrow(
      'No tienes permisos para eliminar anuncios',
    );
    expect(prismaMock.announcement.delete).not.toHaveBeenCalled();
  });

  it('deletes the announcement, revalidates /anuncios, and returns success', async () => {
    mockCookies({ sessionId: 'session-admin' });
    prismaMock.session.findUnique.mockResolvedValue(adminSession as any);
    prismaMock.announcement.delete.mockResolvedValue({} as any);

    const result = await deleteAnnouncement('ann-1');

    expect(prismaMock.announcement.delete).toHaveBeenCalledWith({ where: { id: 'ann-1' } });
    expect(revalidatePath).toHaveBeenCalledWith('/anuncios');
    expect(result).toEqual({ success: true });
  });
});
