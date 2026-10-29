import { currentHourKey, relativeAge } from '@/components/operation/btf/btf-utils';
import { readToolLocation } from '@/lib/btf/location';
import { wmoKey } from '@/lib/btf/weather';
import { windowHasStarted, windowStarts } from '@/lib/btf/windows';
import {
  compareWindows,
  GENERIC_LIMITS,
  mergeLimits,
  resolveModelLimits,
  scoreForecast,
  scoreHour,
  summariseWindow,
  type HourWeather,
} from '@/lib/btf/scoring';

const hour = (time: string, over: Partial<HourWeather> = {}): HourWeather => ({
  time,
  windMs: 2,
  gustMs: 3,
  precipMmH: 0,
  precipProb: 0,
  visibilityM: 20000,
  tempC: 18,
  weatherCode: 0,
  cloudCoverPct: 10,
  windDir: 90,
  isDay: true,
  ...over,
});

const T = (h: number, d = '2026-10-12') => `${d}T${String(h).padStart(2, '0')}:00`;

describe('resolveModelLimits', () => {
  it('uses a known default by model name', () => {
    const r = resolveModelLimits('DJI Matrice 350 RTK', null);
    expect(r.source).toBe('default');
    expect(r.limits.maxPrecipMmH).toBeGreaterThan(0);
  });

  it('falls back to generic limits for unknown models', () => {
    const r = resolveModelLimits('Homebuilt X', {});
    expect(r.source).toBe('generic');
    expect(r.limits).toEqual(GENERIC_LIMITS);
  });

  it('lets owner overrides win and fills the rest from defaults', () => {
    const r = resolveModelLimits('DJI Mavic 3', { flight_limits: { maxWindMs: 6, minTempC: -5 } });
    expect(r.source).toBe('custom');
    expect(r.limits.maxWindMs).toBe(6);
    expect(r.limits.minTempC).toBe(-5);
    expect(r.limits.maxGustMs).toBe(12); // from the known-model default
  });

  it('ignores invalid override values', () => {
    const r = resolveModelLimits('Homebuilt X', { flight_limits: { maxWindMs: 'abc', maxGustMs: -3 } });
    expect(r.source).toBe('generic');
  });
});

describe('mergeLimits', () => {
  it('takes the strictest value per metric', () => {
    const a = { ...GENERIC_LIMITS, maxWindMs: 12, maxPrecipMmH: 4, minVisibilityM: 1000 };
    const b = { ...GENERIC_LIMITS, maxWindMs: 8, maxPrecipMmH: 0, minVisibilityM: 2000 };
    const m = mergeLimits([a, b]);
    expect(m.maxWindMs).toBe(8);
    expect(m.maxPrecipMmH).toBe(0);
    expect(m.minVisibilityM).toBe(2000);
  });
});

describe('scoreHour', () => {
  it('scores calm daytime weather as go', () => {
    const s = scoreHour(hour(T(10)), GENERIC_LIMITS);
    expect(s.status).toBe('go');
    expect(s.score).toBeGreaterThan(70);
  });

  it('is no-go when wind exceeds the limit', () => {
    expect(scoreHour(hour(T(10), { windMs: 11 }), GENERIC_LIMITS)).toMatchObject({ status: 'nogo', limiting: 'wind', score: 0 });
  });

  it('is no-go on gusts even if sustained wind is fine', () => {
    expect(scoreHour(hour(T(10), { windMs: 3, gustMs: 14 }), GENERIC_LIMITS)).toMatchObject({ status: 'nogo', limiting: 'gust' });
  });

  it('is marginal close to a limit', () => {
    const s = scoreHour(hour(T(10), { windMs: 8, gustMs: 9 }), GENERIC_LIMITS);
    expect(s.status).toBe('marginal');
  });

  it('grounds a non-waterproof drone in rain but not a rated one', () => {
    const rain = hour(T(10), { precipMmH: 1 });
    expect(scoreHour(rain, { ...GENERIC_LIMITS, maxPrecipMmH: 0 }).status).toBe('nogo');
    expect(scoreHour(rain, { ...GENERIC_LIMITS, maxPrecipMmH: 4 }).status).toBe('go');
  });

  it('never recommends night hours', () => {
    expect(scoreHour(hour(T(2), { isDay: false }), GENERIC_LIMITS)).toMatchObject({ status: 'nogo', limiting: 'night' });
  });

  it('flags poor visibility and extreme cold', () => {
    expect(scoreHour(hour(T(10), { visibilityM: 800 }), GENERIC_LIMITS).status).toBe('nogo');
    expect(scoreHour(hour(T(10), { tempC: -15 }), GENERIC_LIMITS).status).toBe('nogo');
  });

  it('copes with missing visibility and temperature', () => {
    const s = scoreHour(hour(T(10), { visibilityM: null, tempC: null }), GENERIC_LIMITS);
    expect(s.status).toBe('go');
  });
});

describe('summariseWindow', () => {
  it('rolls up wind, gust and rain', () => {
    const hs = [hour(T(10), { windMs: 2, gustMs: 4, precipMmH: 0 }), hour(T(11), { windMs: 4, gustMs: 7, precipMmH: 0.6 })];
    const sum = summariseWindow(hs, scoreForecast(hs, { ...GENERIC_LIMITS, maxPrecipMmH: 4 }));
    expect(sum.avgWindMs).toBeCloseTo(3);
    expect(sum.maxGustMs).toBe(7);
    expect(sum.rainMm).toBeCloseTo(0.6);
    expect(sum.status).toBe('go');
  });

  it('is only as good as its worst hour', () => {
    const hs = [hour(T(10)), hour(T(11), { windMs: 11 })];
    const sum = summariseWindow(hs, scoreForecast(hs, GENERIC_LIMITS));
    expect(sum).toMatchObject({ status: 'nogo', score: 0, limiting: 'wind' });
  });

  it('uses the weakest hour score for a good window', () => {
    const hs = [hour(T(10), { windMs: 1 }), hour(T(11), { windMs: 5 })];
    const scores = scoreForecast(hs, GENERIC_LIMITS);
    const sum = summariseWindow(hs, scores);
    expect(sum.score).toBe(Math.min(scores[0].score, scores[1].score));
  });

  it('marks a window with any night hour as night / no-go', () => {
    const hs = [hour(T(17)), hour(T(18), { isDay: false })];
    const sum = summariseWindow(hs, scoreForecast(hs, GENERIC_LIMITS));
    expect(sum).toMatchObject({ night: true, status: 'nogo', score: 0, limiting: 'night' });
  });

  it('keeps the most severe weather code for the icon', () => {
    const hs = [hour(T(10), { weatherCode: 1 }), hour(T(11), { weatherCode: 63 })];
    expect(summariseWindow(hs, scoreForecast(hs, GENERIC_LIMITS)).weatherCode).toBe(63);
  });

  it('collects visibility, temperature, cloud cover and rain chance for the detail view', () => {
    const hs = [
      hour(T(10), { visibilityM: 18000, tempC: 10, cloudCoverPct: 20, precipProb: 10 }),
      hour(T(11), { visibilityM: 9000, tempC: 14, cloudCoverPct: 60, precipProb: 40 }),
    ];
    const sum = summariseWindow(hs, scoreForecast(hs, GENERIC_LIMITS));
    expect(sum.minVisibilityM).toBe(9000);
    expect(sum.avgTempC).toBe(12);
    expect(sum.avgCloudPct).toBe(40);
    expect(sum.maxPrecipProb).toBe(40);
  });

  it('leaves the detail numbers null when the forecast has none', () => {
    const hs = [hour(T(10), { visibilityM: null, tempC: null, cloudCoverPct: null, precipProb: null })];
    const sum = summariseWindow(hs, scoreForecast(hs, GENERIC_LIMITS));
    expect(sum).toMatchObject({ minVisibilityM: null, avgTempC: null, avgCloudPct: null, maxPrecipProb: null });
  });

  it('handles an empty window', () => {
    expect(summariseWindow([], [])).toMatchObject({ status: 'go', avgWindMs: 0, rainMm: 0 });
  });
});

describe('compareWindows', () => {
  it('ranks status before score', () => {
    const list = [
      { status: 'marginal' as const, score: 90 },
      { status: 'go' as const, score: 60 },
      { status: 'go' as const, score: 80 },
      { status: 'nogo' as const, score: 0 },
    ].sort(compareWindows);
    expect(list.map((w) => w.status + ':' + w.score)).toEqual(['go:80', 'go:60', 'marginal:90', 'nogo:0']);
  });
});

describe('readToolLocation', () => {
  it('reads numeric and string coordinates', () => {
    expect(readToolLocation({ latitude: 52.52, longitude: 13.41, pseudo_name: ' Hangar 3 ' }, 'Berlin')).toEqual({ latitude: 52.52, longitude: 13.41, name: 'Hangar 3' });
    expect(readToolLocation({ latitude: '45.1', longitude: '9.2' }, 'Milan')).toEqual({ latitude: 45.1, longitude: 9.2, name: 'Milan' });
  });

  it('returns null when the system has no usable location', () => {
    expect(readToolLocation(null, 'x')).toBeNull();
    expect(readToolLocation({ latitude: null, longitude: null })).toBeNull();
    expect(readToolLocation({ latitude: '', longitude: '' })).toBeNull();
    expect(readToolLocation({ latitude: 0, longitude: 0 })).toBeNull();
    expect(readToolLocation({ latitude: 95, longitude: 10 })).toBeNull();
    expect(readToolLocation({ latitude: 'abc', longitude: 10 })).toBeNull();
  });

  it('falls back to no name when nothing is set', () => {
    expect(readToolLocation({ latitude: 10, longitude: 20 })?.name).toBeNull();
  });
});

describe('wmoKey', () => {
  it('maps WMO codes to a condition', () => {
    expect([0, 1, 2, 3, 45, 53, 63, 81, 73, 95, null].map(wmoKey)).toEqual([
      'clear', 'mostlyClear', 'partlyCloudy', 'overcast', 'fog', 'drizzle', 'rain', 'rain', 'snow', 'thunderstorm', 'clear',
    ]);
  });
});

describe('windowHasStarted', () => {
  // 11:45 at the site -> now key is the current hour, 11:00
  const now = '2026-10-12T11:00';

  it('a two-hour window that began at 10:00 cannot be recommended at 11:45', () => {
    expect(windowHasStarted('2026-10-12', 10, now)).toBe(true);
  });

  it('a window that starts in the current hour has already started', () => {
    expect(windowHasStarted('2026-10-12', 11, now)).toBe(true);
  });

  it('a later window today and any window tomorrow can still be recommended', () => {
    expect(windowHasStarted('2026-10-12', 12, now)).toBe(false);
    expect(windowHasStarted('2026-10-13', 6, now)).toBe(false);
  });

  it('windows on earlier days have started', () => {
    expect(windowHasStarted('2026-10-11', 18, now)).toBe(true);
  });

  it('treats an unknown clock as nothing started', () => {
    expect(windowHasStarted('2026-10-12', 6, '')).toBe(false);
  });
});

describe('windowStarts', () => {
  const day = (from: number, to: number) =>
    Array.from({ length: 24 }, (_, h) => ({ time: T(h), isDay: h >= from && h <= to }));

  it('covers the daylight hours, aligned to the window length', () => {
    const hs = day(7, 18);
    expect(windowStarts(hs, 2)).toEqual([6, 8, 10, 12, 14, 16, 18]);
    expect(windowStarts(hs, 1)).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(windowStarts(hs, 3)).toEqual([6, 9, 12, 15, 18]);
    expect(windowStarts(hs, 4)).toEqual([4, 8, 12, 16]);
  });

  it('shifts with the viewer timezone (daylight 10:30-22:30 elsewhere)', () => {
    expect(windowStarts(day(10, 22), 2)).toEqual([10, 12, 14, 16, 18, 20, 22]);
  });

  it('never creates a window that runs past midnight', () => {
    expect(windowStarts(day(18, 23), 3)).toEqual([18, 21]);
  });

  it('falls back to 06-22 when there is no daylight', () => {
    expect(windowStarts(day(30, 31), 2)).toEqual([6, 8, 10, 12, 14, 16, 18, 20]);
  });
});

describe('currentHourKey', () => {
  it('reads the hour in the given timezone, dropping the minutes', () => {
    // 06:15 UTC = 11:45 in India (UTC+5:30)
    expect(currentHourKey('Asia/Kolkata', new Date('2026-10-12T06:15:00Z'))).toBe('2026-10-12T11:00');
  });

  it('rolls over at local midnight, never showing hour 24', () => {
    // 18:30 UTC = 00:00 the next day in India
    expect(currentHourKey('Asia/Kolkata', new Date('2026-10-12T18:30:00Z'))).toBe('2026-10-13T00:00');
  });

  it('changes exactly on the local hour boundary', () => {
    expect(currentHourKey('Europe/Berlin', new Date('2026-10-12T09:59:59Z'))).toBe('2026-10-12T11:00'); // 11:59:59 CEST
    expect(currentHourKey('Europe/Berlin', new Date('2026-10-12T10:00:00Z'))).toBe('2026-10-12T12:00'); // 12:00:00 CEST
  });

  it('returns an empty key for an invalid timezone', () => {
    expect(currentHourKey('Not/AZone', new Date('2026-10-12T10:00:00Z'))).toBe('');
  });
});

describe('relativeAge', () => {
  it('describes how old the forecast is', () => {
    expect(relativeAge(0)).toEqual({ key: 'justNow', count: 0 });
    expect(relativeAge(59_000)).toEqual({ key: 'justNow', count: 0 });
    expect(relativeAge(60_000)).toEqual({ key: 'minAgo', count: 1 });
    expect(relativeAge(5 * 60_000 + 20_000)).toEqual({ key: 'minAgo', count: 5 });
    expect(relativeAge(59 * 60_000)).toEqual({ key: 'minAgo', count: 59 });
    expect(relativeAge(60 * 60_000)).toEqual({ key: 'hourAgo', count: 1 });
    expect(relativeAge(23 * 3_600_000)).toEqual({ key: 'hourAgo', count: 23 });
    expect(relativeAge(24 * 3_600_000)).toEqual({ key: 'dayAgo', count: 1 });
  });

  it('never goes negative if the clocks disagree slightly', () => {
    expect(relativeAge(-5_000)).toEqual({ key: 'justNow', count: 0 });
  });
});
