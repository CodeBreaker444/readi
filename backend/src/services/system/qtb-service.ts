import { localDayBoundaryToUtc } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

const MAX_MISSIONS = 5000;
const PAGE_SIZE = 10;

export interface QtbMissionRow {
  pilot_mission_id: number;
  mission_code: string | null;
  actual_start: string | null;
  actual_end: string | null;
  flight_duration: number | null;
  distance_flown: number | null;
  location: string | null;
  notes: string | null;
  pilot_name: string | null;
  weather_temperature: number | null;
  battery_serial_number: string | null;
}

export interface QtbPage {
  pageNumber: number;
  pastFlightMinutes: number;
  pastFlightCount: number;
  todayFlightMinutes: number;
  todayFlightCount: number;
  totalFlightMinutes: number;
  totalFlightCount: number;
  missions: QtbMissionRow[];
}

export interface QtbReportData {
  tool: { tool_id: number; tool_code: string | null; tool_desc: string | null; model_name: string | null };
  drone: { component_id: number; component_code: string | null; serial_number: string | null; uas_serial_number: string | null; gcs_serial_number: string | null; component_name: string | null } | null;
  range: { startDate: string; endDate: string; timezone: string };
  pastFlightMinutes: number;
  pastFlightCount: number;
  totalCount: number;
  pages: QtbPage[];
}

export interface QtbReportResult {
  code: number;
  message?: string;
  count?: number;
  data?: QtbReportData;
}

export async function generateQtbReportData(
  droneComponentId: number,
  ownerId: number,
  startDate: string,
  endDate: string,
  timezone: string,
): Promise<QtbReportResult> {
  const droneComponent = await prisma.tool_component.findFirst({
    where: { component_id: droneComponentId, component_type: 'DRONE' },
    select: {
      component_id: true,
      component_code: true,
      serial_number: true,
      uas_serial_number: true,
      gcs_serial_number: true,
      component_name: true,
      fk_tool_id: true,
      tool: {
        select: {
          tool_id: true,
          fk_owner_id: true,
          tool_code: true,
          tool_description: true,
          tool_model: { select: { model_name: true, manufacturer: true } },
        },
      },
    },
  });

  if (!droneComponent || droneComponent.tool.fk_owner_id !== ownerId) {
    return { code: 0, message: 'Drone not found or access denied' };
  }

  const startUtc = localDayBoundaryToUtc(startDate, timezone, false);
  const endUtc = localDayBoundaryToUtc(endDate, timezone, true);

  if (endUtc < startUtc) {
    return { code: 0, message: 'End date must be on or after start date' };
  }

  // Missions are logged against the system (fk_tool_id), not a specific drone
  // component, so start from the drone's parent system. A system's drone can
  // be swapped over time though, so exclude any mission whose maintenance log
  // shows a *different* drone component was actually used — a mission with no
  // drone maintenance log entry at all is assumed to belong to this drone.
  const windowWhere = {
    fk_tool_id: droneComponent.fk_tool_id,
    status_name: 'COMPLETED',
    actual_start: { gte: startUtc, lte: endUtc },
    NOT: {
      mission_maintenance_log: {
        some: {
          fk_component_id: { not: droneComponentId },
          tool_component: { component_type: 'DRONE' },
        },
      },
    },
  } as const;

  const totalCount = await prisma.pilot_mission.count({ where: windowWhere });

  if (totalCount === 0) {
    return { code: 0, message: 'No completed flights found for this drone in the selected date range' };
  }

  if (totalCount > MAX_MISSIONS) {
    return {
      code: 2,
      message: `This date range contains ${totalCount} flights, which exceeds the ${MAX_MISSIONS} report limit. Please narrow the date range and try again.`,
      count: totalCount,
    };
  }

  const [pastAgg, missions, batteryComponent] = await Promise.all([
    prisma.pilot_mission.aggregate({
      where: {
        fk_tool_id: droneComponent.fk_tool_id,
        status_name: 'COMPLETED',
        actual_start: { lt: startUtc },
        NOT: {
          mission_maintenance_log: {
            some: {
              fk_component_id: { not: droneComponentId },
              tool_component: { component_type: 'DRONE' },
            },
          },
        },
      },
      _sum: { flight_duration: true },
      _count: true,
    }),
    prisma.pilot_mission.findMany({
      where: windowWhere,
      select: {
        pilot_mission_id: true,
        mission_code: true,
        actual_start: true,
        actual_end: true,
        flight_duration: true,
        distance_flown: true,
        location: true,
        notes: true,
        weather_temperature: true,
        users: { select: { first_name: true, last_name: true } },
      },
      orderBy: { actual_start: 'asc' },
    }),
    // Fallback for flights with no logged mission_maintenance_log battery entry —
    // most systems only ever have one battery component attached, so use it.
    prisma.tool_component.findFirst({
      where: { fk_tool_id: droneComponent.fk_tool_id, component_type: 'BATTERY' },
      select: { serial_number: true },
    }),
  ]);

  const pastFlightMinutes = pastAgg._sum.flight_duration ?? 0;
  const pastFlightCount = pastAgg._count;

  const missionIds = missions.map((m) => m.pilot_mission_id);
  const batteryLogs = missionIds.length
    ? await prisma.mission_maintenance_log.findMany({
        where: { fk_mission_id: { in: missionIds }, tool_component: { component_type: 'BATTERY' } },
        select: { fk_mission_id: true, tool_component: { select: { serial_number: true } } },
      })
    : [];

  const batterySerialsByMission = new Map<number, string[]>();
  batteryLogs.forEach((log) => {
    const sn = log.tool_component.serial_number;
    if (!sn) return;
    const existing = batterySerialsByMission.get(log.fk_mission_id) ?? [];
    if (!existing.includes(sn)) existing.push(sn);
    batterySerialsByMission.set(log.fk_mission_id, existing);
  });

  const pages: QtbPage[] = [];
  let runningMinutes = pastFlightMinutes;
  let runningCount = pastFlightCount;

  for (let i = 0; i < missions.length; i += PAGE_SIZE) {
    const chunk = missions.slice(i, i + PAGE_SIZE);
    const todayFlightMinutes = chunk.reduce((acc, m) => acc + (m.flight_duration ?? 0), 0);
    const todayFlightCount = chunk.length;

    pages.push({
      pageNumber: Math.floor(i / PAGE_SIZE) + 1,
      pastFlightMinutes: runningMinutes,
      pastFlightCount: runningCount,
      todayFlightMinutes,
      todayFlightCount,
      totalFlightMinutes: runningMinutes + todayFlightMinutes,
      totalFlightCount: runningCount + todayFlightCount,
      missions: chunk.map((m) => ({
        pilot_mission_id: m.pilot_mission_id,
        mission_code: m.mission_code,
        actual_start: m.actual_start?.toISOString() ?? null,
        actual_end: m.actual_end?.toISOString() ?? null,
        flight_duration: m.flight_duration,
        distance_flown: m.distance_flown != null ? Number(m.distance_flown) : null,
        location: m.location,
        notes: m.notes,
        pilot_name: m.users ? [m.users.first_name, m.users.last_name].filter(Boolean).join(' ') || null : null,
        weather_temperature: m.weather_temperature != null ? Number(m.weather_temperature) : null,
        battery_serial_number: (batterySerialsByMission.get(m.pilot_mission_id) ?? []).join(', ') || batteryComponent?.serial_number || null,
      })),
    });

    runningMinutes += todayFlightMinutes;
    runningCount += todayFlightCount;
  }

  return {
    code: 1,
    data: {
      tool: {
        tool_id: droneComponent.tool.tool_id,
        tool_code: droneComponent.tool.tool_code,
        tool_desc: droneComponent.tool.tool_description,
        model_name: droneComponent.tool.tool_model
          ? [droneComponent.tool.tool_model.manufacturer, droneComponent.tool.tool_model.model_name].filter(Boolean).join(' ')
          : null,
      },
      drone: {
        component_id: droneComponent.component_id,
        component_code: droneComponent.component_code,
        serial_number: droneComponent.serial_number,
        uas_serial_number: droneComponent.uas_serial_number,
        gcs_serial_number: droneComponent.gcs_serial_number,
        component_name: droneComponent.component_name,
      },
      range: { startDate, endDate, timezone },
      pastFlightMinutes,
      pastFlightCount,
      totalCount,
      pages,
    },
  };
}
