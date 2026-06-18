'use server';

import { prisma } from '@/lib/prisma';
import type { SubRole } from '@/lib/auth/roles';

export async function userHasActiveSubRole(userId: number, subrole: SubRole): Promise<boolean> {
  const row = await prisma.user_subroles.findFirst({
    where: { fk_user_id: userId, subrole, is_active: true },
    select: { id: true },
  });
  return !!row;
}

export async function getUserSubroles(userId: number) {
  return prisma.user_subroles.findMany({
    where: { fk_user_id: userId, is_active: true },
    select: { id: true, subrole: true, granted_at: true, granted_by: true },
    orderBy: { granted_at: 'desc' },
  });
}

export async function grantSubRole(userId: number, subrole: SubRole, grantedBy: number): Promise<void> {
  const existing = await prisma.user_subroles.findFirst({
    where: { fk_user_id: userId, subrole, is_active: true },
    select: { id: true },
  });
  if (existing) return;

  await prisma.user_subroles.create({
    data: {
      fk_user_id: userId,
      subrole,
      granted_by: grantedBy,
      is_active: true,
    },
  });
}

export async function revokeSubRole(
  userId: number,
  subrole: SubRole,
  revokedBy: number
): Promise<{ hadOpenIntervention: boolean }> {
  const activeRow = await prisma.user_subroles.findFirst({
    where: { fk_user_id: userId, subrole, is_active: true },
    select: { id: true },
  });

  if (!activeRow) return { hadOpenIntervention: false };

  // Block revoke if user has a ticket with an open intervention (started but not ended)
  const openIntervention = await prisma.maintenance_ticket.findFirst({
    where: {
      assigned_to_user_id: userId,
      intervention_started_at: { not: null },
      intervention_ended_at: null,
      ticket_status: { not: 'CLOSED' },
    },
    select: { ticket_id: true },
  });

  if (openIntervention) {
    return { hadOpenIntervention: true };
  }

  await prisma.user_subroles.update({
    where: { id: activeRow.id },
    data: {
      is_active: false,
      revoked_at: new Date(),
      revoked_by: revokedBy,
    },
  });

  return { hadOpenIntervention: false };
}
