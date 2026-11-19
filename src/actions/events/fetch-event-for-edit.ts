'use server';

import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/actions/auth/get-current-session';
import { canEditEvent } from '@/lib/event-permissions';

// Esta función permite obtener eventos incluso si están eliminados
// para que los admins puedan editarlos. El resto solo obtiene los que puede editar.
export const fetchEventForEdit = async (id: string) => {
  const session = await getCurrentSession();
  if (!session) throw new Error('No autorizado');

  const event = await prisma.event.findUnique({
    where: {
      id: id,
    },
    // Quien edita el evento ve y cambia su código de descuento.
    omit: { discountCode: false },
    include: {
      sponsors: true,
      flyerDesigners: {
        select: { userId: true, name: true },
        orderBy: { createdAt: 'asc' },
      },
      organizers: { select: { userId: true } },
    },
  });

  if (event && !canEditEvent(session.user, event)) throw new Error('No autorizado');

  return event;
};
