/**
 * Setting a component's expiry to today / a past date:
 *   - saving without touching the status keeps the STORED status (the form only sends a status the user changed)
 *   - the component then reads as Decommissioned (derived) and its system becomes Not Operational
 *   - only an explicit Decommissioned takes the component out of the system
 */
const prismaMock = {
  tool_component: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  tool_model: { findUnique: jest.fn() },
  component_insurance: { upsert: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
jest.mock('@/lib/s3Client', () => ({}));
jest.mock('@/backend/utils/refresh-maintenance-days', () => ({
  refreshMaintenanceDaysForTool: jest.fn(),
  refreshMaintenanceDaysForOwner: jest.fn(),
}));

import { getNonOperationalToolIds, updateComponent } from '@/backend/services/system/system-service';

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const stored = (meta: Record<string, unknown>, expiryOffset: number) => ({
  component_metadata: meta,
  fk_tool_id: 3,
  current_usage_hours: 0,
  current_maintenance_hours: 0,
  current_maintenance_flights: 0,
  serial_number: null,
  drone_registration_code: null,
  maintenance_cycle: null,
  expiration_date: new Date(day(expiryOffset)),
  expiry_type: 'EXPIRATION_DATE',
  expiration_flights: null,
  expiration_flight_hours: null,
});

/** The edit form WITHOUT a status: what it sends when the user did not change the status. */
const formNoStatus = (over: Record<string, unknown> = {}) => ({
  fk_tool_id: 3,
  component_type: 'BATTERY',
  expiry_type: 'EXPIRATION_DATE',
  expiration_date: day(0),
  ...over,
});

const savedMeta = () => prismaMock.tool_component.update.mock.calls[0][0].data.component_metadata;

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.tool_component.update.mockResolvedValue({ component_id: 7, fk_tool_id: 3 });
  prismaMock.tool_component.findFirst.mockResolvedValue(null);
});

describe('setting the expiry to today or the past', () => {
  it('permanent expiry: saved without touching the status, it stays stored as Operational and reads as Decommissioned', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(stored({ component_status: 'OPERATIONAL' }, 30));
    const res = await updateComponent(7, formNoStatus(), 1);
    expect(res.code).toBe(1);
    expect(savedMeta().component_status).toBe('OPERATIONAL'); // NOT stored as Decommissioned
    expect(res.statusChange).toEqual({ from: 'OPERATIONAL', to: 'DECOMMISSIONED' });
  });

  it('works for a past date too', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(stored({ component_status: 'OPERATIONAL' }, 30));
    const res = await updateComponent(7, formNoStatus({ expiration_date: day(-5) }), 1);
    expect(res.code).toBe(1);
    expect(savedMeta().component_status).toBe('OPERATIONAL');
  });

  it('editing another field of an already expired permanent component does not decommission it behind the user\'s back', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(stored({ component_status: 'OPERATIONAL' }, -3));
    const res = await updateComponent(7, formNoStatus({ expiration_date: day(-3), component_vendor: 'ACME' }), 1);
    expect(res.code).toBe(1);
    expect(savedMeta().component_status).toBe('OPERATIONAL');
  });

  it('an explicit Decommissioned is stored (that is what takes it out of the system)', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(stored({ component_status: 'OPERATIONAL' }, -3));
    const res = await updateComponent(7, formNoStatus({ expiration_date: day(-3), component_status: 'DECOMMISSIONED' }), 1);
    expect(res.code).toBe(1);
    expect(savedMeta().component_status).toBe('DECOMMISSIONED');
  });

  it('an explicit Operational on an expired permanent component is still refused', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(stored({ component_status: 'OPERATIONAL' }, -3));
    const res = await updateComponent(7, formNoStatus({ expiration_date: day(-3), component_status: 'OPERATIONAL' }), 1);
    expect(res.code).toBe(0);
    expect(res.errorKey).toBe('expiredPermanentStatus');
  });

  it('renewable expiry: the status stays stored, the component reads as Not Operational', async () => {
    prismaMock.tool_component.findUnique.mockResolvedValue(stored({ component_status: 'OPERATIONAL', expiry_permanent: false }, 30));
    const res = await updateComponent(7, formNoStatus({ expiry_permanent: false }), 1);
    expect(res.code).toBe(1);
    expect(savedMeta().component_status).toBe('OPERATIONAL');
    expect(res.statusChange).toEqual({ from: 'OPERATIONAL', to: 'NOT_OPERATIONAL' });
  });
});

describe('system status for an expired component', () => {
  const inSystem = (meta: Record<string, unknown>) => ({ fk_tool_id: 3, component_metadata: meta });

  it('a component stored as Operational but expired makes its system Not Operational', async () => {
    prismaMock.tool_component.findMany.mockResolvedValueOnce([inSystem({ component_status: 'OPERATIONAL' })]).mockResolvedValueOnce([]);
    await expect(getNonOperationalToolIds([3])).resolves.toEqual(new Set([3]));
  });

  it('a renewable expired component does too', async () => {
    prismaMock.tool_component.findMany.mockResolvedValueOnce([inSystem({ expiry_permanent: false })]).mockResolvedValueOnce([]);
    await expect(getNonOperationalToolIds([3])).resolves.toEqual(new Set([3]));
  });

  it('only an explicitly Decommissioned (or detached) expired component leaves the system Operational', async () => {
    prismaMock.tool_component.findMany
      .mockResolvedValueOnce([inSystem({ component_status: 'DECOMMISSIONED' }), inSystem({ system_detached: true })])
      .mockResolvedValueOnce([]);
    await expect(getNonOperationalToolIds([3])).resolves.toEqual(new Set());
  });
});
