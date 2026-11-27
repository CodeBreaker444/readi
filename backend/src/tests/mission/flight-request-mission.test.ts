/**
 * Flight requests: zone check on intake (auto-reject outside every client system's
 * operation zones, nearest covering system picked), Link to Mission, status sync
 * from the linked mission, and the OPM-approval skip for zone-validated requests.
 * Prisma, DCC callbacks, D-Flight and the audit log are mocked.
 *
 * Run:  npm test -- flight-request-mission
 */

const prismaMock: Record<string, any> = {
  flight_requests: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), groupBy: jest.fn() },
  pilot_mission: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
  tool: { findFirst: jest.fn(), findMany: jest.fn() },
  client: { findFirst: jest.fn() },
};
jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
jest.mock('@/backend/services/mission/dcc-callback-service', () => ({
  notifyDccAcceptanceForMission: jest.fn().mockResolvedValue({ path: '/acceptance', outcome: 'success' }),
  notifyDccDenial: jest.fn().mockResolvedValue({ path: '/denial', outcome: 'success' }),
  notifyDccExecutionForRequest: jest.fn().mockResolvedValue({ path: '/execution', outcome: 'success' }),
  notifyDccTerminationForRequest: jest.fn().mockResolvedValue({ path: '/termination', outcome: 'success' }),
}));
jest.mock('@/backend/services/integrations/dflight-mission-authorization-service', () => ({
  authorizeMissionWithDFlight: jest.fn().mockResolvedValue({ create: { outcome: 'skipped' } }),
}));
jest.mock('@/backend/services/auditLog/audit-log', () => ({ logEvent: jest.fn() }));

import {
  notifyDccAcceptanceForMission,
  notifyDccDenial,
  notifyDccExecutionForRequest,
  notifyDccTerminationForRequest,
} from '@/backend/services/mission/dcc-callback-service';
import {
  applyIntakeZoneCheck,
  assertToolAllowedForRequest,
  FlightRequestLinkError,
  linkFlightRequestToMission,
  listLinkableMissions,
  requestSkipsOpmApproval,
  requestStatusForMission,
  syncFlightRequestsForMission,
  unlinkFlightRequestsForMission,
} from '@/backend/services/mission/flight-request-mission-service';
import { isRequestCoveredByTool, pickOperationalSystem, readWaypointLatLng } from '@/backend/services/mission/flight-request-zone-service';
import { assignFlightRequest } from '@/backend/services/mission/flight-request-service';
import type { OperationZones } from '@/lib/operation-zones';

const OWNER = 7;
const CLIENT = 42;

// A ~1 km square around Milan centre (points are [lat, lng]).
const square = (lat: number, lng: number, d = 0.005): [number, number][] =>
  [[lat - d, lng - d], [lat - d, lng + d], [lat + d, lng + d], [lat + d, lng - d]];
const greenZones = (lat: number, lng: number): OperationZones => ({
  zones: [{ id: 'g1', name: 'Green 1', kind: 'green', shape: 'polygon', points: square(lat, lng) }],
  perimeter: null,
});
const toolRow = (id: number, code: string, lat: number, lng: number, extra: Record<string, unknown> = {}) => ({
  tool_id: id,
  tool_code: code,
  tool_metadata: { clientId: CLIENT, latitude: lat, longitude: lng, operationZones: greenZones(lat, lng), ...extra },
});
const wp = (lat: number, lng: number) => ({ type: 'Point', coordinates: [lng, lat, 30] });

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.flight_requests.update.mockResolvedValue({});
  prismaMock.flight_requests.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.pilot_mission.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.tool.findMany.mockResolvedValue([]);
  prismaMock.flight_requests.groupBy.mockResolvedValue([{ fk_pilot_mission_id: 1, _count: { _all: 2 } }]);
});

describe('pickOperationalSystem', () => {
  const sys = (id: number, code: string, lat: number, lng: number) =>
    ({ toolId: id, toolCode: code, latitude: lat, longitude: lng, operationZones: greenZones(lat, lng) });

  it('picks the closest system whose zones cover the location', () => {
    // Two overlapping systems; the point is closer to B.
    const r = pickOperationalSystem(45.4641, 9.1900, [sys(1, 'A', 45.4620, 9.1880), sys(2, 'B', 45.4642, 9.1902)]);
    expect(r.validated).toBe(true);
    expect(r.matchedToolId).toBe(2);
    expect(r.matchedToolCode).toBe('B');
  });

  it('ignores a nearer system whose zones do not cover the location', () => {
    const near = { ...sys(1, 'NEAR', 45.47, 9.20), operationZones: greenZones(45.60, 9.40) }; // zones far away
    const far = sys(2, 'FAR', 45.4642, 9.1902);
    const r = pickOperationalSystem(45.4642, 9.1902, [near, far]);
    expect(r.matchedToolCode).toBe('FAR');
  });

  it('rejects when no system covers the location and names the nearest', () => {
    const r = pickOperationalSystem(41.9, 12.5, [sys(1, 'MILAN', 45.46, 9.19)]);
    expect(r.validated).toBe(false);
    expect(r.nearestToolCode).toBe('MILAN');
    expect(r.reason).toMatch(/outside the operation zones/);
  });

  it('treats a location inside a red zone as not operational', () => {
    const zones: OperationZones = {
      zones: [
        { id: 'g', name: 'G', kind: 'green', shape: 'polygon', points: square(45.46, 9.19) },
        { id: 'r', name: 'R', kind: 'red', shape: 'polygon', points: square(45.46, 9.19, 0.001) },
      ],
      perimeter: null,
    };
    const r = pickOperationalSystem(45.46, 9.19, [{ toolId: 1, toolCode: 'A', latitude: null, longitude: null, operationZones: zones }]);
    expect(r.validated).toBe(false);
    // The reason names the red zone instead of saying "outside every system".
    expect(r.reason).toBe('Requested location is inside red (no-fly) zone "R" of system A.');
  });

  it('explains an unsurveyed zone hit', () => {
    const zones: OperationZones = {
      zones: [{ id: 'u', name: 'U', kind: 'unsurveyed', shape: 'polygon', points: square(45.46, 9.19, 0.001) }],
      perimeter: { name: 'P', points: square(45.46, 9.19, 0.05) },
    };
    const r = pickOperationalSystem(45.46, 9.19, [{ toolId: 1, toolCode: 'A', latitude: null, longitude: null, operationZones: zones }]);
    expect(r.reason).toBe('Requested location is inside unsurveyed zone "U" of system A.');
  });

  it('explains a location inside the perimeter but in no green zone', () => {
    const zones: OperationZones = {
      zones: [{ id: 'g', name: 'G', kind: 'green', shape: 'polygon', points: square(45.50, 9.25, 0.001) }],
      perimeter: { name: 'P', points: square(45.46, 9.19, 0.1) },
    };
    const r = pickOperationalSystem(45.46, 9.19, [{ toolId: 1, toolCode: 'A', latitude: null, longitude: null, operationZones: zones }]);
    expect(r.reason).toBe('Requested location is inside the perimeter of system A but not in any of its green zones.');
  });

  it('does not claim "inside the perimeter" for a system that has none', () => {
    const r = pickOperationalSystem(41.9, 12.5, [sys(1, 'MILAN', 45.46, 9.19)]);
    expect(r.reason).toMatch(/^Requested location is outside the operation zones of every system/);
  });

  it('leaves the request unchecked when the client has no zoned system', () => {
    expect(pickOperationalSystem(45.46, 9.19, []).validated).toBeNull();
  });

  it('reads GeoJSON [lng, lat] waypoints', () => {
    expect(readWaypointLatLng(wp(45.1, 9.2))).toEqual({ lat: 45.1, lng: 9.2 });
    expect(readWaypointLatLng({ coordinates: [999, 1] })).toBeNull();
    expect(readWaypointLatLng(null)).toBeNull();
  });
});

describe('applyIntakeZoneCheck', () => {
  it('auto-rejects a request outside every system zone and notifies DCC', async () => {
    prismaMock.tool.findMany.mockResolvedValue([toolRow(9, 'SYS-MI', 45.46, 9.19)]);
    const r = await applyIntakeZoneCheck(100, OWNER, CLIENT, wp(41.9, 12.5), 'EXT-1');
    expect(r.dcc_status).toBe('REJECTED');
    expect(prismaMock.flight_requests.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { request_id: 100 },
      data: expect.objectContaining({ dcc_status: 'REJECTED', zone_validated: false, deny_note: expect.stringMatching(/SYS-MI/) }),
    }));
    expect(notifyDccDenial).toHaveBeenCalledWith(OWNER, 'EXT-1', expect.any(String), CLIENT);
  });

  it('keeps a covered request NEW and stores the matched system', async () => {
    prismaMock.tool.findMany.mockResolvedValue([toolRow(9, 'SYS-MI', 45.46, 9.19)]);
    const r = await applyIntakeZoneCheck(100, OWNER, CLIENT, wp(45.4601, 9.1901), 'EXT-1');
    expect(r.dcc_status).toBe('NEW');
    expect(prismaMock.flight_requests.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ zone_validated: true, fk_matched_tool_id: 9 }),
    }));
    expect(notifyDccDenial).not.toHaveBeenCalled();
  });

  it('does not reject when the location cannot be checked', async () => {
    const r = await applyIntakeZoneCheck(100, OWNER, CLIENT, undefined, 'EXT-1');
    expect(r.dcc_status).toBe('NEW');
    expect(r.zone_check.validated).toBeNull();
  });

  it('only uses systems assigned to the request client', async () => {
    prismaMock.tool.findMany.mockResolvedValue([toolRow(9, 'OTHER', 45.46, 9.19, { clientId: 999 })]);
    const r = await applyIntakeZoneCheck(100, OWNER, CLIENT, wp(45.4601, 9.1901), 'EXT-1');
    expect(r.zone_check.validated).toBeNull();
  });
});

describe('isRequestCoveredByTool (OPM approval skip)', () => {
  it('is true only for a validated request inside the chosen system zones', async () => {
    prismaMock.tool.findFirst.mockResolvedValue({ tool_metadata: { operationZones: greenZones(45.46, 9.19) } });
    await expect(isRequestCoveredByTool({ zone_validated: true, waypoint: wp(45.4601, 9.1901) }, 9, OWNER)).resolves.toBe(true);
    await expect(isRequestCoveredByTool({ zone_validated: true, waypoint: wp(41.9, 12.5) }, 9, OWNER)).resolves.toBe(false);
    await expect(isRequestCoveredByTool({ zone_validated: null, waypoint: wp(45.4601, 9.1901) }, 9, OWNER)).resolves.toBe(false);
  });
});

describe('linkFlightRequestToMission', () => {
  const request = {
    request_id: 5, external_mission_id: 'EXT-5', dcc_status: 'ACKNOWLEDGED', fk_client_id: CLIENT,
    fk_pilot_mission_id: null, waypoint: wp(45.4601, 9.1901), zone_validated: true,
  };

  it('links, sends DCC acceptance and auto-approves a pending mission whose system covers the request', async () => {
    prismaMock.flight_requests.findFirst.mockResolvedValue(request);
    prismaMock.pilot_mission.findFirst.mockResolvedValue({ pilot_mission_id: 77, mission_code: 'M-77', status_name: 'PLANNED', fk_tool_id: 9, opm_approval_status: 'PENDING' });
    prismaMock.tool.findFirst.mockResolvedValue({ tool_metadata: { operationZones: greenZones(45.46, 9.19) } });
    prismaMock.pilot_mission.findUnique.mockResolvedValue({ status_name: 'PLANNED', fk_owner_id: OWNER, abort_reason: null });
    prismaMock.flight_requests.findMany.mockResolvedValue([]);
    prismaMock.flight_requests.findUnique.mockResolvedValue({ dcc_status: 'ASSIGNED' });

    const r = await linkFlightRequestToMission({ requestId: 5, missionId: 77, ownerId: OWNER, userId: 1 });

    expect(prismaMock.flight_requests.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ fk_pilot_mission_id: 77, dcc_status: 'ASSIGNED' }),
    }));
    expect(r.autoApproved).toBe(true);
    expect(prismaMock.pilot_mission.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ opm_approval_status: 'APPROVED' }),
    }));
    expect(notifyDccAcceptanceForMission).toHaveBeenCalledWith(OWNER, 5, 9);
  });

  it('refuses a request that is not acknowledged', async () => {
    prismaMock.flight_requests.findFirst.mockResolvedValue({ ...request, dcc_status: 'NEW' });
    await expect(linkFlightRequestToMission({ requestId: 5, missionId: 77, ownerId: OWNER, userId: 1 }))
      .rejects.toBeInstanceOf(FlightRequestLinkError);
  });

  it("refuses a mission on a system that is not one of the client's zoned systems", async () => {
    prismaMock.flight_requests.findFirst.mockResolvedValue(request);
    prismaMock.tool.findMany.mockResolvedValue([toolRow(9, 'SYS-MI', 45.46, 9.19)]);
    prismaMock.pilot_mission.findFirst.mockResolvedValue({ pilot_mission_id: 78, status_name: 'PLANNED', fk_tool_id: 10, opm_approval_status: null });
    await expect(linkFlightRequestToMission({ requestId: 5, missionId: 78, ownerId: OWNER, userId: 1 }))
      .rejects.toThrow(/not one of the client's systems with operation zones/);
    expect(prismaMock.flight_requests.updateMany).not.toHaveBeenCalled();
  });

  it("lists missions on all the client's zoned systems, covering ones first", async () => {
    prismaMock.flight_requests.findFirst.mockResolvedValue(request);
    prismaMock.tool.findMany.mockResolvedValue([
      toolRow(11, 'SYS-ROME', 41.9, 12.5), // zoned, does not cover the request
      toolRow(9, 'SYS-MI', 45.46, 9.19),   // covers the request
    ]);
    prismaMock.pilot_mission.findMany.mockResolvedValue([
      { pilot_mission_id: 3, mission_code: 'ROME', status_name: 'PLANNED', fk_tool_id: 11, opm_approval_status: null, tool: { tool_code: 'SYS-ROME' }, client: null },
      { pilot_mission_id: 1, mission_code: 'MILAN', status_name: 'PLANNED', fk_tool_id: 9, opm_approval_status: null, tool: { tool_code: 'SYS-MI' }, client: null },
      { pilot_mission_id: 2, mission_code: 'NO-ZONES', status_name: 'PLANNED', fk_tool_id: 10, opm_approval_status: null, tool: { tool_code: 'X' }, client: null },
    ]);
    prismaMock.tool.findFirst.mockImplementation(({ where }: any) => Promise.resolve({
      tool_metadata: { operationZones: where.tool_id === 9 ? greenZones(45.46, 9.19) : greenZones(41.9, 12.5) },
    }));
    const items = await listLinkableMissions(5, OWNER);
    expect(items.map((m) => [m.mission_code, m.zone_covered])).toEqual([['MILAN', true], ['ROME', false]]);
    // How many requests are already linked to each mission (shown in the Link to Mission list).
    expect(items.map((m) => m.linked_request_count)).toEqual([2, 0]);
  });

  it('refuses a completed mission', async () => {
    prismaMock.flight_requests.findFirst.mockResolvedValue(request);
    prismaMock.pilot_mission.findFirst.mockResolvedValue({ pilot_mission_id: 77, status_name: 'COMPLETED', fk_tool_id: 9, opm_approval_status: null });
    await expect(linkFlightRequestToMission({ requestId: 5, missionId: 77, ownerId: OWNER, userId: 1 }))
      .rejects.toThrow(/cannot be linked/);
  });
});

describe('syncFlightRequestsForMission', () => {
  it('maps mission statuses to request statuses', () => {
    expect(requestStatusForMission('PLANNED')).toBe('ASSIGNED');
    expect(requestStatusForMission('IN_PROGRESS')).toBe('IN_PROGRESS');
    expect(requestStatusForMission('COMPLETED')).toBe('COMPLETED');
    expect(requestStatusForMission('ABORTED')).toBe('ISSUE');
    expect(requestStatusForMission('CANCELLED')).toBe('ISSUE');
    expect(requestStatusForMission('WHATEVER')).toBeNull();
  });

  const linked = [{ request_id: 5, external_mission_id: 'EXT-5', fk_client_id: CLIENT, dcc_status: 'ASSIGNED' }];

  it('moves linked requests to IN_PROGRESS when the mission starts', async () => {
    prismaMock.pilot_mission.findUnique.mockResolvedValue({ status_name: 'IN_PROGRESS', fk_owner_id: OWNER, abort_reason: null });
    prismaMock.flight_requests.findMany.mockResolvedValue(linked);
    await syncFlightRequestsForMission(77);
    expect(prismaMock.flight_requests.updateMany).toHaveBeenCalledWith({
      where: { request_id: 5, dcc_status: 'ASSIGNED' },
      data: expect.objectContaining({ dcc_status: 'IN_PROGRESS' }),
    });
    expect(notifyDccExecutionForRequest).toHaveBeenCalledWith(OWNER, 'EXT-5', CLIENT);
  });

  it('completes linked requests with a successful DCC termination', async () => {
    prismaMock.pilot_mission.findUnique.mockResolvedValue({ status_name: 'COMPLETED', fk_owner_id: OWNER, abort_reason: null });
    prismaMock.flight_requests.findMany.mockResolvedValue([{ ...linked[0], dcc_status: 'IN_PROGRESS' }]);
    await syncFlightRequestsForMission(77);
    expect(notifyDccTerminationForRequest).toHaveBeenCalledWith(OWNER, 'EXT-5', 1, undefined, CLIENT);
  });

  it('marks requests ISSUE with a failed termination when the mission is aborted', async () => {
    prismaMock.pilot_mission.findUnique.mockResolvedValue({ status_name: 'ABORTED', fk_owner_id: OWNER, abort_reason: 'Weather' });
    prismaMock.flight_requests.findMany.mockResolvedValue(linked);
    await syncFlightRequestsForMission(77);
    expect(notifyDccTerminationForRequest).toHaveBeenCalledWith(OWNER, 'EXT-5', 0, 'Weather', CLIENT);
  });

  it('does nothing when the status already matches', async () => {
    prismaMock.pilot_mission.findUnique.mockResolvedValue({ status_name: 'PLANNED', fk_owner_id: OWNER, abort_reason: null });
    prismaMock.flight_requests.findMany.mockResolvedValue(linked);
    await syncFlightRequestsForMission(77);
    expect(prismaMock.flight_requests.updateMany).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    prismaMock.pilot_mission.findUnique.mockRejectedValue(new Error('db down'));
    await expect(syncFlightRequestsForMission(77)).resolves.toBeUndefined();
  });
});

describe('unlinkFlightRequestsForMission', () => {
  it('sends unfinished requests back to ACKNOWLEDGED', async () => {
    await unlinkFlightRequestsForMission(77);
    expect(prismaMock.flight_requests.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { fk_pilot_mission_id: 77, dcc_status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
      data: expect.objectContaining({ dcc_status: 'ACKNOWLEDGED', fk_pilot_mission_id: null }),
    }));
  });
});

describe('assertToolAllowedForRequest (checked before a mission is created)', () => {
  it("refuses a system that is not one of the client's zoned systems", async () => {
    prismaMock.tool.findMany.mockResolvedValue([toolRow(9, 'SYS-MI', 45.46, 9.19)]);
    await expect(assertToolAllowedForRequest({ fk_client_id: CLIENT }, 49, OWNER)).rejects.toThrow(/not one of the client's systems/);
    await expect(assertToolAllowedForRequest({ fk_client_id: CLIENT }, null, OWNER)).rejects.toBeInstanceOf(FlightRequestLinkError);
  });

  it('accepts a zoned system, and any system when the client has none', async () => {
    prismaMock.tool.findMany.mockResolvedValue([toolRow(9, 'SYS-MI', 45.46, 9.19)]);
    await expect(assertToolAllowedForRequest({ fk_client_id: CLIENT }, 9, OWNER)).resolves.toBeUndefined();
    prismaMock.tool.findMany.mockResolvedValue([]);
    await expect(assertToolAllowedForRequest({ fk_client_id: CLIENT }, 49, OWNER)).resolves.toBeUndefined();
  });
});

describe('assignFlightRequest (acknowledge)', () => {
  it('only acknowledges NEW requests', async () => {
    prismaMock.flight_requests.updateMany.mockResolvedValue({ count: 0 });
    await expect(assignFlightRequest(136, OWNER, 1)).resolves.toBe(false);
    expect(prismaMock.flight_requests.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { request_id: 136, fk_owner_id: OWNER, dcc_status: { in: ['NEW'] } },
      data: expect.objectContaining({ dcc_status: 'ACKNOWLEDGED' }),
    }));
  });

  it('lets the legacy planning assignment accept NEW or ACKNOWLEDGED', async () => {
    await expect(assignFlightRequest(5, OWNER, 1, 12)).resolves.toBe(true);
    expect(prismaMock.flight_requests.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ dcc_status: { in: ['NEW', 'ACKNOWLEDGED'] } }),
    }));
  });
});

describe('does not auto-approve outside the zones', () => {
  it("leaves a pending mission pending when its system's zones do not cover the request", async () => {
    const request = {
      request_id: 6, external_mission_id: 'EXT-6', dcc_status: 'ACKNOWLEDGED', fk_client_id: CLIENT,
      fk_pilot_mission_id: null, waypoint: wp(45.4601, 9.1901), zone_validated: true,
    };
    prismaMock.flight_requests.findFirst.mockResolvedValue(request);
    prismaMock.tool.findMany.mockResolvedValue([toolRow(9, 'SYS-MI', 45.46, 9.19), toolRow(11, 'SYS-ROME', 41.9, 12.5)]);
    prismaMock.pilot_mission.findFirst.mockResolvedValue({ pilot_mission_id: 80, mission_code: 'M-80', status_name: 'PLANNED', fk_tool_id: 11, opm_approval_status: 'PENDING' });
    prismaMock.tool.findFirst.mockResolvedValue({ tool_metadata: { operationZones: greenZones(41.9, 12.5) } }); // Rome zones: do not cover Milan
    prismaMock.pilot_mission.findUnique.mockResolvedValue({ status_name: 'PLANNED', fk_owner_id: OWNER, abort_reason: null });
    prismaMock.flight_requests.findMany.mockResolvedValue([]);
    prismaMock.flight_requests.findUnique.mockResolvedValue({ dcc_status: 'ASSIGNED' });
    const r = await linkFlightRequestToMission({ requestId: 6, missionId: 80, ownerId: OWNER, userId: 1 });
    expect(r.autoApproved).toBe(false);
    expect(prismaMock.pilot_mission.updateMany).not.toHaveBeenCalled();
  });

  it('requestSkipsOpmApproval is false for a request that was not zone-validated', async () => {
    prismaMock.flight_requests.findFirst.mockResolvedValue({ request_id: 7, zone_validated: null, waypoint: wp(45.4601, 9.1901), fk_client_id: CLIENT });
    prismaMock.tool.findFirst.mockResolvedValue({ tool_metadata: { operationZones: greenZones(45.46, 9.19) } });
    await expect(requestSkipsOpmApproval(7, OWNER, 9)).resolves.toBe(false);
  });
});
