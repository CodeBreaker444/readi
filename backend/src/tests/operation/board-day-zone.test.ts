/**
 * Daily Board day and auto-abort follow time zones: "today" is the viewer's calendar day (not the UTC day), and a
 * mission is only auto-aborted once its day is over in every zone, so an early-morning mission in a zone ahead of UTC
 * is never aborted in the middle of its own day. Prisma and the board's side services are mocked.
 *
 * Run:  npm test -- board-day-zone
 */

const prismaMock: Record<string, any> = {
  pilot_mission: { findMany: jest.fn(), updateMany: jest.fn() },
  owner: { findUnique: jest.fn() },
  maintenance_ticket: { findMany: jest.fn() },
};
jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
jest.mock('@/backend/services/auditLog/audit-log', () => ({ logEvent: jest.fn() }));
jest.mock('@/backend/services/operation/tool-maintenance-status', () => ({ getToolMaintenanceStatusBatch: jest.fn().mockResolvedValue({}) }));
jest.mock('@/backend/services/operation/mission-approval-service', () => ({ getAdminDecidedMissionIds: jest.fn().mockResolvedValue(new Set()) }));
jest.mock('@/backend/services/settings/module-email-notification-service', () => ({
  sendMissionStartedModuleEmail: jest.fn(),
  sendMissionCompletedModuleEmail: jest.fn(),
}));

import { AUTO_ABORT_GRACE_HOURS, autoAbortStaleMissions } from '@/backend/services/operation/auto-abort-service';
import { getMissionBoard } from '@/backend/services/operation/operation-board-service';

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.pilot_mission.findMany.mockResolvedValue([]);
  prismaMock.owner.findUnique.mockResolvedValue({ d_flight_enabled: false });
});

// 06:00 on 17 Nov in India = 00:30 UTC. 03:00 India that day = 21:30 UTC on 16 Nov, which is "yesterday" in UTC.
const NOW = new Date('2026-11-17T00:30:00Z');
const THREE_AM_IST = new Date('2026-11-16T21:30:00Z');

describe('auto-abort', () => {
  it('only looks at missions scheduled more than the grace period ago, so an early-morning mission in India is safe', async () => {
    await autoAbortStaleMissions(7, NOW);

    const before: Date = prismaMock.pilot_mission.findMany.mock.calls[0][0].where.scheduled_start.lt;
    expect(AUTO_ABORT_GRACE_HOURS).toBe(25);
    expect(before.toISOString()).toBe('2026-11-15T23:30:00.000Z');
    // The old rule used UTC midnight (17 Nov 00:00Z), which would have aborted the 03:00 India mission at 06:00 India.
    expect(THREE_AM_IST.getTime()).toBeGreaterThan(before.getTime());
    expect(THREE_AM_IST.getTime()).toBeLessThan(Date.parse('2026-11-17T00:00:00Z'));
  });

  it('still aborts a planned mission that is older than any zone could call today', async () => {
    prismaMock.pilot_mission.findMany.mockResolvedValue([{ pilot_mission_id: 1, mission_code: 'M-1', mission_name: 'old' }]);
    prismaMock.pilot_mission.updateMany.mockResolvedValue({ count: 1 });

    await expect(autoAbortStaleMissions(7, NOW)).resolves.toEqual({ aborted: 1 });
    expect(prismaMock.pilot_mission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status_name: 'ABORTED', fk_mission_status_id: 5 } }),
    );
  });
});

describe('Daily Board day', () => {
  // call 0 is the auto-abort lookup; then scheduled, in progress and done
  const scheduledWindow = () => prismaMock.pilot_mission.findMany.mock.calls[1][0].where.AND[0].OR[1].scheduled_start;
  const doneWindow = () => prismaMock.pilot_mission.findMany.mock.calls[3][0].where.actual_end;

  it("uses the viewer's calendar day: India's 17 Nov runs from 16 Nov 18:30 UTC to 17 Nov 18:29:59.999 UTC", async () => {
    await getMissionBoard(7, 11, 'PIC', 'Asia/Kolkata', NOW);

    for (const w of [scheduledWindow(), doneWindow()]) {
      expect(w.gte.toISOString()).toBe('2026-11-16T18:30:00.000Z');
      expect(w.lte.toISOString()).toBe('2026-11-17T18:29:59.999Z');
    }
    // so the 03:00 India mission is on today's board
    expect(THREE_AM_IST.getTime()).toBeGreaterThanOrEqual(scheduledWindow().gte.getTime());
  });

  it('keeps the UTC day when no zone is given', async () => {
    await getMissionBoard(7, 11, 'PIC', undefined, NOW);

    expect(scheduledWindow().gte.toISOString()).toBe('2026-11-17T00:00:00.000Z');
    expect(scheduledWindow().lte.toISOString()).toBe('2026-11-17T23:59:59.999Z');
  });
});
