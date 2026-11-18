/**
 * Auto ticket for an expired component (permanent or renewable expiry):
 * one ticket per expiry, the system goes to Maintenance, never a duplicate.
 */
const txMock = {
  $queryRaw: jest.fn(),
  tool_component: { findUnique: jest.fn(), update: jest.fn() },
  maintenance_ticket: { findMany: jest.fn(), create: jest.fn() },
};
const prismaMock = {
  $transaction: jest.fn(async (cb: (t: unknown) => unknown) => cb(txMock)),
  tool_component: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  tool: { findUnique: jest.fn(), update: jest.fn() },
};
const nonOperationalMock = jest.fn();

jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
jest.mock('@/lib/s3Client', () => ({}));
jest.mock('@/backend/utils/refresh-maintenance-days', () => ({}));
jest.mock('@/backend/services/system/system-service', () => ({
  ...jest.requireActual('@/backend/services/system/system-service'),
  getNonOperationalToolIds: (...args: unknown[]) => nonOperationalMock(...args),
}));
jest.mock('@/backend/services/system/maintenance-ticket-notifications', () => ({
  notifyTicketCreated: jest.fn().mockResolvedValue(undefined),
}));

import {
  acknowledgeExpiryEpisodes,
  buildExpiryEpisodeKey,
  raiseExpiryTicket,
  runExpiryTicketSweep,
} from '@/backend/services/system/component-expiry-ticket';

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const limits = (over: Record<string, unknown> = {}) => ({
  expiry_type: 'EXPIRATION_DATE',
  expiration_date: day(-1),
  expiration_flights: null,
  expiration_flight_hours: null,
  current_maintenance_flights: 0,
  current_usage_hours: 0,
  ...over,
});

describe('buildExpiryEpisodeKey', () => {
  const base = { expiry_type: 'EXPIRATION_DATE', expiration_date: day(-1), expiration_flights: null, expiration_flight_hours: null, last_maintenance_date: null };
  it('is stable for the same limits', () => {
    expect(buildExpiryEpisodeKey(base)).toBe(buildExpiryEpisodeKey({ ...base }));
  });
  it('changes when limits are renewed or maintenance is performed', () => {
    const k = buildExpiryEpisodeKey(base);
    expect(buildExpiryEpisodeKey({ ...base, expiration_date: day(30) })).not.toBe(k);
    expect(buildExpiryEpisodeKey({ ...base, expiration_flights: 5 })).not.toBe(k);
    expect(buildExpiryEpisodeKey({ ...base, last_maintenance_date: new Date() })).not.toBe(k);
  });
});

describe('raiseExpiryTicket', () => {
  const row = (meta: Record<string, unknown>, over: Record<string, unknown> = {}) => ({
    component_id: 7,
    component_name: 'Battery 1',
    component_code: 'BAT-1',
    component_type: 'BATTERY',
    component_active: 'Y',
    component_metadata: meta,
    fk_tool_id: 3,
    ...limits(),
    last_maintenance_date: null,
    tool: { tool_active: 'Y', fk_owner_id: 9 },
    ...over,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (cb: (t: unknown) => unknown) => cb(txMock));
    txMock.maintenance_ticket.findMany.mockResolvedValue([]);
    txMock.maintenance_ticket.create.mockResolvedValue({ ticket_id: 55 });
    txMock.tool_component.update.mockResolvedValue({});
    prismaMock.tool.findUnique.mockResolvedValue({ tool_metadata: { status: 'OPERATIONAL' } });
    nonOperationalMock.mockResolvedValue(new Set([3]));
  });

  it('opens one ticket for an expired renewable component, records the episode, and puts the system in Maintenance', async () => {
    txMock.tool_component.findUnique.mockResolvedValue(row({ expiry_permanent: false }));
    await expect(raiseExpiryTicket(7)).resolves.toBe(55);

    const arg = txMock.maintenance_ticket.create.mock.calls[0][0].data;
    expect(arg.fk_tool_id).toBe(3);
    expect(arg.fk_component_id).toBe(7);
    expect(arg.reported_by_user_id).toBeNull();
    expect(arg.ticket_status).toBe('OPEN');
    expect(arg.maintenance_ticket_item.create[0].fk_component_id).toBe(7);

    const stamped = txMock.tool_component.update.mock.calls[0][0].data.component_metadata;
    expect(stamped.expiry_ticket_key).toEqual(expect.any(String));
    expect(stamped.expiry_permanent).toBe(false);

    expect(prismaMock.tool.update).toHaveBeenCalledWith({
      where: { tool_id: 3 },
      data: { tool_metadata: { status: 'MAINTENANCE' } },
    });
  });

  it('a system whose status was set by hand is not switched to Maintenance (the ticket is still created)', async () => {
    txMock.tool_component.findUnique.mockResolvedValue(row({ expiry_permanent: false }));
    prismaMock.tool.findUnique.mockResolvedValue({ tool_metadata: { status: 'NOT_OPERATIONAL' } });
    await expect(raiseExpiryTicket(7)).resolves.toBe(55);
    expect(prismaMock.tool.update).not.toHaveBeenCalled();
  });

  it('a failure while switching the system to Maintenance does not undo the ticket', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    txMock.tool_component.findUnique.mockResolvedValue(row({ expiry_permanent: false }));
    prismaMock.tool.findUnique.mockRejectedValue(new Error('db down'));
    await expect(raiseExpiryTicket(7)).resolves.toBe(55);
  });

  it('does not open a second ticket for the same expiry', async () => {
    const key = buildExpiryEpisodeKey(row({}) as never);
    txMock.tool_component.findUnique.mockResolvedValue(row({ expiry_permanent: false, expiry_ticket_key: key }));
    await expect(raiseExpiryTicket(7)).resolves.toBeNull();
    expect(txMock.maintenance_ticket.create).not.toHaveBeenCalled();
    expect(prismaMock.tool.update).not.toHaveBeenCalled();
  });

  it('permanent (and legacy) expiry also gets a ticket, worded for a Decommissioned component, and the system goes to Maintenance', async () => {
    for (const meta of [{}, { expiry_permanent: true }]) {
      jest.clearAllMocks();
      prismaMock.$transaction.mockImplementation(async (cb: (t: unknown) => unknown) => cb(txMock));
      txMock.maintenance_ticket.findMany.mockResolvedValue([]);
      txMock.maintenance_ticket.create.mockResolvedValue({ ticket_id: 56 });
      txMock.tool_component.update.mockResolvedValue({});
      prismaMock.tool.findUnique.mockResolvedValue({ tool_metadata: { status: 'OPERATIONAL' } });
      nonOperationalMock.mockResolvedValue(new Set([3]));
      txMock.tool_component.findUnique.mockResolvedValue(row(meta));

      await expect(raiseExpiryTicket(7)).resolves.toBe(56);
      const data = txMock.maintenance_ticket.create.mock.calls[0][0].data;
      expect(data.resolution_notes).toContain('Decommissioned (expiry is permanent)');
      expect(data.fk_component_id).toBe(7);
      expect(prismaMock.tool.update).toHaveBeenCalledWith({ where: { tool_id: 3 }, data: { tool_metadata: { status: 'MAINTENANCE' } } });
    }
  });

  it('a permanent component already stored as Decommissioned (taken out of the system) gets no ticket', async () => {
    txMock.tool_component.findUnique.mockResolvedValue(row({ component_status: 'DECOMMISSIONED' }));
    await expect(raiseExpiryTicket(7)).resolves.toBeNull();
    expect(txMock.maintenance_ticket.create).not.toHaveBeenCalled();
  });

  it('permanent expiry is not ticketed twice for the same expiry', async () => {
    const key = buildExpiryEpisodeKey(row({}) as never);
    txMock.tool_component.findUnique.mockResolvedValue(row({ expiry_ticket_key: key }));
    await expect(raiseExpiryTicket(7)).resolves.toBeNull();
    expect(txMock.maintenance_ticket.create).not.toHaveBeenCalled();
  });

  it('skips components that are not expired, decommissioned, dismissed, detached, inactive or on an inactive system', async () => {
    const cases = [
      row({ expiry_permanent: false }, { expiration_date: day(10) }),
      row({ expiry_permanent: false, component_status: 'DECOMMISSIONED' }),
      row({ expiry_permanent: false, component_status: 'DISMISSED' }),
      row({ expiry_permanent: false, system_detached: true }),
      row({ expiry_permanent: false }, { component_active: 'N' }),
      row({ expiry_permanent: false }, { tool: { tool_active: 'N', fk_owner_id: 9 } }),
      null,
    ];
    for (const c of cases) {
      txMock.tool_component.findUnique.mockResolvedValue(c);
      await expect(raiseExpiryTicket(7)).resolves.toBeNull();
    }
    expect(txMock.maintenance_ticket.create).not.toHaveBeenCalled();
  });

  it('an open ticket that already covers the component counts as its ticket: none is created, the episode is recorded', async () => {
    txMock.tool_component.findUnique.mockResolvedValue(row({ expiry_permanent: false }));
    txMock.maintenance_ticket.findMany.mockResolvedValue([{ fk_component_id: 7, maintenance_ticket_item: [] }]);
    await expect(raiseExpiryTicket(7)).resolves.toBeNull();
    expect(txMock.maintenance_ticket.create).not.toHaveBeenCalled();
    expect(txMock.tool_component.update.mock.calls[0][0].data.component_metadata.expiry_ticket_key).toEqual(expect.any(String));
  });

  it('an open system-level ticket also covers it', async () => {
    txMock.tool_component.findUnique.mockResolvedValue(row({ expiry_permanent: false }));
    txMock.maintenance_ticket.findMany.mockResolvedValue([{ fk_component_id: null, maintenance_ticket_item: [] }]);
    await expect(raiseExpiryTicket(7)).resolves.toBeNull();
    expect(txMock.maintenance_ticket.create).not.toHaveBeenCalled();
  });

  it('a component added to a system whose open ticket does not list it gets its own ticket', async () => {
    txMock.tool_component.findUnique.mockResolvedValue(row({ expiry_permanent: false }));
    txMock.maintenance_ticket.findMany.mockResolvedValue([{ fk_component_id: 99, maintenance_ticket_item: [{ fk_component_id: 99 }, { fk_component_id: 98 }] }]);
    await expect(raiseExpiryTicket(7)).resolves.toBe(55);
  });

  it('opens a new ticket for a later expiry after the limits were renewed', async () => {
    const oldKey = buildExpiryEpisodeKey(row({}) as never);
    txMock.tool_component.findUnique.mockResolvedValue(row({ expiry_permanent: false, expiry_ticket_key: oldKey }, { expiration_date: day(0) }));
    await expect(raiseExpiryTicket(7)).resolves.toBe(55);
  });
});

describe('acknowledgeExpiryEpisodes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.tool_component.update.mockResolvedValue({});
  });
  const found = (meta: Record<string, unknown>, over: Record<string, unknown> = {}) =>
    prismaMock.tool_component.findUnique.mockResolvedValue({ component_metadata: meta, ...limits(), last_maintenance_date: new Date(), ...over });

  it('marks a still-expired renewable component as handled so closing the ticket does not trigger another', async () => {
    found({ expiry_permanent: false });
    await acknowledgeExpiryEpisodes([7]);
    expect(prismaMock.tool_component.update.mock.calls[0][0].data.component_metadata.expiry_ticket_key).toEqual(expect.any(String));
  });
  it('ignores components that are no longer expired', async () => {
    found({ expiry_permanent: false }, { expiration_date: day(20) });
    await acknowledgeExpiryEpisodes([7]);
    expect(prismaMock.tool_component.update).not.toHaveBeenCalled();
  });
  it('never throws', async () => {
    prismaMock.tool_component.findUnique.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(acknowledgeExpiryEpisodes([7])).resolves.toBeUndefined();
  });
});

describe('raiseExpiryTicketsSafely', () => {
  it('runs every component once and never throws, even when one fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    prismaMock.$transaction.mockRejectedValue(new Error('boom'));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { raiseExpiryTicketsSafely } = require('@/backend/services/system/component-expiry-ticket');
    await expect(raiseExpiryTicketsSafely([1, 1, 2])).resolves.toBeUndefined();
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
  });
});

describe('runExpiryTicketSweep', () => {
  const full = (id: number) => ({
    component_id: id, component_name: 'A', component_code: 'A', component_type: 'T', component_active: 'Y',
    component_metadata: { expiry_permanent: false }, fk_tool_id: 3, ...limits(), last_maintenance_date: null,
    tool: { tool_active: 'Y', fk_owner_id: 9 },
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (cb: (t: unknown) => unknown) => cb(txMock));
    txMock.maintenance_ticket.findMany.mockResolvedValue([]);
    txMock.maintenance_ticket.create.mockResolvedValue({ ticket_id: 1 });
    txMock.tool_component.update.mockResolvedValue({});
    prismaMock.tool.findUnique.mockResolvedValue({ tool_metadata: { status: 'OPERATIONAL' } });
    nonOperationalMock.mockResolvedValue(new Set([3]));
  });

  it('only processes expired candidates and counts what it created', async () => {
    prismaMock.tool_component.findMany.mockResolvedValue([
      { component_id: 1, ...limits() },
      { component_id: 2, ...limits({ expiration_date: day(10) }) }, // not expired
    ]);
    txMock.tool_component.findUnique.mockResolvedValue(full(1));
    await expect(runExpiryTicketSweep()).resolves.toEqual({ checked: 1, created: 1, errors: 0 });
  });

  it('one failing component does not stop the others', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    prismaMock.tool_component.findMany.mockResolvedValue([{ component_id: 1, ...limits() }, { component_id: 2, ...limits() }]);
    prismaMock.$transaction
      .mockRejectedValueOnce(new Error('boom'))
      .mockImplementationOnce(async (cb: (t: unknown) => unknown) => cb(txMock));
    txMock.tool_component.findUnique.mockResolvedValue(full(2));
    await expect(runExpiryTicketSweep()).resolves.toEqual({ checked: 2, created: 1, errors: 1 });
  });
});
