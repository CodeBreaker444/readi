/**
 * Read paths of the event logbook service: option lists, event list/detail,
 * attachment URLs and the client-portal variants. Prisma, S3 and permissions are mocked.
 *
 * Run:  npm test -- event-logbook-reads
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    pilot_mission: { findMany: jest.fn(), findUnique: jest.fn() },
    tool: { findMany: jest.fn() },
    tool_component: { findMany: jest.fn() },
    client: { findMany: jest.fn() },
    public_users: { findMany: jest.fn() },
    pilot_event: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
  },
}));
jest.mock('@/lib/s3Client', () => ({
  deleteFileFromS3: jest.fn(),
  getPresignedDownloadUrl: jest.fn(),
  getPresignedUploadUrl: jest.fn(),
}));
jest.mock('@/lib/auth/feature-permissions', () => ({
  getSessionEffectivePermissions: jest.fn(),
}));

import {
  EventLogbookError,
  getClientEventAttachmentUrls,
  getClientEventDetail,
  getEventAttachmentUrls,
  getEventDetail,
  getEventOptions,
  listEvents,
  listEventsForClient,
} from '@/backend/services/logbook/event-logbook-service';
import { prisma } from '@/lib/prisma';
import { getPresignedDownloadUrl } from '@/lib/s3Client';
import { getSessionEffectivePermissions } from '@/lib/auth/feature-permissions';

const db = prisma as any;
const pilot = { userId: 7, ownerId: 1, role: 'PILOT' } as any;
const admin = { userId: 2, ownerId: 1, role: 'ADMIN' } as any;

beforeEach(() => {
  jest.resetAllMocks();
  (getSessionEffectivePermissions as jest.Mock).mockResolvedValue({ systems_manage: null });
  (getPresignedDownloadUrl as jest.Mock).mockImplementation(
    async (key: string, _ttl: number, _name: string, disposition?: string) => `https://s3/${key}?${disposition ?? 'default'}`,
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── getEventOptions ──────────────────────────────────────────────────────────

const mission = (over: Record<string, unknown> = {}) => ({
  pilot_mission_id: 100, mission_name: 'Roof', mission_code: 'M-1', fk_tool_id: 10, fk_client_id: 5,
  scheduled_start: new Date('2026-10-20T08:00:00Z'), actual_end: null, location: 'Milan', status_name: 'PLANNED',
  pilot_mission_status: null, pilot_mission_type: { type_name: 'Inspection' }, pilot_mission_category: { category_name: 'Roof' },
  planning_logbook: null,
  ...over,
});
const tool = (over: Record<string, unknown> = {}) => ({
  tool_id: 10, tool_name: 'Drone', tool_code: 'D1', assigned_client_id: null, location: null, tool_metadata: null,
  ...over,
});

function mockOptions(opts: { missions?: unknown[]; tools?: unknown[]; components?: unknown[]; clients?: unknown[] } = {}) {
  db.pilot_mission.findMany.mockResolvedValue(opts.missions ?? [mission()]);
  db.tool.findMany.mockResolvedValue(opts.tools ?? [tool()]);
  db.tool_component.findMany.mockResolvedValue(opts.components ?? []);
  db.client.findMany.mockResolvedValue(opts.clients ?? []);
}

describe('getEventOptions', () => {
  it('hides the warehouse placeholder and soft-deleted systems', async () => {
    mockOptions({
      tools: [
        tool(),
        tool({ tool_id: 11, tool_metadata: { is_warehouse: true } }),
        tool({ tool_id: 12, tool_metadata: { deleted: true } }),
      ],
    });
    const { drones } = await getEventOptions(admin);
    expect(drones.map((d: any) => d.tool_id)).toEqual([10]);
  });

  it('drops missions whose system is not offered', async () => {
    mockOptions({ missions: [mission(), mission({ pilot_mission_id: 101, fk_tool_id: 99 })] });
    const { missions } = await getEventOptions(admin);
    expect(missions.map((m: any) => m.pilot_mission_id)).toEqual([100]);
  });

  it('lists DRONE components with a serial, primary first, and skips blank serials', async () => {
    mockOptions({
      components: [
        { fk_tool_id: 10, component_name: 'Spare', component_code: 'C2', serial_number: 'S2', component_metadata: null },
        { fk_tool_id: 10, component_name: 'Main', component_code: 'C1', serial_number: ' S1 ', component_metadata: { is_primary: true } },
        { fk_tool_id: 10, component_name: 'NoSerial', component_code: 'C3', serial_number: '  ', component_metadata: null },
      ],
    });
    const { drones } = await getEventOptions(admin);
    expect(drones[0].drone_components.map((c: any) => c.serial_number)).toEqual(['S1', 'S2']);
  });

  it('reads coordinates and location name from the tool metadata', async () => {
    mockOptions({
      tools: [
        tool({ tool_metadata: { latitude: '45.5', longitude: 9.1, pseudo_name: ' Hangar ' }, location: 'Fallback' }),
        tool({ tool_id: 11, tool_metadata: { latitude: 'abc', longitude: 9 }, location: ' Fallback ' }),
      ],
    });
    const { drones } = await getEventOptions(admin);
    expect(drones[0]).toMatchObject({ latitude: 45.5, longitude: 9.1, location_name: 'Hangar' });
    expect(drones[1]).toMatchObject({ latitude: null, longitude: null, location_name: 'Fallback' });
  });

  it('resolves the assigned client from the column, then from tool_metadata.clientId', async () => {
    mockOptions({
      tools: [tool({ assigned_client_id: 5 }), tool({ tool_id: 11, tool_metadata: { clientId: '6' } }), tool({ tool_id: 12, tool_metadata: { clientId: 'x' } })],
      missions: [],
      clients: [
        { client_id: 5, client_name: 'Acme', client_code: 'A', client_legal_name: null, client_email: null, client_phone: null, client_website: null, client_address: 'Via 1', client_city: 'Milan', client_state: null, client_postal_code: '20100', countries: { country_name: 'Italy' } },
        { client_id: 6, client_name: 'Beta', client_code: 'B', client_legal_name: null, client_email: null, client_phone: null, client_website: null, client_address: null, client_city: null, client_state: null, client_postal_code: null, countries: null },
      ],
    });
    const { drones } = await getEventOptions(admin);
    expect(drones[0].assigned_client).toMatchObject({ client_id: 5, address: 'Via 1, 20100 Milan, Italy' });
    expect(drones[1].assigned_client).toMatchObject({ client_id: 6, address: null });
    expect(drones[2].assigned_client).toBeNull();
    // clients are always looked up inside the user's company
    expect(db.client.findMany.mock.calls[0][0].where.fk_owner_id).toBe(1);
  });

  it.each([
    ['PLANNED', 'PLANNED', true],
    ['pianificata', 'PLANNED', true],
    ['in-flight', 'IN_PROGRESS', true],
    ['Completata', 'COMPLETED', false],
    ['canceled', 'CANCELLED', false],
    ['ABORTED', 'ABORTED', false],
  ])('status %s is normalized to %s (active: %s)', async (raw, code, active) => {
    mockOptions({ missions: [mission({ status_name: raw })] });
    const { missions } = await getEventOptions(admin);
    expect(missions[0]).toMatchObject({ status_code: code, is_active: active });
  });

  it('falls back to the joined status table when the mission has no status_name', async () => {
    mockOptions({
      missions: [
        mission({ status_name: null, pilot_mission_status: { status_code: 'COMPLETED', status_name: 'Done', is_final_status: false } }),
        mission({ pilot_mission_id: 101, status_name: null, pilot_mission_status: { status_code: 'X', status_name: 'Custom', is_final_status: true } }),
      ],
    });
    const { missions } = await getEventOptions(admin);
    expect(missions[0]).toMatchObject({ status_code: 'COMPLETED', is_active: false, status_name: 'Done' });
    expect(missions[1]).toMatchObject({ status_code: null, is_active: false });
  });

  it('returns the plan outline only when the mission has a plan', async () => {
    mockOptions({
      missions: [
        mission({
          planning_logbook: {
            mission_planning_id: 3, mission_planning_code: 'P-3', mission_planning_desc: 'desc',
            waypoints: [{ lat: 1, lng: 2, order: 2 }, { lat: 3, lng: 4, order: 1 }],
          },
        }),
        mission({ pilot_mission_id: 101 }),
      ],
    });
    const { missions } = await getEventOptions(admin);
    expect(missions[0].plan).toEqual({ plan_id: 3, code: 'P-3', description: 'desc', waypoints: [{ lat: 3, lng: 4 }, { lat: 1, lng: 2 }] });
    expect(missions[1].plan).toBeNull();
    expect(missions[0].scheduled_start).toBe('2026-10-20T08:00:00.000Z');
  });

  it('limits a scoped pilot to their own missions and the systems of those missions', async () => {
    db.pilot_mission.findMany
      .mockResolvedValueOnce([mission()])
      .mockResolvedValueOnce([{ fk_tool_id: 10 }]);
    db.tool.findMany.mockResolvedValue([tool()]);
    db.tool_component.findMany.mockResolvedValue([]);
    db.client.findMany.mockResolvedValue([]);

    await getEventOptions(pilot);

    expect(db.pilot_mission.findMany.mock.calls[0][0].where).toMatchObject({ fk_owner_id: 1, fk_pilot_user_id: 7 });
    expect(db.pilot_mission.findMany.mock.calls[1][0].where).toMatchObject({ fk_owner_id: 1, fk_pilot_user_id: 7 });
    expect(db.tool.findMany.mock.calls[0][0].where).toMatchObject({ fk_owner_id: 1, tool_active: 'Y', tool_id: { in: [10] } });
  });

  it('does not filter by pilot for full-access users', async () => {
    mockOptions();
    await getEventOptions(admin);
    expect(db.pilot_mission.findMany).toHaveBeenCalledTimes(1);
    expect(db.pilot_mission.findMany.mock.calls[0][0].where).not.toHaveProperty('fk_pilot_user_id');
    expect(db.tool.findMany.mock.calls[0][0].where).not.toHaveProperty('tool_id');
  });
});

// ─── listEvents ───────────────────────────────────────────────────────────────

const eventRow = (over: Record<string, unknown> = {}) => ({
  event_id: 20, fk_event_type_id: 3, event_type: 'bird_strike', event_type_label: 'Bird strike',
  takeoff_time: new Date('2026-10-20T10:00:00Z'), created_at: new Date('2026-10-20T11:00:00Z'),
  fk_pilot_user_id: 7, fk_tool_id: 10, fk_mission_id: 100, fk_client_id: 5,
  latitude: '45.1', longitude: '9.2', location_label: 'Field', notes: 'n',
  _count: { pilot_event_attachment: 2 },
  ...over,
});

function mockLookups() {
  db.public_users.findMany.mockResolvedValue([{ user_id: 7, first_name: 'Ann', last_name: 'Lee' }]);
  db.tool.findMany.mockResolvedValue([{ tool_id: 10, tool_name: 'Drone' }]);
  db.pilot_mission.findMany.mockResolvedValue([{ pilot_mission_id: 100, mission_name: 'Roof', mission_code: 'M-1' }]);
  db.client.findMany.mockResolvedValue([{ client_id: 5, client_name: 'Acme' }]);
}

describe('listEvents', () => {
  it('returns an empty list without querying related tables', async () => {
    db.pilot_event.findMany.mockResolvedValue([]);
    expect(await listEvents(admin, {})).toEqual([]);
    expect(db.public_users.findMany).not.toHaveBeenCalled();
  });

  it('maps rows with pilot, system, mission and client names', async () => {
    db.pilot_event.findMany.mockResolvedValue([eventRow()]);
    mockLookups();
    const [item] = await listEvents(admin, {});
    expect(item).toEqual({
      event_id: 20, event_type_id: 3, event_type: 'bird_strike', event_type_label: 'Bird strike',
      takeoff_time: '2026-10-20T10:00:00.000Z', created_at: '2026-10-20T11:00:00.000Z',
      pilot_user_id: 7, pilot_name: 'Ann Lee', tool_id: 10, tool_name: 'Drone',
      mission_id: 100, mission_name: 'M-1 · Roof', client_id: 5, client_name: 'Acme',
      latitude: 45.1, longitude: 9.2, location_label: 'Field', notes: 'n', attachment_count: 2,
    });
  });

  it('falls back to a prettified label and null names for missing relations', async () => {
    db.pilot_event.findMany.mockResolvedValue([
      eventRow({ event_type_label: null, fk_mission_id: null, fk_client_id: null, latitude: null, longitude: null, fk_pilot_user_id: 99 }),
    ]);
    mockLookups();
    const [item] = await listEvents(admin, {});
    expect(item).toMatchObject({
      event_type_label: 'Bird strike', pilot_name: null, mission_id: null, mission_name: null,
      client_name: null, latitude: null, longitude: null,
    });
  });

  it('scopes pilots to their own events; full-access users see the company', async () => {
    db.pilot_event.findMany.mockResolvedValue([]);
    await listEvents(pilot, {});
    expect(db.pilot_event.findMany.mock.calls[0][0].where).toEqual({ fk_owner_id: 1, fk_pilot_user_id: 7 });
    await listEvents(admin, {});
    expect(db.pilot_event.findMany.mock.calls[1][0].where).toEqual({ fk_owner_id: 1 });
  });

  it('applies the filters', async () => {
    db.pilot_event.findMany.mockResolvedValue([]);
    await listEvents(admin, {
      tool_id: 10, mission_id: 100, event_type_id: 3, date_start: '2026-10-01T00:00:00Z', date_end: '2026-10-31T00:00:00Z',
    } as any);
    expect(db.pilot_event.findMany.mock.calls[0][0].where).toEqual({
      fk_owner_id: 1, fk_tool_id: 10, fk_mission_id: 100, fk_event_type_id: 3,
      takeoff_time: { gte: new Date('2026-10-01T00:00:00Z'), lte: new Date('2026-10-31T00:00:00Z') },
    });
  });

  it('adds no date clause without a date filter, and supports a single bound', async () => {
    db.pilot_event.findMany.mockResolvedValue([]);
    await listEvents(admin, {});
    expect(db.pilot_event.findMany.mock.calls[0][0].where).not.toHaveProperty('takeoff_time');
    await listEvents(admin, { date_start: '2026-10-01T00:00:00Z' } as any);
    expect(Object.keys(db.pilot_event.findMany.mock.calls[1][0].where.takeoff_time)).toEqual(['gte']);
  });
});

describe('listEventsForClient', () => {
  it('restricts the query to the client and its company', async () => {
    db.pilot_event.findMany.mockResolvedValue([]);
    await listEventsForClient(5, 1, {});
    expect(db.pilot_event.findMany.mock.calls[0][0].where).toEqual({ fk_owner_id: 1, fk_client_id: 5 });
  });
});

// ─── getEventDetail ───────────────────────────────────────────────────────────

function mockDetail(over: { notify?: string[]; planWaypoints?: unknown; attachments?: unknown[] } = {}) {
  db.pilot_event.findMany.mockResolvedValue([eventRow()]);
  mockLookups();
  db.pilot_event.findUnique.mockResolvedValue({
    notify_emails: over.notify ?? ['a@x.com'],
    fk_mission_id: 100,
    tool: { tool_code: 'D1' },
    pilot_event_attachment: over.attachments ?? [
      { attachment_id: 1, file_name: 'a.png', file_type: 'image/png', file_size: BigInt(12), file_key: 'k1', is_supporting: false },
    ],
  });
  db.pilot_mission.findUnique.mockResolvedValue({
    planning_logbook: { mission_planning_code: 'P-1', waypoints: over.planWaypoints ?? [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }] },
  });
}

describe('getEventDetail', () => {
  it('returns recipients, plan outline and presigned attachment links', async () => {
    mockDetail();
    const d = await getEventDetail(admin, 20, true);
    expect(d).toMatchObject({
      event_id: 20, tool_code: 'D1', notify_emails: ['a@x.com'], can_edit: true,
      plan: { code: 'P-1', waypoints: [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }] },
    });
    expect(d.attachments).toEqual([
      { attachment_id: 1, file_name: 'a.png', file_type: 'image/png', file_size: 12, url: 'https://s3/k1?inline', download_url: 'https://s3/k1?attachment', is_supporting: false },
    ]);
  });

  it('has no plan when the mission has fewer than two valid waypoints', async () => {
    mockDetail({ planWaypoints: [{ lat: 1, lng: 2 }] });
    expect((await getEventDetail(admin, 20, false)).plan).toBeNull();
  });

  it('404s when the event is not visible to the user', async () => {
    db.pilot_event.findMany.mockResolvedValue([]);
    await expect(getEventDetail(pilot, 20, true)).rejects.toMatchObject({ status: 404, message: 'Event not found' });
    // the visibility check includes the pilot scope
    expect(db.pilot_event.findMany.mock.calls[0][0].where).toMatchObject({ fk_owner_id: 1, fk_pilot_user_id: 7, event_id: 20 });
    expect(db.pilot_event.findUnique).not.toHaveBeenCalled();
  });

  it('404s when the row disappears between the two queries', async () => {
    mockDetail();
    db.pilot_event.findUnique.mockResolvedValue(null);
    await expect(getEventDetail(admin, 20, true)).rejects.toBeInstanceOf(EventLogbookError);
  });
});

describe('getClientEventDetail (client portal)', () => {
  it('is read-only and never exposes recipient emails', async () => {
    mockDetail({ notify: ['secret@x.com'] });
    const d = await getClientEventDetail(5, 1, 20);
    expect(d.can_edit).toBe(false);
    expect(d.notify_emails).toEqual([]);
    expect(db.pilot_event.findMany.mock.calls[0][0].where).toMatchObject({ fk_owner_id: 1, fk_client_id: 5, event_id: 20 });
  });

  it('404s for another client\'s event', async () => {
    db.pilot_event.findMany.mockResolvedValue([]);
    await expect(getClientEventDetail(6, 1, 20)).rejects.toMatchObject({ status: 404 });
  });
});

// ─── attachment URLs ──────────────────────────────────────────────────────────

describe('event attachment URLs', () => {
  const withAttachments = {
    pilot_event_attachment: [
      { attachment_id: 1, file_name: 'a.png', file_type: 'image/png', file_size: BigInt(5), file_key: 'k1', is_supporting: false },
      { attachment_id: 2, file_name: 'v.mp4', file_type: 'video/mp4', file_size: null, file_key: 'k2', is_supporting: true },
    ],
  };

  it('returns inline links with numeric sizes', async () => {
    db.pilot_event.findFirst.mockResolvedValue(withAttachments);
    const r = await getEventAttachmentUrls(admin, 20);
    expect(r).toEqual([
      { attachment_id: 1, file_name: 'a.png', file_type: 'image/png', file_size: 5, url: 'https://s3/k1?inline', is_supporting: false },
      { attachment_id: 2, file_name: 'v.mp4', file_type: 'video/mp4', file_size: null, url: 'https://s3/k2?inline', is_supporting: true },
    ]);
  });

  it('scopes pilots to their own events and 404s otherwise', async () => {
    db.pilot_event.findFirst.mockResolvedValue(null);
    await expect(getEventAttachmentUrls(pilot, 20)).rejects.toMatchObject({ status: 404 });
    expect(db.pilot_event.findFirst.mock.calls[0][0].where).toEqual({ event_id: 20, fk_owner_id: 1, fk_pilot_user_id: 7 });
  });

  it('client portal only reaches events of its own client', async () => {
    db.pilot_event.findFirst.mockResolvedValue(withAttachments);
    await getClientEventAttachmentUrls(5, 1, 20);
    expect(db.pilot_event.findFirst.mock.calls[0][0].where).toEqual({ event_id: 20, fk_owner_id: 1, fk_client_id: 5 });
    db.pilot_event.findFirst.mockResolvedValue(null);
    await expect(getClientEventAttachmentUrls(6, 1, 20)).rejects.toMatchObject({ status: 404 });
  });
});
