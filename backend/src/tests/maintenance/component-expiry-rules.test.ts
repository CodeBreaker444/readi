/** Renewable component expiry (component_metadata.expiry_permanent === false): pure rules and error translation. */
jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/s3Client', () => ({}));
jest.mock('@/backend/utils/refresh-maintenance-days', () => ({}));

import { computeEffectiveComponentStatus, expiryReasonParts } from '@/backend/services/system/system-service';
import { blocksSystemWhenExpired, isComponentExpired, isExpiryPermanent } from '@/backend/services/system/maintenance-rules';
import { componentErrorMessage } from '@/lib/system/component-error';

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

describe('isExpiryPermanent', () => {
  it('defaults to permanent for components created before the option existed', () => {
    expect(isExpiryPermanent({})).toBe(true);
    expect(isExpiryPermanent(null)).toBe(true);
    expect(isExpiryPermanent(undefined)).toBe(true);
    expect(isExpiryPermanent({ expiry_permanent: true })).toBe(true);
  });
  it('is renewable only when explicitly false', () => {
    expect(isExpiryPermanent({ expiry_permanent: false })).toBe(false);
  });
});

describe('blocksSystemWhenExpired', () => {
  it('permanent expiry blocks until the component is removed: Decommissioned alone does not free the system', () => {
    expect(blocksSystemWhenExpired({})).toBe(true);
    expect(blocksSystemWhenExpired({ expiry_permanent: true, component_status: 'OPERATIONAL' })).toBe(true);
    expect(blocksSystemWhenExpired({ component_status: 'DECOMMISSIONED' })).toBe(true);
    expect(blocksSystemWhenExpired({ expiry_permanent: true, component_status: 'DECOMMISSIONED' })).toBe(true);
  });
  it('removed from the system (detached / warehouse) never blocks', () => {
    expect(blocksSystemWhenExpired({ system_detached: true })).toBe(false);
    expect(blocksSystemWhenExpired({ system_detached: true, component_status: 'DECOMMISSIONED' })).toBe(false);
    expect(blocksSystemWhenExpired({ expiry_permanent: false, system_detached: true })).toBe(false);
  });
  it('renewable expiry blocks until it is renewed or decommissioned', () => {
    expect(blocksSystemWhenExpired({ expiry_permanent: false })).toBe(true);
    expect(blocksSystemWhenExpired({ expiry_permanent: false, component_status: 'MAINTENANCE' })).toBe(true);
    expect(blocksSystemWhenExpired({ expiry_permanent: false, component_status: 'DECOMMISSIONED' })).toBe(false);
  });
});

describe('isComponentExpired', () => {
  it('date: expired on the day itself and after, not before', () => {
    expect(isComponentExpired(limits({ expiration_date: day(0) }))).toBe(true);
    expect(isComponentExpired(limits({ expiration_date: day(-3) }))).toBe(true);
    expect(isComponentExpired(limits({ expiration_date: day(1) }))).toBe(false);
    expect(isComponentExpired(limits({ expiration_date: null }))).toBe(false);
  });
  it('flights and flight hours', () => {
    expect(isComponentExpired(limits({ expiry_type: 'FLIGHTS', expiration_date: null, expiration_flights: 10, current_maintenance_flights: 10 }))).toBe(true);
    expect(isComponentExpired(limits({ expiry_type: 'FLIGHTS', expiration_date: null, expiration_flights: 10, current_maintenance_flights: 9 }))).toBe(false);
    expect(isComponentExpired(limits({ expiry_type: 'FLIGHT_HOURS', expiration_date: null, expiration_flight_hours: 5, current_usage_hours: 5 }))).toBe(true);
  });
  it('mixed: any limit', () => {
    expect(isComponentExpired(limits({ expiry_type: 'MIXED', expiration_date: day(5), expiration_flights: 3, current_maintenance_flights: 3 }))).toBe(true);
    expect(isComponentExpired(limits({ expiry_type: 'MIXED', expiration_date: day(5), expiration_flights: 3, current_maintenance_flights: 2 }))).toBe(false);
  });
  it('an invalid Date does not throw', () => {
    expect(isComponentExpired(limits({ expiration_date: new Date('nope') }))).toBe(false);
  });
});

describe('computeEffectiveComponentStatus', () => {
  const status = (meta: Record<string, unknown>, over: Record<string, unknown> = {}) =>
    computeEffectiveComponentStatus({ component_metadata: meta, ...limits(), ...over } as never);

  it('permanent (and legacy) expired component is Decommissioned — unchanged behaviour', () => {
    expect(status({})).toBe('DECOMMISSIONED');
    expect(status({ expiry_permanent: true, component_status: 'OPERATIONAL' })).toBe('DECOMMISSIONED');
  });
  it('renewable expired component is Not Operational', () => {
    expect(status({ expiry_permanent: false })).toBe('NOT_OPERATIONAL');
    expect(status({ expiry_permanent: false, component_status: 'OPERATIONAL' })).toBe('NOT_OPERATIONAL');
  });
  it('renewable expired component keeps an explicit Maintenance / Decommissioned / Dismissed', () => {
    expect(status({ expiry_permanent: false, component_status: 'MAINTENANCE' })).toBe('MAINTENANCE');
    expect(status({ expiry_permanent: false, component_status: 'DECOMMISSIONED' })).toBe('DECOMMISSIONED');
    expect(status({ expiry_permanent: false, component_status: 'DISMISSED' })).toBe('DISMISSED');
  });
  it('renewing the limits makes it operational again', () => {
    expect(status({ expiry_permanent: false }, { expiration_date: day(30) })).toBe('OPERATIONAL');
  });
  it('a non-expired component shows its stored status in both modes', () => {
    expect(status({ component_status: 'MAINTENANCE' }, { expiration_date: day(30) })).toBe('MAINTENANCE');
    expect(status({ expiry_permanent: false, component_status: 'NOT_OPERATIONAL' }, { expiration_date: day(30) })).toBe('NOT_OPERATIONAL');
  });
});

describe('expiry error translation', () => {
  it('expiryReasonParts returns data, not English words', () => {
    expect(expiryReasonParts(limits({ expiration_date: '2020-01-02' }) as never)).toEqual([{ type: 'date', date: '2020-01-02' }]);
    expect(
      expiryReasonParts(
        limits({ expiry_type: 'MIXED', expiration_date: null, expiration_flights: 5, current_maintenance_flights: 6, expiration_flight_hours: 2, current_usage_hours: 3 }) as never,
      ),
    ).toEqual([
      { type: 'flights', current: 6, limit: 5 },
      { type: 'hours', current: 3, limit: 2 },
    ]);
    expect(expiryReasonParts(limits({ expiration_date: day(10) }) as never)).toEqual([]);
  });

  it('translates through the i18n key and falls back to the server message', () => {
    const t = jest.fn((key: string, opts: Record<string, unknown> = {}) => `${key}|${JSON.stringify(opts)}`);
    const out = componentErrorMessage(
      { message: 'English', errorKey: 'expiredPermanentStatus', errorParams: { reasons: [{ type: 'flights', current: 6, limit: 5 }], status: 'OPERATIONAL' } },
      t as never,
      'fallback',
    );
    expect(out).toContain('systems.components.expiryError.expiredPermanentStatus');
    expect(t).toHaveBeenCalledWith('systems.components.expiryError.reason.flights', { current: 6, limit: 5 });
    expect(t).toHaveBeenCalledWith('systems.components.common.statusOptions.operational', { defaultValue: 'OPERATIONAL' });
    expect(componentErrorMessage({ message: 'English' }, t as never, 'fallback')).toBe('English');
    expect(componentErrorMessage({}, t as never, 'fallback')).toBe('fallback');
  });
});
