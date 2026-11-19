import { logEvent } from '@/backend/services/auditLog/audit-log';
import { prisma } from '@/lib/prisma';

// Keys must match the OperationStatus enum (PLANNED | IN_PROGRESS | COMPLETED | CANCELLED | ABORTED).
const PLANNED_STATUS_ID = 1;
const ABORTED_STATUS_ID = 5;

/**
 * How long past its scheduled start a mission must be before it can be a no-show. A "day" differs by time zone
 * (the same instant is already tomorrow in India and still yesterday in the US), and an aborted mission is a
 * closed record, so it must be over in EVERY zone before we abort it. A local day lasts at most 25 hours (DST), so a
 * mission scheduled more than 25 hours ago is past its day wherever its pilot is. The old rule (before UTC midnight)
 * aborted an early-morning mission in a zone ahead of UTC (03:00 in India) in the middle of its own day.
 */
export const AUTO_ABORT_GRACE_HOURS = 25;

/**
 * A mission still PLANNED once its scheduled day has fully elapsed without
 * ever moving to IN_PROGRESS, and with no recorded actual start/end, is a no-show — auto-abort it so it drops off
 * the daily board and reads correctly everywhere else (e.g. the Operations
 * table). Called inline whenever the daily board is fetched, rather than on
 * a fixed schedule, so the correction lands as soon as anyone opens the board.
 */
export async function autoAbortStaleMissions(ownerId: number, now = new Date()): Promise<{ aborted: number }> {
  const staleBefore = new Date(now.getTime() - AUTO_ABORT_GRACE_HOURS * 3_600_000);

  const stale = await prisma.pilot_mission.findMany({
    where: {
      fk_owner_id: ownerId,
      fk_mission_status_id: PLANNED_STATUS_ID,
      scheduled_start: { lt: staleBefore },
      // A mission with recorded flight times did fly (e.g. times entered post-flight or imported
      // from logs) even if its status was never advanced, so it is not a no-show.
      actual_start: null,
      actual_end: null,
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
