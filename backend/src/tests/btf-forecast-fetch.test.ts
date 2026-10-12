import { fetchBtfForecast } from '@/backend/services/operation/btf-service';

jest.mock('@/lib/prisma', () => ({ prisma: {} }));

const HOURS = 24;
const arr = (v: number | null) => Array.from({ length: HOURS }, () => v);

const upstreamBody = (tz = 'Europe/Berlin') => ({
  latitude: 52.5,
  longitude: 13.4,
  timezone: tz,
  hourly: {
    time: Array.from({ length: HOURS }, (_, h) => `2026-10-12T${String(h).padStart(2, '0')}:00`),
    temperature_2m: arr(15),
    precipitation: arr(0),
    precipitation_probability: arr(0),
    weather_code: arr(0),
    cloud_cover: arr(20),
    visibility: arr(20000),
    wind_speed_10m: arr(3),
    wind_direction_10m: arr(90),
    wind_gusts_10m: arr(5),
    is_day: Array.from({ length: HOURS }, (_, h) => (h >= 7 && h <= 18 ? 1 : 0)),
  },
});

const okResponse = (body: unknown = upstreamBody()) => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
const statusResponse = (status: number) => ({ ok: false, status, json: async () => ({}) }) as unknown as Response;
const timeout = () => Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });

let fetchMock: jest.Mock;
let warn: jest.SpyInstance;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fetchBtfForecast resilience', () => {
  it('maps the upstream response into hourly weather', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const f = await fetchBtfForecast(10.01, 10.01, 7, 'Europe/Berlin');
    expect(f?.hours).toHaveLength(HOURS);
    expect(f?.hours[12]).toMatchObject({ windMs: 3, gustMs: 5, cloudCoverPct: 20, isDay: true });
    expect(f?.hours[2].isDay).toBe(false);
  });

  it('asks Open-Meteo for the requested timezone, and falls back to auto for an unknown one', async () => {
    fetchMock.mockResolvedValue(okResponse());
    await fetchBtfForecast(11.01, 11.01, 7, 'Asia/Kolkata');
    expect(String(fetchMock.mock.calls[0][0])).toContain('timezone=Asia%2FKolkata');
    await fetchBtfForecast(11.02, 11.02, 7, 'Not/AZone');
    expect(String(fetchMock.mock.calls[1][0])).toContain('timezone=auto');
  });

  it('retries once after a timeout and then succeeds', async () => {
    fetchMock.mockRejectedValueOnce(timeout()).mockResolvedValueOnce(okResponse());
    const f = await fetchBtfForecast(12.01, 12.01, 7, 'Europe/Berlin');
    expect(f).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on a 5xx but not on a client error', async () => {
    fetchMock.mockResolvedValueOnce(statusResponse(503)).mockResolvedValueOnce(okResponse());
    expect(await fetchBtfForecast(13.01, 13.01, 7, 'Europe/Berlin')).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce(statusResponse(400));
    expect(await fetchBtfForecast(13.02, 13.02, 7, 'Europe/Berlin')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null, not an exception, when both attempts time out', async () => {
    fetchMock.mockRejectedValue(timeout());
    await expect(fetchBtfForecast(14.01, 14.01, 7, 'Europe/Berlin')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalled();
  });

  it('shares one upstream call between concurrent identical requests', async () => {
    let release: (r: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (release = resolve)));
    const a = fetchBtfForecast(15.01, 15.01, 7, 'Europe/Berlin');
    const b = fetchBtfForecast(15.01, 15.01, 7, 'Europe/Berlin');
    release(okResponse());
    const [fa, fb] = await Promise.all([a, b]);
    expect(fa).toBe(fb);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves a fresh result from memory without calling upstream again', async () => {
    fetchMock.mockResolvedValue(okResponse());
    await fetchBtfForecast(16.01, 16.01, 7, 'Europe/Berlin');
    await fetchBtfForecast(16.01, 16.01, 7, 'Europe/Berlin');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not reuse the forecast of a nearby but different point', async () => {
    fetchMock.mockResolvedValue(okResponse());
    await fetchBtfForecast(17.0101, 17.0101, 7, 'Europe/Berlin');
    await fetchBtfForecast(17.0149, 17.0149, 7, 'Europe/Berlin');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('latitude=17.0149');
  });

  it('reuses the forecast for exactly the same point', async () => {
    fetchMock.mockResolvedValue(okResponse());
    await fetchBtfForecast(17.5, 17.5, 7, 'Europe/Berlin');
    await fetchBtfForecast(17.5, 17.5, 7, 'Europe/Berlin');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stamps when the data was retrieved and keeps that time for cached copies', async () => {
    const t0 = 1_800_000_000_000;
    const now = jest.spyOn(Date, 'now').mockReturnValue(t0);
    fetchMock.mockResolvedValue(okResponse());
    const first = await fetchBtfForecast(17.7, 17.7, 7, 'Europe/Berlin');
    expect(first?.retrievedAt).toBe(t0);

    now.mockReturnValue(t0 + 5 * 60_000);
    const again = await fetchBtfForecast(17.7, 17.7, 7, 'Europe/Berlin');
    expect(again?.retrievedAt).toBe(t0); // served from memory: still "retrieved" 5 minutes ago
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keys the cache by timezone', async () => {
    fetchMock.mockResolvedValue(okResponse());
    await fetchBtfForecast(18.01, 18.01, 7, 'Europe/Berlin');
    await fetchBtfForecast(18.01, 18.01, 7, 'Asia/Kolkata');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('serves the last good forecast when the upstream fails later, but not once it is too old', async () => {
    const t0 = 1_800_000_000_000;
    const now = jest.spyOn(Date, 'now').mockReturnValue(t0);
    fetchMock.mockResolvedValueOnce(okResponse());
    const first = await fetchBtfForecast(19.01, 19.01, 7, 'Europe/Berlin');

    // 30 minutes later the cache is no longer fresh and Open-Meteo is down: the older forecast is served
    now.mockReturnValue(t0 + 30 * 60_000);
    fetchMock.mockRejectedValue(timeout());
    expect(await fetchBtfForecast(19.01, 19.01, 7, 'Europe/Berlin')).toBe(first);

    // 7 hours later it is too old to trust
    now.mockReturnValue(t0 + 7 * 60 * 60_000);
    expect(await fetchBtfForecast(19.01, 19.01, 7, 'Europe/Berlin')).toBeNull();
  });

  it('retries upstream after a failure instead of caching the failure', async () => {
    fetchMock.mockRejectedValue(timeout());
    expect(await fetchBtfForecast(20.01, 20.01, 7, 'Europe/Berlin')).toBeNull();

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(okResponse());
    expect(await fetchBtfForecast(20.01, 20.01, 7, 'Europe/Berlin')).not.toBeNull();
  });
});
