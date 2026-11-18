/**
 * Renewal of an expired non-permanent component when the ticket that covers it is closed:
 * the amounts (pure), what the close dialog previews, and what closing writes.
 */
const prismaMock = {
  tool_component: { findMany: jest.fn(), update: jest.fn() },
  maintenance_ticket: { findUnique: jest.fn() },
};
const systemComponentIds = jest.fn();
const excludePermanentlyBlocked = jest.fn();

jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
jest.mock('@/lib/s3Client', () => ({}));
jest.mock('@/backend/utils/refresh-maintenance-days', () => ({}));
jest.mock('@/backend/services/system/maintenance-ticket-components', () => ({
  getSystemComponentIds: (...a: unknown[]) => systemComponentIds(...a),
  excludePermanentlyBlocked: (...a: unknown[]) => excludePermanentlyBlocked(...a),
}));

import { addMonthsIso, computeExpiryRenewal, describeRenewal, EXPIRY_RENEWAL } from '@/lib/system/expiry-renewal';
import { applyExpiryRenewals, getTicketExpiryRenewals, planExpiryRenewals } from '@/backend/services/system/maintenance-ticket-expiry';

const input = (over: Record<string, unknown> = {}) => ({
  expiry_type: 'EXPIRATION_DATE',
  expiration_date: null as string | null,
  expiration_flights: null as number | null,
  expiration_flight_hours: null as number | null,
  current_maintenance_flights: 0,
  current_usage_hours: 0,
  ...over,
});

describe('addMonthsIso', () => {
  it('adds a month', () => {
    expect(addMonthsIso('2026-11-18', 1)).toBe('2026-12-18');
  });
  it('rolls over the year', () => {
    expect(addMonthsIso('2026-12-15', 1)).toBe('2027-01-15');
  });
  it('clamps to the end of a shorter month', () => {
    expect(addMonthsIso('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsIso('2028-01-31', 1)).toBe('2028-02-29'); // leap year
    expect(addMonthsIso('2026-03-31', 1)).toBe('2026-04-30');
  });
});

describe('computeExpiryRenewal', () => {
  const today = '2026-11-18';

  it('constants: one month, 10 flights, 10 flight hours', () => {
    expect(EXPIRY_RENEWAL).toEqual({ months: 1, flights: 10, flightHours: 10 });
  });

  it('date expiry: one month after the later of the old date and today, so it is never still expired', () => {
    expect(computeExpiryRenewal(input({ expiration_date: '2026-11-18' }), today)).toEqual({ expiration_date: { from: '2026-11-18', to: '2026-12-18' } });
    // expired a long time ago: counted from today, not from the old date (that would still be in the past)
    expect(computeExpiryRenewal(input({ expiration_date: '2026-03-02' }), today)).toEqual({ expiration_date: { from: '2026-03-02', to: '2026-12-18' } });
    expect(computeExpiryRenewal(input({ expiration_date: '2026-11-17' }), today)?.expiration_date?.to).toBe('2026-12-18');
  });

  it('flight expiry: +10 flights on the limit', () => {
    expect(computeExpiryRenewal(input({ expiry_type: 'FLIGHTS', expiration_flights: 100, current_maintenance_flights: 100 }), today)).toEqual({
      expiration_flights: { from: 100, to: 110 },
    });
  });

  it('flight-hour expiry: +10 hours on the later of the limit and the hours flown', () => {
    expect(computeExpiryRenewal(input({ expiry_type: 'FLIGHT_HOURS', expiration_flight_hours: 50, current_usage_hours: 50 }), today)).toEqual({
      expiration_flight_hours: { from: 50, to: 60 },
    });
    expect(computeExpiryRenewal(input({ expiry_type: 'FLIGHT_HOURS', expiration_flight_hours: 50, current_usage_hours: 57.5 }), today)).toEqual({
      expiration_flight_hours: { from: 50, to: 67.5 },
    });
  });

  it('mixed: only the limits that were reached are renewed', () => {
    const mixed = { expiry_type: 'MIXED', expiration_date: '2027-06-01', expiration_flights: 100, current_maintenance_flights: 100, expiration_flight_hours: 50, current_usage_hours: 10 };
    expect(computeExpiryRenewal(input(mixed), today)).toEqual({ expiration_flights: { from: 100, to: 110 } });
    expect(computeExpiryRenewal(input({ ...mixed, expiration_date: '2026-11-01' }), today)).toEqual({
      expiration_date: { from: '2026-11-01', to: '2026-12-18' },
      expiration_flights: { from: 100, to: 110 },
    });
  });

  it('nothing reached, or a limit that does not apply to the expiry type, renews nothing', () => {
    expect(computeExpiryRenewal(input({ expiration_date: '2027-01-01' }), today)).toBeNull();
    expect(computeExpiryRenewal(input({ expiration_date: null }), today)).toBeNull();
    // a leftover date on a FLIGHTS component is ignored, like in the expiry check
    expect(computeExpiryRenewal(input({ expiry_type: 'FLIGHTS', expiration_date: '2020-01-01', expiration_flights: 100, current_maintenance_flights: 5 }), today)).toBeNull();
  });

  it('describeRenewal lists what changes', () => {
    expect(describeRenewal({ expiration_date: { from: '2026-11-18', to: '2026-12-18' }, expiration_flights: { from: 100, to: 110 } })).toBe(
      'expiry date 2026-11-18 → 2026-12-18, flight limit 100 → 110',
    );
  });
});

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const row = (id: number, meta: Record<string, unknown>, over: Record<string, unknown> = {}) => ({
  component_id: id,
  component_name: `Name ${id}`,
  component_code: `C-${id}`,
  component_metadata: meta,
  expiry_type: 'EXPIRATION_DATE',
  expiration_date: new Date(day(-3)),
  expiration_flights: null,
  expiration_flight_hours: null,
  current_maintenance_flights: 0,
  current_usage_hours: 0,
  ...over,
});

describe('planExpiryRenewals', () => {
  beforeEach(() => jest.clearAllMocks());

  it('plans only expired non-permanent components that are still in the system', async () => {
    prismaMock.tool_component.findMany.mockResolvedValue([
      row(1, { expiry_permanent: false }), //                          expired, renewable -> renewed
      row(2, {}), //                                                   permanent -> never
      row(3, { expiry_permanent: false }, { expiration_date: new Date(day(30)) }), // not expired -> nothing
      row(4, { expiry_permanent: false, component_status: 'DECOMMISSIONED' }), //   decommissioned -> out
      row(5, { expiry_permanent: false, system_detached: true }), //   warehouse -> out
      row(6, { expiry_permanent: false, component_status: 'DISMISSED' }), //        dismissed -> out
    ]);
    const plans = await planExpiryRenewals([1, 2, 3, 4, 5, 6]);
    expect(plans.map((p) => p.component_id)).toEqual([1]);
    expect(plans[0].renewal.expiration_date?.from).toBe(day(-3));
    expect(plans[0].renewal.expiration_date!.to > day(0)).toBe(true);
  });

  it('nothing to plan for no components, without querying', async () => {
    await expect(planExpiryRenewals([])).resolves.toEqual([]);
    expect(prismaMock.tool_component.findMany).not.toHaveBeenCalled();
  });

  it('reads the flight counter before it is reset and Decimal hours as numbers', async () => {
    prismaMock.tool_component.findMany.mockResolvedValue([
      row(1, { expiry_permanent: false }, { expiry_type: 'FLIGHT_HOURS', expiration_date: null, expiration_flight_hours: { toString: () => '50.00' }, current_usage_hours: { toString: () => '52.5' } }),
    ]);
    const [plan] = await planExpiryRenewals([1]);
    expect(plan.renewal).toEqual({ expiration_flight_hours: { from: 50, to: 62.5 } });
  });
});

describe('applyExpiryRenewals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.tool_component.update.mockResolvedValue({});
  });

  it('writes only the limits that were renewed', async () => {
    await applyExpiryRenewals([
      { component_id: 1, component_name: 'A', component_code: 'A', expiry_type: 'MIXED', renewal: { expiration_date: { from: '2026-11-01', to: '2026-12-18' }, expiration_flights: { from: 100, to: 110 } } },
      { component_id: 2, component_name: 'B', component_code: 'B', expiry_type: 'FLIGHT_HOURS', renewal: { expiration_flight_hours: { from: 50, to: 60 } } },
    ]);
    expect(prismaMock.tool_component.update).toHaveBeenNthCalledWith(1, {
      where: { component_id: 1 },
      data: { expiration_date: new Date('2026-12-18'), expiration_flights: 110 },
    });
    expect(prismaMock.tool_component.update).toHaveBeenNthCalledWith(2, { where: { component_id: 2 }, data: { expiration_flight_hours: 60 } });
  });

  it('does nothing for an empty plan', async () => {
    await applyExpiryRenewals([]);
    expect(prismaMock.tool_component.update).not.toHaveBeenCalled();
  });
});

describe('getTicketExpiryRenewals (close dialog preview)', () => {
  const ticket = (over: Record<string, unknown> = {}) => ({
    fk_owner_id: 9,
    fk_tool_id: 3,
    fk_component_id: 1,
    ticket_status: 'OPEN',
    maintenance_ticket_item: [{ fk_component_id: 1 }],
    ...over,
  });
  beforeEach(() => {
    jest.clearAllMocks();
    excludePermanentlyBlocked.mockImplementation(async (_t: number, ids: number[]) => ids);
    prismaMock.tool_component.findMany.mockResolvedValue([row(1, { expiry_permanent: false })]);
  });

  it('previews what closing the ticket renews, for the components named on it', async () => {
    prismaMock.maintenance_ticket.findUnique.mockResolvedValue(ticket());
    const plans = await getTicketExpiryRenewals(5, 9);
    expect(plans.map((p) => p.component_id)).toEqual([1]);
    expect(excludePermanentlyBlocked).toHaveBeenCalledWith(3, [1]);
    expect(systemComponentIds).not.toHaveBeenCalled();
  });

  it('a system-level ticket covers every component of the system', async () => {
    prismaMock.maintenance_ticket.findUnique.mockResolvedValue(ticket({ fk_component_id: null, maintenance_ticket_item: [] }));
    systemComponentIds.mockResolvedValue([1, 2]);
    await getTicketExpiryRenewals(5, 9);
    expect(systemComponentIds).toHaveBeenCalledWith(3);
    expect(excludePermanentlyBlocked).toHaveBeenCalledWith(3, [1, 2]);
  });

  it('nothing for a closed ticket, a missing ticket, or another owner\'s ticket', async () => {
    prismaMock.maintenance_ticket.findUnique.mockResolvedValue(ticket({ ticket_status: 'CLOSED' }));
    await expect(getTicketExpiryRenewals(5, 9)).resolves.toEqual([]);
    prismaMock.maintenance_ticket.findUnique.mockResolvedValue(null);
    await expect(getTicketExpiryRenewals(5, 9)).resolves.toEqual([]);
    prismaMock.maintenance_ticket.findUnique.mockResolvedValue(ticket());
    await expect(getTicketExpiryRenewals(5, 77)).resolves.toEqual([]);
  });
});
