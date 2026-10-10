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
