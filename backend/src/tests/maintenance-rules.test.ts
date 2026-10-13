import {
  addHhmmHours,
  computeComponentStatus,
  computeDashboardStatus,
  computeMaintenanceDayUpdates,
  getBatteryCycleRatio,
  hhmmToMinutes,
  isComponentPartOfSystem,
  parseComponentMeta,
  subtractHhmmHours,
} from '@/backend/services/system/maintenance-rules';
import {
  buildMissionComponentPayload,
  computeMissionUsage,
  evaluateComponent,
  worstStatus,
} from '@/backend/services/operation/mission-maintenance-rules';

describe('HH.MM hour math', () => {
  it('converts HH.MM to minutes', () => {
    expect(hhmmToMinutes(1.3)).toBe(90);
    expect(hhmmToMinutes(0.45)).toBe(45);
  });

  it('adds with minute carry (0.45 + 0.30 = 1.15, not 0.75)', () => {
    expect(addHhmmHours(0.45, 0.3)).toBeCloseTo(1.15, 5);
    // 1.50 means 1h50m (NOT 1.5 decimal hours): 1h50m + 1h50m = 3h40m
    expect(addHhmmHours(1.5, 1.5)).toBeCloseTo(3.4, 5);
  });

  it('subtracts and never goes below zero', () => {
    expect(subtractHhmmHours(2.0, 0.3)).toBeCloseTo(1.3, 5);
    expect(subtractHhmmHours(0.2, 1.0)).toBe(0);
  });
});

describe('parseComponentMeta', () => {
  it('handles objects, JSON strings, double-encoded strings and junk', () => {
    expect(parseComponentMeta({ a: 1 })).toEqual({ a: 1 });
    expect(parseComponentMeta('{"a":1}')).toEqual({ a: 1 });
    expect(parseComponentMeta(JSON.stringify(JSON.stringify({ a: 1 })))).toEqual({ a: 1 });
    expect(parseComponentMeta('not json')).toEqual({});
    expect(parseComponentMeta('null')).toEqual({});
    expect(parseComponentMeta([1, 2])).toEqual({});
    expect(parseComponentMeta(null)).toEqual({});
  });

  it('reads battery ratio (default 1) and detached/decommissioned flags', () => {
    expect(getBatteryCycleRatio({ battery_cycle_ratio: 0.5 })).toBe(0.5);
    expect(getBatteryCycleRatio({ battery_cycle_ratio: '0.5' })).toBe(1);
    expect(isComponentPartOfSystem({})).toBe(true);
    expect(isComponentPartOfSystem({ system_detached: true })).toBe(false);
    expect(isComponentPartOfSystem({ component_status: 'DECOMMISSIONED' })).toBe(false);
  });
});

describe('computeComponentStatus (mission / board flow)', () => {
  const limits = { hour: 100, flight: 50, day: 0 };

  it('OK below 80%', () => {
    expect(computeComponentStatus(79, 10, 0, limits)).toEqual({ status: 'OK', trigger: [] });
  });
  it('ALERT at exactly 80%', () => {
    const r = computeComponentStatus(80, 0, 0, limits);
    expect(r.status).toBe('ALERT');
    expect(r.trigger).toEqual(['hours approaching (80/100)']);
  });
  it('DUE at exactly 100% and DUE wins over ALERT', () => {
    const r = computeComponentStatus(100, 45, 0, limits);
    expect(r.status).toBe('DUE');
    // once DUE, a later counter at ALERT level adds no trigger text
    expect(r.trigger).toEqual(['hours exceeded (100/100)']);
  });
  it('a limit of 0 means "not configured" and is ignored', () => {
    expect(computeComponentStatus(0, 0, 9999, limits).status).toBe('OK');
  });
});

describe('computeDashboardStatus (dashboard / alert cron)', () => {
  const model = {
    factory_serie: null, factory_model: null,
    maintenance_cycle_hour: 100, maintenance_cycle_flight: 0, maintenance_cycle_day: 30,
  };

  it('uses the percentage threshold passed in', () => {
    expect(computeDashboardStatus(79, 0, 0, model, 80).status).toBe('OK');
    expect(computeDashboardStatus(80, 0, 0, model, 80).status).toBe('ALERT');
    expect(computeDashboardStatus(50, 0, 0, model, 50).status).toBe('ALERT');
  });
  it('fills trigger slots [HOUR, FLIGHT, DAY]', () => {
    const r = computeDashboardStatus(100, 0, 30, model, 80);
    expect(r.status).toBe('DUE');
    expect(r.trigger).toEqual(['HOUR', null, 'DAY']);
  });
  it('DUE is never downgraded to ALERT by a later counter', () => {
    expect(computeDashboardStatus(100, 0, 25, model, 80).status).toBe('DUE');
  });
});

describe('computeMaintenanceDayUpdates', () => {
  const now = new Date('2026-10-13T15:30:00Z');
  const base = { maintenance_cycle_day: 30, current_maintenance_days: 0, installation_date: null };

  it('counts whole UTC days since last maintenance', () => {
    const r = computeMaintenanceDayUpdates(
      [{ ...base, component_id: 1, last_maintenance_date: new Date('2026-10-03T23:00:00Z') }], now);
    expect(r).toEqual([{ id: 1, days: 10 }]);
  });
  it('falls back to installation_date when never maintained', () => {
    const r = computeMaintenanceDayUpdates(
      [{ ...base, component_id: 2, last_maintenance_date: null, installation_date: new Date('2026-10-11T00:00:00Z') }], now);
    expect(r).toEqual([{ id: 2, days: 2 }]);
  });
  it('caps at the limit', () => {
    const r = computeMaintenanceDayUpdates(
      [{ ...base, component_id: 3, last_maintenance_date: new Date('2025-01-01T00:00:00Z') }], now);
    expect(r).toEqual([{ id: 3, days: 30 }]);
  });
  it('skips: already at limit, no reference date, same day, unchanged value', () => {
    const r = computeMaintenanceDayUpdates([
      { ...base, component_id: 4, current_maintenance_days: 30, last_maintenance_date: new Date('2020-01-01') },
      { ...base, component_id: 5, last_maintenance_date: null },
      { ...base, component_id: 6, last_maintenance_date: new Date('2026-10-13T01:00:00Z') },
      { ...base, component_id: 7, current_maintenance_days: 10, last_maintenance_date: new Date('2026-10-03T00:00:00Z') },
    ], now);
    expect(r).toEqual([]);
  });
});

describe('mission usage (mission-maintenance-rules)', () => {
  it('applies battery cycle ratio unless cycles were typed manually', () => {
    const auto = computeMissionUsage({
      prevHours: 0, prevFlights: 10, prevLifetimeHours: 5, meta: { battery_cycle_ratio: 0.5 },
      addHours: 1.3, addFlights: 4,
    });
    expect(auto.effectiveFlightCycles).toBe(2);
    expect(auto.newFlights).toBe(12);

    const manual = computeMissionUsage({
      prevHours: 0, prevFlights: 10, prevLifetimeHours: 5, meta: { battery_cycle_ratio: 0.5 },
      addHours: 1.3, addFlights: 4, manualCyclesInput: true,
    });
    expect(manual.effectiveFlightCycles).toBe(4);
    expect(manual.newFlights).toBe(14);
  });

  it('adds hours in HH.MM and also to lifetime hours', () => {
    const r = computeMissionUsage({
      prevHours: 0.45, prevFlights: 0, prevLifetimeHours: 10.5, meta: {}, addHours: 0.3, addFlights: 0,
    });
    expect(r.newHours).toBeCloseTo(1.15, 5);
    expect(r.newLifetimeHours).toBeCloseTo(11.2, 5); // 10h50m + 0h30m
  });

  it('only writes counters that actually received usage', () => {
    const usage = computeMissionUsage({
      prevHours: 1, prevFlights: 3, prevLifetimeHours: 1, meta: {}, addHours: 0, addFlights: 2,
    });
    const payload = buildMissionComponentPayload(usage, { keep: 'me' }, 99, new Date('2026-10-13T00:00:00Z'));
    expect(payload).not.toHaveProperty('current_maintenance_hours');
    expect(payload.current_maintenance_flights).toBe(5);
    expect(payload.current_usage_hours).toBe(1);
    expect(payload.component_metadata).toMatchObject({ keep: 'me', last_mission_id: 99 });
    expect(usage.finalHours).toBe(1); // untouched counter keeps its old value in the response
  });

  it('evaluateComponent is OK with no limits, and worstStatus orders DUE > ALERT > OK', () => {
    expect(evaluateComponent({ hours: 999, flights: 999, days: 999 }, { hour: 0, flight: 0, day: 0 }).status).toBe('OK');
    expect(worstStatus('OK', 'ALERT')).toBe('ALERT');
    expect(worstStatus('DUE', 'ALERT')).toBe('DUE');
    expect(worstStatus('ALERT', 'DUE')).toBe('DUE');
  });
});
