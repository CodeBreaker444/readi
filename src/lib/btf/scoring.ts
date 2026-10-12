/**
Calculates the best time slots for flying based on drone limits.
Uses the strictest limits across selected drones and identifies safe,
marginal, and unsafe time slots efficiently.
*/

export type BtfStatus = 'go' | 'marginal' | 'nogo';

export interface FlightLimits {
  /** Sustained 10 m wind, m/s */
  maxWindMs: number;
  /** Gusts, m/s */
  maxGustMs: number;
  /** Rain the airframe tolerates, mm/h. 0 = not water resistant. */
  maxPrecipMmH: number;
  /** Minimum visibility, metres (VLOS) */
  minVisibilityM: number;
  minTempC: number;
  maxTempC: number;
}

export interface HourWeather {
  /** Local ISO time without offset, e.g. 2026-10-10T14:00 */
  time: string;
  windMs: number;
  gustMs: number;
  precipMmH: number;
  precipProb: number | null;
  visibilityM: number | null;
  tempC: number | null;
  weatherCode: number | null;
  windDir: number | null;
  isDay: boolean;
}

export type LimitingFactor = 'wind' | 'gust' | 'rain' | 'visibility' | 'temperature' | 'night';

export interface HourScore {
  time: string;
  /** 0-100 */
  score: number;
  status: BtfStatus;
  /** What is holding the score back (null when everything is comfortable) */
  limiting: LimitingFactor | null;
}

export interface BestSlot {
  start: string;
  end: string;
  hours: number;
  minScore: number;
  avgScore: number;
  status: BtfStatus;
}

export const MARGINAL_BELOW = 0.25;

/** Fallbacks used when a model has no limits and no known default. */
export const GENERIC_LIMITS: FlightLimits = {
  maxWindMs: 10,
  maxGustMs: 12,
  maxPrecipMmH: 0,
  minVisibilityM: 1500,
  minTempC: -10,
  maxTempC: 40,
};

/**
 * Manufacturer defaults, matched on the model name. Conservative operational
 * values (below the spec-sheet maximum) - owners can override per model.
 */
const KNOWN_MODELS: Array<{ match: RegExp; limits: Partial<FlightLimits> }> = [
  { match: /matrice\s*350|\bm350\b/i, limits: { maxWindMs: 12, maxGustMs: 15, maxPrecipMmH: 4, minTempC: -20, maxTempC: 50 } },
  { match: /matrice\s*300|\bm300\b/i, limits: { maxWindMs: 12, maxGustMs: 15, maxPrecipMmH: 4, minTempC: -20, maxTempC: 50 } },
  { match: /matrice\s*30\b|\bm30t?\b/i, limits: { maxWindMs: 12, maxGustMs: 15, maxPrecipMmH: 4, minTempC: -20, maxTempC: 50 } },
  { match: /matrice\s*4|\bm4t?\b/i, limits: { maxWindMs: 12, maxGustMs: 14, maxPrecipMmH: 2, minTempC: -20, maxTempC: 50 } },
  { match: /mavic\s*3|air\s*3/i, limits: { maxWindMs: 10, maxGustMs: 12, maxPrecipMmH: 0 } },
  { match: /mini\s*[34]/i, limits: { maxWindMs: 8, maxGustMs: 10, maxPrecipMmH: 0 } },
  { match: /phantom\s*4/i, limits: { maxWindMs: 9, maxGustMs: 11, maxPrecipMmH: 0 } },
  { match: /inspire\s*[23]/i, limits: { maxWindMs: 10, maxGustMs: 12, maxPrecipMmH: 0 } },
  { match: /\bdock\b/i, limits: { maxWindMs: 12, maxGustMs: 14, maxPrecipMmH: 4 } },
];

export type LimitsSource = 'custom' | 'default' | 'generic';

const LIMIT_KEYS = Object.keys(GENERIC_LIMITS) as Array<keyof FlightLimits>;

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolves a model's limits: owner-defined `specifications.flight_limits` win,
 * then the known-model table, then generic values. Partial overrides are filled
 * field by field from the next layer.
 */
export function resolveModelLimits(
  modelName: string,
  specs: Record<string, unknown> | null | undefined,
): { limits: FlightLimits; source: LimitsSource } {
  const custom = (specs?.flight_limits ?? null) as Record<string, unknown> | null;
  const known = KNOWN_MODELS.find((m) => m.match.test(modelName))?.limits;

  const limits = { ...GENERIC_LIMITS, ...(known ?? {}) };
  let hasCustom = false;
  if (custom) {
    for (const k of LIMIT_KEYS) {
      const v = num(custom[k]);
      const allowNegative = k === 'minTempC' || k === 'maxTempC';
      if (v !== null && (allowNegative || v >= 0)) {
        limits[k] = v;
        hasCustom = true;
      }
    }
  }
  return { limits, source: hasCustom ? 'custom' : known ? 'default' : 'generic' };
}

/** Strictest value per metric: a slot is only good if every selected model can fly it. */
export function mergeLimits(all: FlightLimits[]): FlightLimits {
  if (all.length === 0) return { ...GENERIC_LIMITS };
  return all.reduce((a, b) => ({
    maxWindMs: Math.min(a.maxWindMs, b.maxWindMs),
    maxGustMs: Math.min(a.maxGustMs, b.maxGustMs),
    maxPrecipMmH: Math.min(a.maxPrecipMmH, b.maxPrecipMmH),
    minVisibilityM: Math.max(a.minVisibilityM, b.minVisibilityM),
    minTempC: Math.max(a.minTempC, b.minTempC),
    maxTempC: Math.min(a.maxTempC, b.maxTempC),
  }));
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Share of the limit still unused: 1 at zero load, 0 at the limit. */
const loadMargin = (value: number, limit: number) => (limit <= 0 ? (value > 0 ? 0 : 1) : clamp01(1 - value / limit));

/** Rain below this is drizzle noise for a non-waterproof drone (mm/h). */
const RAIN_TRACE_MMH = 0.1;

export function scoreHour(h: HourWeather, limits: FlightLimits): HourScore {
  // Night flights follow a different rule set - never auto-recommend them.
  if (!h.isDay) return { time: h.time, score: 0, status: 'nogo', limiting: 'night' };

  const margins: Array<[LimitingFactor, number]> = [
    ['wind', loadMargin(h.windMs, limits.maxWindMs)],
    ['gust', loadMargin(h.gustMs, limits.maxGustMs)],
  ];

  // Rain: non-waterproof drones (limit 0) tolerate only a trace; rated ones scale with intensity.
  margins.push([
    'rain',
    limits.maxPrecipMmH <= 0
      ? h.precipMmH >= RAIN_TRACE_MMH ? 0 : 1 - h.precipMmH / RAIN_TRACE_MMH * 0.5
      : loadMargin(h.precipMmH, limits.maxPrecipMmH),
  ]);

  if (h.visibilityM !== null) {
    // Margin grows as visibility rises from the minimum to 3x the minimum.
    margins.push(['visibility', clamp01((h.visibilityM - limits.minVisibilityM) / (limits.minVisibilityM * 2))]);
  }

  if (h.tempC !== null) {
    const span = (limits.maxTempC - limits.minTempC) / 2 || 1;
    const edge = Math.min(h.tempC - limits.minTempC, limits.maxTempC - h.tempC);
    // Only the outer 25% of the temperature range counts as load; the middle is neutral.
    margins.push(['temperature', clamp01(edge / (span * 0.5))]);
  }

  let worst = margins[0];
  let sum = 0;
  for (const m of margins) {
    sum += m[1];
    if (m[1] < worst[1]) worst = m;
  }

  // Weakest link dominates; the average only separates equally-limited hours.
  const blended = worst[1] * 0.75 + (sum / margins.length) * 0.25;
  const status: BtfStatus = worst[1] <= 0 ? 'nogo' : worst[1] < MARGINAL_BELOW ? 'marginal' : 'go';

  return {
    time: h.time,
    score: status === 'nogo' ? 0 : Math.max(1, Math.round(blended * 100)),
    status,
    limiting: worst[1] < 0.6 ? worst[0] : null,
  };
}

export function scoreForecast(hours: HourWeather[], limits: FlightLimits): HourScore[] {
  return hours.map((h) => scoreHour(h, limits));
}

const STATUS_RANK: Record<BtfStatus, number> = { nogo: 0, marginal: 1, go: 2 };
const RANK_STATUS: BtfStatus[] = ['nogo', 'marginal', 'go'];

/** One calendar cell: several consecutive hours rolled up into a single verdict. */
export interface WindowSummary {
  status: BtfStatus;
  /** 0-100; the weakest hour decides. 0 for no-go and night. */
  score: number;
  /** True if any hour is outside daylight - the window is never recommended. */
  night: boolean;
  limiting: LimitingFactor | null;
  avgWindMs: number;
  maxGustMs: number;
  rainMm: number;
  /** Most severe WMO weather code in the window (for the icon) */
  weatherCode: number;
}

/**
 * Rolls hours up into one window in a single pass. A window is only as good as its
 * worst hour, so a single exceeded limit or a night hour makes the whole window no-go.
 */
export function summariseWindow(hours: HourWeather[], scores: HourScore[]): WindowSummary {
  let night = false;
  let worstRank = 2;
  let minScore = 100;
  let minIdx = 0;
  let wind = 0;
  let gust = 0;
  let rain = 0;
  let code = 0;

  for (let i = 0; i < hours.length; i++) {
    const s = scores[i];
    if (s.limiting === 'night') night = true;
    const rank = STATUS_RANK[s.status];
    if (rank < worstRank) worstRank = rank;
    if (s.score < minScore) {
      minScore = s.score;
      minIdx = i;
    }
    wind += hours[i].windMs;
    if (hours[i].gustMs > gust) gust = hours[i].gustMs;
    rain += hours[i].precipMmH;
    if ((hours[i].weatherCode ?? 0) > code) code = hours[i].weatherCode ?? 0;
  }

  const status = night ? 'nogo' : RANK_STATUS[worstRank];
  return {
    status,
    score: status === 'nogo' ? 0 : minScore,
    night,
    limiting: night ? 'night' : (scores[minIdx]?.limiting ?? null),
    avgWindMs: hours.length ? wind / hours.length : 0,
    maxGustMs: gust,
    rainMm: rain,
    weatherCode: code,
  };
}

/** Sort comparator: negative when `a` is the better window (status first, then score). */
export function compareWindows(a: Pick<WindowSummary, 'status' | 'score'>, b: Pick<WindowSummary, 'status' | 'score'>): number {
  return STATUS_RANK[b.status] - STATUS_RANK[a.status] || b.score - a.score;
}
