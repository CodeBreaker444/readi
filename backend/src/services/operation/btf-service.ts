import { resolveModelLimits, GENERIC_LIMITS, type FlightLimits, type HourWeather } from '@/lib/btf/scoring';
import type { BtfDrone, BtfForecast } from '@/lib/btf/types';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

 
export async function getBtfFleet(ownerId: number): Promise<BtfDrone[]> {
  const allComponents = await prisma.tool_component.findMany({
    where: {
      component_active: 'Y',
      component_type: { equals: 'DRONE', mode: 'insensitive' },
      OR: [{ serial_number: { not: null } }, { dcc_drone_id: { not: null } }],
      tool: { fk_owner_id: ownerId, tool_active: 'Y' },
    },
    select: {
      component_id: true,
      fk_tool_id: true,
      component_name: true,
      serial_number: true,
      component_metadata: true,
      tool: { select: { tool_code: true, tool_name: true, fk_model_id: true, tool_metadata: true } },
    },
    orderBy: { component_id: 'asc' },
  });

  // Skip the synthetic Warehouse system (unassigned components) and deleted systems.
  const components = allComponents.filter((c) => {
    const meta = c.tool.tool_metadata as { is_warehouse?: boolean; deleted?: boolean } | null;
    return meta?.is_warehouse !== true && meta?.deleted !== true;
  });

  const modelIdOf = (c: (typeof components)[number]): number | null => {
    const raw = (c.component_metadata as Record<string, unknown> | null)?.fk_tool_model_id ?? c.tool.fk_model_id;
    const id = Number(raw);
    return raw && Number.isInteger(id) && id > 0 ? id : null;
  };

  const modelIds = [...new Set(components.map(modelIdOf).filter((id): id is number => id !== null))];
  const models = modelIds.length
    ? await prisma.tool_model.findMany({
        where: { model_id: { in: modelIds } },
        select: { model_id: true, model_name: true, manufacturer: true, specifications: true, model_active: true },
      })
    : [];
  const modelById = new Map(models.filter((m) => m.model_active !== 'N').map((m) => [m.model_id, m]));

  const drones = components.map<BtfDrone>((c) => {
    const model = modelById.get(modelIdOf(c) ?? -1);
    const resolved = model
      ? resolveModelLimits(`${model.manufacturer ?? ''} ${model.model_name}`.trim(), model.specifications as Record<string, unknown> | null)
      : { limits: { ...GENERIC_LIMITS }, source: 'generic' as const };
    return {
      componentId: c.component_id,
      toolId: c.fk_tool_id,
      systemCode: c.tool.tool_code ?? `#${c.fk_tool_id}`,
      systemName: c.tool.tool_name,
      droneName: c.component_name,
      serialNumber: c.serial_number,
      modelId: model?.model_id ?? null,
      modelName: model?.model_name ?? null,
      manufacturer: model?.manufacturer ?? null,
      limits: resolved.limits,
      limitsSource: resolved.source,
    };
  });

  return drones.sort((a, b) => a.systemCode.localeCompare(b.systemCode, undefined, { numeric: true }));
}

/** Saves owner-defined flight limits on a drone model the owner flies. Returns false if not theirs. */
export async function saveModelFlightLimits(ownerId: number, modelId: number, limits: FlightLimits): Promise<boolean> {
  const model = await prisma.tool_model.findUnique({ where: { model_id: modelId }, select: { specifications: true } });
  if (!model) return false;

  // Models are owner-scoped through specifications.fk_owner_id; otherwise the owner must
  // fly it (a drone component on one of their systems uses it).
  const specs = (model.specifications as Record<string, unknown> | null) ?? {};
  if (specs.fk_owner_id !== ownerId) {
    const fleet = await getBtfFleet(ownerId);
    if (!fleet.some((d) => d.modelId === modelId)) return false;
  }

  await prisma.tool_model.update({
    where: { model_id: modelId },
    data: { specifications: { ...specs, flight_limits: { ...limits } } as unknown as Prisma.InputJsonValue },
  });
  return true;
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
    precipitation: (number | null)[];
    precipitation_probability: (number | null)[];
    weather_code: (number | null)[];
    visibility: (number | null)[];
    wind_speed_10m: (number | null)[];
    wind_direction_10m: (number | null)[];
    wind_gusts_10m: (number | null)[];
    is_day: (number | null)[];
  };
}

export async function fetchBtfForecast(lat: number, lon: number, days: number): Promise<BtfForecast | null> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('longitude', lon.toFixed(4));
  url.searchParams.set(
    'hourly',
    'temperature_2m,precipitation,precipitation_probability,weather_code,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day',
  );
  url.searchParams.set('wind_speed_unit', 'ms');
  url.searchParams.set('forecast_days', String(days));
  url.searchParams.set('timezone', 'auto');

  const res = await fetch(url.toString(), { next: { revalidate: 900 }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;

  const d = (await res.json()) as OpenMeteoResponse;
  const h = d.hourly;
  const hours: HourWeather[] = h.time.map((time, i) => ({
    time,
    windMs: h.wind_speed_10m[i] ?? 0,
    gustMs: h.wind_gusts_10m[i] ?? h.wind_speed_10m[i] ?? 0,
    precipMmH: h.precipitation[i] ?? 0,
    precipProb: h.precipitation_probability[i],
    visibilityM: h.visibility[i],
    tempC: h.temperature_2m[i],
    weatherCode: h.weather_code[i],
    windDir: h.wind_direction_10m[i],
    isDay: h.is_day[i] === 1,
  }));

  return { latitude: d.latitude, longitude: d.longitude, timezone: d.timezone, hours };
}
