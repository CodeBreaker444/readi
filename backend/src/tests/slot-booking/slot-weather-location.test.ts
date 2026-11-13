/**
 * Slot weather follows the system chosen for each slot group. Prisma and the forecast cache are mocked.
 *
 * Run:  npm test -- slot-weather-location
 */

const prismaMock = {
  slot_group: { findMany: jest.fn() },
  tool: { findMany: jest.fn() },
};
jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
const getCachedForecast = jest.fn();
jest.mock('@/backend/services/weather/forecast-cache', () => ({ getCachedForecast: (...a: unknown[]) => getCachedForecast(...a) }));
jest.mock('../../services/weather/forecast-cache', () => ({ getCachedForecast: (...a: unknown[]) => getCachedForecast(...a) }));

import { getWeatherForSlots } from '@/backend/services/slot-booking/slot-weather-service';
import { addDaysIso, todayIso } from '@/lib/slot-booking-utils';

const date = addDaysIso(todayIso(), 1);
const slot = (id: number, groupId: number) => ({ id, groupId, date, start: '06:00', end: '14:00' });
const hours = Array.from({ length: 24 }, (_, h) => ({
  time: `${date}T${String(h).padStart(2, '0')}:00`,
  tempC: 15,
  windMs: 2,
  gustMs: 3,
  rainMm: 0,
  precipProb: 0,
  weatherCode: 0,
  isDay: true,
  cloudPct: 0,
  visibilityM: 10000,
}));

beforeEach(() => {
  jest.resetAllMocks();
  getCachedForecast.mockResolvedValue({ hours, retrievedAt: Date.now() });
});

describe('getWeatherForSlots', () => {
  it('has no location when no slot group has a system', async () => {
    prismaMock.slot_group.findMany.mockResolvedValue([]);
    const r = await getWeatherForSlots(7, [slot(1, 3)]);
    expect(r).toEqual({ weather: {}, note: 'no_location' });
    expect(getCachedForecast).not.toHaveBeenCalled();
  });

  it('has no location when the system has no coordinates', async () => {
    prismaMock.slot_group.findMany.mockResolvedValue([{ slot_group_id: 3, fk_tool_id: 9 }]);
    prismaMock.tool.findMany.mockResolvedValue([{ tool_id: 9, tool_metadata: {}, location: 'Hangar' }]);
    expect((await getWeatherForSlots(7, [slot(1, 3)])).note).toBe('no_location');
  });

  it('falls back to the primary drone, then the first drone with a location', async () => {
    prismaMock.slot_group.findMany.mockResolvedValue([
      { slot_group_id: 3, fk_tool_id: 9 },
      { slot_group_id: 4, fk_tool_id: 10 },
      { slot_group_id: 5, fk_tool_id: 11 },
    ]);
    prismaMock.tool.findMany.mockResolvedValue([
      { tool_id: 9, tool_metadata: {}, location: null, tool_component: [
        { component_id: 1, component_metadata: { latitude: 10, longitude: 10 } },
        { component_id: 2, component_metadata: { latitude: 41.9, longitude: 12.5, is_primary: true } },
      ] },
      { tool_id: 10, tool_metadata: {}, location: null, tool_component: [
        { component_id: 4, component_metadata: {} },
        { component_id: 6, component_metadata: { latitude: 20, longitude: 20 } },
        { component_id: 5, component_metadata: { latitude: 45.4, longitude: 9.2 } },
      ] },
      { tool_id: 11, tool_metadata: { latitude: 1.5, longitude: 2.5 }, location: null, tool_component: [{ component_id: 1, component_metadata: { latitude: 9, longitude: 9, is_primary: true } }] },
    ]);
    await getWeatherForSlots(7, [slot(1, 3), slot(2, 4), slot(3, 5)]);
    expect(getCachedForecast).toHaveBeenCalledWith(41.9, 12.5); // primary drone beats the lower id
    expect(getCachedForecast).toHaveBeenCalledWith(45.4, 9.2); // no primary: lowest id with a location
    expect(getCachedForecast).toHaveBeenCalledWith(1.5, 2.5); // the system's own location wins
    expect(getCachedForecast).toHaveBeenCalledTimes(3);
  });

  it('forecasts each group at its own system and skips groups without one', async () => {
    prismaMock.slot_group.findMany.mockResolvedValue([
      { slot_group_id: 3, fk_tool_id: 9 },
      { slot_group_id: 4, fk_tool_id: 10 },
    ]);
    prismaMock.tool.findMany.mockResolvedValue([
      { tool_id: 9, tool_metadata: { latitude: 41.9, longitude: 12.5 }, location: null },
      { tool_id: 10, tool_metadata: { latitude: 45.4, longitude: 9.2 }, location: null },
    ]);
    const r = await getWeatherForSlots(7, [slot(1, 3), slot(2, 4), slot(3, 5)]);
    expect(getCachedForecast).toHaveBeenCalledTimes(2);
    expect(getCachedForecast).toHaveBeenCalledWith(41.9, 12.5);
    expect(getCachedForecast).toHaveBeenCalledWith(45.4, 9.2);
    expect(Object.keys(r.weather).sort()).toEqual(['1', '2']);
    expect(r.note).toBeNull();
  });

  it('reports unavailable when the forecast cannot be fetched', async () => {
    prismaMock.slot_group.findMany.mockResolvedValue([{ slot_group_id: 3, fk_tool_id: 9 }]);
    prismaMock.tool.findMany.mockResolvedValue([{ tool_id: 9, tool_metadata: { latitude: 41.9, longitude: 12.5 }, location: null }]);
    getCachedForecast.mockResolvedValue(null);
    expect((await getWeatherForSlots(7, [slot(1, 3)])).note).toBe('unavailable');
  });
});
