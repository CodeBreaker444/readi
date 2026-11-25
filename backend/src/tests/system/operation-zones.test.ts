import {
  checkPointAgainstZones,
  decimate,
  MAX_TOTAL_POINTS,
  distanceToLineMeters,
  OperationZones,
  operationZonesSchema,
  pointInPolygon,
  readOperationZones,
} from '@/lib/operation-zones';

const square = (lat: number, lng: number, d: number): [number, number][] => [
  [lat - d, lng - d], [lat - d, lng + d], [lat + d, lng + d], [lat + d, lng - d],
];

const zones: OperationZones = {
  perimeter: { name: 'Site', points: square(45, 9, 0.05) },
  zones: [
    { id: 'g', name: 'Runway', kind: 'green', shape: 'polygon', points: square(45, 9, 0.02) },
    { id: 'r', name: 'Substation', kind: 'red', shape: 'polygon', points: square(45.03, 9, 0.005) },
    { id: 'u', name: 'Quarry', kind: 'unsurveyed', shape: 'polygon', points: square(44.97, 9, 0.005) },
    { id: 'l', name: 'Power line', kind: 'red', shape: 'line', points: [[44.99, 8.95], [44.99, 9.05]] },
  ],
};

describe('operation zones geometry', () => {
  it('detects points in a polygon', () => {
    expect(pointInPolygon(45, 9, square(45, 9, 0.01))).toBe(true);
    expect(pointInPolygon(46, 9, square(45, 9, 0.01))).toBe(false);
  });

  it('measures distance to a line in metres', () => {
    // ~0.0001 deg of latitude is ~11 m
    const d = distanceToLineMeters(44.9901, 9, [[44.99, 8.95], [44.99, 9.05]]);
    expect(d).toBeGreaterThan(8);
    expect(d).toBeLessThan(14);
  });

  it('is clear inside a green zone', () => {
    expect(checkPointAgainstZones(45, 9, zones)).toEqual({ clear: true, warnings: [] });
  });

  it('flags a red polygon as danger', () => {
    const r = checkPointAgainstZones(45.03, 9, zones);
    expect(r.warnings.map((w) => w.type)).toContain('red');
    expect(r.warnings.find((w) => w.type === 'red')?.severity).toBe('danger');
  });

  it('flags a point near a red line, not far from it', () => {
    expect(checkPointAgainstZones(44.99005, 9, zones).warnings.some((w) => w.type === 'red')).toBe(true);
    expect(checkPointAgainstZones(44.9905, 9, zones).warnings.some((w) => w.type === 'red')).toBe(false);
  });

  it('warns on unsurveyed zones and outside the perimeter', () => {
    expect(checkPointAgainstZones(44.97, 9, zones).warnings.some((w) => w.type === 'unsurveyed')).toBe(true);
    expect(checkPointAgainstZones(46, 9, zones).warnings.some((w) => w.type === 'outside_perimeter')).toBe(true);
  });

  it('warns when inside the perimeter but outside every green zone', () => {
    expect(checkPointAgainstZones(45.04, 9.04, zones).warnings.map((w) => w.type)).toEqual(['not_in_green']);
  });

  it('does not warn about green coverage when no green zones exist', () => {
    const only: OperationZones = { zones: [], perimeter: zones.perimeter };
    expect(checkPointAgainstZones(45, 9, only).clear).toBe(true);
  });
});

describe('operation zones validation', () => {
  it('accepts valid data and rejects bad coordinates / short polygons', () => {
    expect(operationZonesSchema.safeParse(zones).success).toBe(true);
    expect(operationZonesSchema.safeParse({ zones: [], perimeter: null }).success).toBe(true);
    expect(operationZonesSchema.safeParse({ zones: [{ id: 'a', name: 'x', kind: 'red', shape: 'polygon', points: [[1, 1], [2, 2]] }], perimeter: null }).success).toBe(false);
    expect(operationZonesSchema.safeParse({ zones: [{ id: 'a', name: 'x', kind: 'red', shape: 'line', points: [[100, 1], [2, 2]] }], perimeter: null }).success).toBe(false);
  });

  it('readOperationZones keeps the valid zones when one is broken', () => {
    const raw = { zones: [zones.zones[0], { id: 'bad', name: 'x', kind: 'red', shape: 'polygon', points: [[1, 1]] }, zones.zones[1]], perimeter: { name: 'p', points: [[1, 1]] } };
    const out = readOperationZones({ operationZones: raw });
    expect(out.zones.map((z) => z.id)).toEqual(['g', 'r']);
    expect(out.perimeter).toBeNull();
  });

  it('readOperationZones tolerates missing or malformed metadata', () => {
    expect(readOperationZones(null)).toEqual({ zones: [], perimeter: null });
    expect(readOperationZones({ operationZones: 'junk' })).toEqual({ zones: [], perimeter: null });
    expect(readOperationZones({ operationZones: zones }).zones).toHaveLength(4);
  });
});

describe('operation zones limits', () => {
  it('decimate keeps first/last and caps the length', () => {
    const pts = Array.from({ length: 12000 }, (_, i) => i);
    const out = decimate(pts, 5000);
    expect(out).toHaveLength(5000);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(11999);
    expect(decimate([1, 2, 3], 5000)).toEqual([1, 2, 3]);
  });

  it('rejects more than the total point budget across zones', () => {
    const line = (): any => ({ id: 'x', name: 'l', kind: 'red', shape: 'line', points: Array.from({ length: 5000 }, (_, i) => [45 + i * 1e-6, 9]) });
    const n = Math.ceil(MAX_TOTAL_POINTS / 5000) + 1;
    const big = { zones: Array.from({ length: n }, line), perimeter: null };
    expect(operationZonesSchema.safeParse(big).success).toBe(false);
  });
});
