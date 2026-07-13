import { logEvent } from '@/backend/services/auditLog/audit-log';
import { prisma } from '@/lib/prisma';

// Keys must match the OperationStatus enum (PLANNED | IN_PROGRESS | COMPLETED | CANCELLED | ABORTED).
const PLANNED_STATUS_ID = 1;
const ABORTED_STATUS_ID = 5;

/**
 * A mission still PLANNED once its scheduled day has fully elapsed without
 * ever moving to IN_PROGRESS is a no-show — auto-abort it so it drops off
 * the daily board and reads correctly everywhere else (e.g. the Operations
 * table). Called inline whenever the daily board is fetched, rather than on
 * a fixed schedule, so the correction lands as soon as anyone opens the board.
 */
export async function autoAbortStaleMissions(ownerId: number): Promise<{ aborted: number }> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const stale = await prisma.pilot_mission.findMany({
    where: {
      fk_owner_id: ownerId,
      fk_mission_status_id: PLANNED_STATUS_ID,
      scheduled_start: { lt: todayStart },
    },
    select: { pilot_mission_id: true, mission_code: true, mission_name: true },
  });

  if (stale.length === 0) return { aborted: 0 };

  await prisma.pilot_mission.updateMany({
    where: { pilot_mission_id: { in: stale.map((m) => m.pilot_mission_id) } },
    data: { status_name: 'ABORTED', fk_mission_status_id: ABORTED_STATUS_ID },
  });

  for (const mission of stale) {
    logEvent({
      eventType: 'UPDATE',
      entityType: 'operation',
      entityId: mission.pilot_mission_id,
      description: `Mission ${mission.mission_code ?? `#${mission.pilot_mission_id}`} automatically marked as Aborted — scheduled date passed without moving to In Progress`,
      ownerId,
      metadata: { reason: 'scheduled_date_expired', mission_name: mission.mission_name },
    });
  }

  return { aborted: stale.length };
}
