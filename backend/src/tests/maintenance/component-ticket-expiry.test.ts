/**
 * Tickets for expired components:
 *   - an expired RENEWABLE component can be put on a ticket (it is only Not Operational because it expired);
 *     everything else that is blocked stays blocked
 *   - a system held Not Operational by an expired component goes to Maintenance when a ticket is opened
 */
const prismaMock = {
  tool_component: { findMany: jest.fn() },
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

import {
  findTicketBlockedComponents,
  getTicketBlockedComponentIds,
  getTicketableComponentIds,
  putSystemInMaintenanceIfExpired,
} from '@/backend/services/system/maintenance-ticket-components';

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const comp = (id: number, meta: Record<string, unknown>, expiryOffset: number | null = -2) => ({
  component_id: id,
  component_metadata: meta,
  expiration_date: expiryOffset === null ? null : new Date(day(expiryOffset)),
  expiry_type: 'EXPIRATION_DATE',
  expiration_flights: null,
  expiration_flight_hours: null,
  current_maintenance_flights: 0,
  current_usage_hours: 0,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('expired components and new tickets', () => {
  const rows = [
    comp(1, { expiry_permanent: false }), //                         renewable, expired  -> ticketable
    comp(2, {}), //                                                  permanent, expired  -> blocked (Decommissioned)
    comp(3, { expiry_permanent: false, component_status: 'NOT_OPERATIONAL' }), // reported issue -> blocked
    comp(4, { expiry_permanent: false, component_status: 'DECOMMISSIONED' }), // decommissioned -> blocked
    comp(5, { expiry_permanent: false, component_status: 'DISMISSED' }), //      dismissed -> blocked
    comp(6, { expiry_permanent: false }, 30), //                     renewable, not expired -> ticketable
    comp(7, { expiry_permanent: false, system_detached: true }), //  detached -> blocked
    comp(8, { component_status: 'NOT_OPERATIONAL' }, null), //       explicit Not Operational -> blocked
    comp(9, { expiry_permanent: false, component_status: 'MAINTENANCE' }), // in maintenance -> ticketable
  ];

  beforeEach(() => prismaMock.tool_component.findMany.mockResolvedValue(rows));

  it('only the expired renewable component (and healthy ones) can be put on a ticket', async () => {
    await expect(getTicketableComponentIds(10)).resolves.toEqual([1, 6, 9]);
  });

  it('blocked ones are reported with the status that blocks them', async () => {
    const blocked = await findTicketBlockedComponents(10, rows.map((r) => r.component_id));
    expect(blocked).toEqual([
      { component_id: 2, status: 'DECOMMISSIONED' },
      { component_id: 3, status: 'NOT_OPERATIONAL' },
      { component_id: 4, status: 'DECOMMISSIONED' },
      { component_id: 5, status: 'DISMISSED' },
      { component_id: 7, status: 'DISMISSED' },
      { component_id: 8, status: 'NOT_OPERATIONAL' },
    ]);
  });

  it('getTicketBlockedComponentIds drives the ticket pickers', async () => {
    await expect(getTicketBlockedComponentIds(10)).resolves.toEqual(new Set([2, 3, 4, 5, 7, 8]));
  });

  it('empty selection never blocks', async () => {
    await expect(findTicketBlockedComponents(10, [])).resolves.toEqual([]);
  });
});

describe('putSystemInMaintenanceIfExpired', () => {
  const tool = (status?: string) => prismaMock.tool.findUnique.mockResolvedValue({ tool_metadata: { clientId: 4, ...(status ? { status } : {}) } });

  it('a stored-Operational system held Not Operational by an expired component goes to Maintenance, keeping its other metadata', async () => {
    tool('OPERATIONAL');
    nonOperationalMock.mockResolvedValue(new Set([10]));
    await expect(putSystemInMaintenanceIfExpired(10)).resolves.toBe(true);
    expect(prismaMock.tool.update).toHaveBeenCalledWith({
      where: { tool_id: 10 },
      data: { tool_metadata: { clientId: 4, status: 'MAINTENANCE' } },
    });
  });

  it('a system with no stored status counts as Operational', async () => {
    tool();
    nonOperationalMock.mockResolvedValue(new Set([10]));
    await expect(putSystemInMaintenanceIfExpired(10)).resolves.toBe(true);
  });

  it('a system that is not held by an expired component is left alone', async () => {
    tool('OPERATIONAL');
    nonOperationalMock.mockResolvedValue(new Set());
    await expect(putSystemInMaintenanceIfExpired(10)).resolves.toBe(false);
    expect(prismaMock.tool.update).not.toHaveBeenCalled();
  });

  it('a status the operator set by hand is never overwritten', async () => {
    for (const status of ['NOT_OPERATIONAL', 'MAINTENANCE', 'DISMISSED']) {
      tool(status);
      nonOperationalMock.mockResolvedValue(new Set([10]));
      await expect(putSystemInMaintenanceIfExpired(10)).resolves.toBe(false);
    }
    expect(prismaMock.tool.update).not.toHaveBeenCalled();
  });
});
