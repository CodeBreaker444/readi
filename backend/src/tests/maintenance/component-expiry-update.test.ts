/**
 * updateComponent with renewable (expiry_permanent === false) and permanent expiry.
 * A renewable expired component is Not Operational and can be renewed or decommissioned; no ticket is created for it.
 * Regression: editing an unrelated field of an expired renewable component must not be refused.
 */
const prismaMock = {
  tool_component: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  tool_model: { findUnique: jest.fn() },
  component_insurance: { upsert: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
jest.mock('@/lib/s3Client', () => ({}));
jest.mock('@/backend/utils/refresh-maintenance-days', () => ({
  refreshMaintenanceDaysForTool: jest.fn(),
  refreshMaintenanceDaysForOwner: jest.fn(),
}));

import { updateComponent } from '@/backend/services/system/system-service';

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const stored = (meta: Record<string, unknown>, over: Record<string, unknown> = {}) => ({
  component_metadata: meta,
  fk_tool_id: 3,
  current_usage_hours: 0,
  current_maintenance_hours: 0,
  current_maintenance_flights: 0,
  serial_number: null,
  drone_registration_code: null,
  maintenance_cycle: null,
  expiration_date: new Date(day(-2)),
  expiry_type: 'EXPIRATION_DATE',
  expiration_flights: null,
  expiration_flight_hours: null,
  ...over,
});

/** What the edit form sends: the full form, with the status it displayed. */
const form = (over: Record<string, unknown> = {}) => ({
  fk_tool_id: 3,
  component_type: 'BATTERY',
  component_vendor: 'ACME',
  expiration_date: day(-2),
  expiry_type: 'EXPIRATION_DATE',
  ...over,
});

const savedMeta = () => prismaMock.tool_component.update.mock.calls[0][0].data.component_metadata;

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.tool_component.update.mockResolvedValue({ component_id: 7, fk_tool_id: 3 });
  prismaMock.tool_component.findFirst.mockResolvedValue(null);
});

describe('updateComponent — renewable expiry (expiry_permanent = false)', () => {
  const expiredRenewable = () => stored({ expiry_permanent: false, component_status: 'OPERATIONAL' });

  it('REGRESSION: editing another field of an expired component (form sends back Not Operational) succeeds and keeps the stored status', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(expiredRenewable());
    const res = await updateComponent(7, form({ component_status: 'NOT_OPERATIONAL', expiry_permanent: false }), 1);
    expect(res.code).toBe(1);
    expect(savedMeta().component_status).toBe('OPERATIONAL');
    expect(savedMeta().expiry_permanent).toBe(false);
  });

  it('choosing Operational without renewing the expired limit is refused with a translatable error', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(expiredRenewable());
    const res = await updateComponent(7, form({ component_status: 'OPERATIONAL', expiry_permanent: false }), 1);
    expect(res.code).toBe(0);
    expect(res.errorKey).toBe('expiredRenewNoOperational');
    expect(res.errorParams?.reasons).toEqual([{ type: 'date', date: day(-2) }]);
    expect(prismaMock.tool_component.update).not.toHaveBeenCalled();
  });

  it('renewing the limits makes it operational again (the displayed Not Operational is not stored)', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(expiredRenewable());
    const res = await updateComponent(7, form({ component_status: 'NOT_OPERATIONAL', expiry_permanent: false, expiration_date: day(60) }), 1);
    expect(res.code).toBe(1);
    expect(savedMeta().component_status).toBe('OPERATIONAL');
    expect(res.statusChange).toEqual({ from: 'NOT_OPERATIONAL', to: 'OPERATIONAL' });
  });

  it('renewing and explicitly choosing Operational works', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(expiredRenewable());
    const res = await updateComponent(7, form({ component_status: 'OPERATIONAL', expiry_permanent: false, expiration_date: day(60) }), 1);
    expect(res.code).toBe(1);
    expect(savedMeta().component_status).toBe('OPERATIONAL');
  });

  it('decommissioning an expired renewable component is allowed', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(expiredRenewable());
    const res = await updateComponent(7, form({ component_status: 'DECOMMISSIONED', expiry_permanent: false }), 1);
    expect(res.code).toBe(1);
    expect(savedMeta().component_status).toBe('DECOMMISSIONED');
  });

  it('an old client that omits the flag keeps the stored (renewable) mode', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(expiredRenewable());
    const res = await updateComponent(7, form({ component_status: 'NOT_OPERATIONAL' }), 1);
    expect(res.code).toBe(1);
    expect(savedMeta().expiry_permanent).toBe(false);
  });

  it('the permanent-expiry setting cannot be flipped while expired', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(expiredRenewable());
    const res = await updateComponent(7, form({ component_status: 'NOT_OPERATIONAL', expiry_permanent: true }), 1);
    expect(res.code).toBe(0);
    expect(res.errorKey).toBe('expiryModeLocked');
  });

  it('setting a past date on a renewable component that was fine is accepted (it becomes Not Operational)', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(stored({ expiry_permanent: false, component_status: 'OPERATIONAL' }, { expiration_date: new Date(day(30)) }));
    const res = await updateComponent(7, form({ component_status: 'OPERATIONAL', expiry_permanent: false, expiration_date: day(-1) }), 1);
    expect(res.code).toBe(1);
    expect(res.statusChange).toEqual({ from: 'OPERATIONAL', to: 'NOT_OPERATIONAL' });
  });
});

describe('updateComponent — permanent expiry is unchanged', () => {
  const expiredPermanent = (meta: Record<string, unknown> = {}) => stored({ component_status: 'OPERATIONAL', ...meta });

  it('legacy component (no flag): renewing is refused', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(expiredPermanent());
    const res = await updateComponent(7, form({ component_status: 'DECOMMISSIONED', expiration_date: day(60) }), 1);
    expect(res.code).toBe(0);
    expect(res.errorKey).toBe('expiredPermanentNoRenew');
  });

  it('expired permanent component cannot be set to another status', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(expiredPermanent({ expiry_permanent: true }));
    const res = await updateComponent(7, form({ component_status: 'OPERATIONAL', expiry_permanent: true }), 1);
    expect(res.code).toBe(0);
    expect(res.errorKey).toBe('expiredPermanentStatus');
    expect(res.errorParams?.status).toBe('OPERATIONAL');
  });

  it('expired permanent component can stay Decommissioned', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(expiredPermanent());
    const res = await updateComponent(7, form({ component_status: 'DECOMMISSIONED' }), 1);
    expect(res.code).toBe(1);
    expect(savedMeta().expiry_permanent).toBe(true);
  });

  it('the permanent-expiry setting cannot be flipped while expired (permanent -> renewable)', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(expiredPermanent());
    const res = await updateComponent(7, form({ component_status: 'DECOMMISSIONED', expiry_permanent: false }), 1);
    expect(res.code).toBe(0);
    expect(res.errorKey).toBe('expiryModeLocked');
  });

  it('a component that is not expired can switch mode freely', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(stored({ component_status: 'OPERATIONAL' }, { expiration_date: new Date(day(30)) }));
    const res = await updateComponent(7, form({ component_status: 'OPERATIONAL', expiry_permanent: false, expiration_date: day(30) }), 1);
    expect(res.code).toBe(1);
    expect(savedMeta().expiry_permanent).toBe(false);
  });
});
