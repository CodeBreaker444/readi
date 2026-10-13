import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/** Appends an entry to a ticket's timeline (maintenance_ticket_event). */
export async function addTicketEvent(
  ticketId: number,
  eventType: string,
  message: string,
  createdByEmail?: string,
  createdByUserId?: number
): Promise<void> {
  await prisma.maintenance_ticket_event.create({
    data: {
      fk_ticket_id:       ticketId,
      event_type:         eventType,
      event_description:  message,
      created_by_user_id: createdByUserId ?? null,
      event_data:         createdByEmail ? ({ email: createdByEmail } as Prisma.InputJsonValue) : Prisma.JsonNull,
      created_at:         new Date(),
    },
  });
}
