import { prisma } from '@/lib/prisma';
import { dateConversionUtcToLocal, getCurrentYear } from '../../utils/date-utils';
import { MissionListItem, MissionTotal } from './dashboard';

/**
 * Single shared select covering everything getReadiTotalMission,
 * getChartReadiTotalMission and getChartReadiTotalMissionResult need, so the
 * dashboard can fetch a year of missions once and derive all three views
 * from that one result set instead of hitting the DB three times.
 */
export function getYearMissions(ownerId: number, fkUserId: number, year: number) {
  return prisma.pilot_mission.findMany({
    where: {
      fk_owner_id: ownerId,
      scheduled_start: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      },
      ...(fkUserId !== 0 && { fk_pilot_user_id: fkUserId }),
    },
    select: {
      pilot_mission_id: true,
      flight_duration: true,
      distance_flown: true,
      scheduled_start: true,
      actual_start: true,
      fk_tool_id: true,
      fk_planning_id: true,
      tool: {
        select: {
          tool_id: true,
          tool_code: true,
        },
      },
      pilot_mission_result: {
        select: {
          result_id: true,
          result_type: true,
        },
        take: 1,
      },
    },
  });
}

export type YearMission = Awaited<ReturnType<typeof getYearMissions>>[number];

export async function getReadiTotalMission(
  missions: YearMission[],
  ownerId: number,
  fkClientId: number,
  year: number
): Promise<MissionTotal> {
  try {
    if (!missions || missions.length === 0) {
      return {
        status: 'success',
        year,
        fk_client_id: fkClientId,
        client_name: 'All Clients',
        total_mission: 0,
        total_time: 0,
        total_hours: 0,
        total_meter: 0,
        total_planned: 0,
        total_drones_used: 0,
        total_clients_served: 0,
      };
    }

    let clientName = 'All Clients';
    const planningIds = missions.map(m => m.fk_planning_id).filter((id): id is number => id !== null);

    if (fkClientId !== 0 && planningIds.length > 0) {
      const planningData = await prisma.planning.findFirst({
        where: {
          fk_owner_id: ownerId,
          planning_id: { in: planningIds },
          fk_client_id: fkClientId,
        },
        select: {
          planning_id: true,
          fk_client_id: true,
          client: {
            select: {
              client_id: true,
              client_name: true,
            },
          },
        },
      });

      if (planningData?.client) {
        clientName = planningData.client.client_name || 'Unknown Client';
      }
    }

    const total_mission = missions.length;
    const total_time = missions.reduce((sum, m) => sum + (m.flight_duration || 0), 0);
    const total_hours = Math.floor(total_time / 60);
    const total_meter = missions.reduce((sum, m) => sum + Number(m.distance_flown || 0), 0);

    const now = new Date();
    const total_planned = missions.filter(m => m.scheduled_start && new Date(m.scheduled_start) > now).length;

    const uniqueDrones = new Set(missions.map(m => m.fk_tool_id).filter(Boolean));
    const total_drones_used = uniqueDrones.size;

    let total_clients_served = 0;
    if (planningIds.length > 0) {
      const planningData = await prisma.planning.findMany({
        where: {
          fk_owner_id: ownerId,
          planning_id: { in: planningIds },
        },
        select: { fk_client_id: true },
      });

      const uniqueClients = new Set(planningData.map(p => p.fk_client_id).filter(Boolean));
      total_clients_served = uniqueClients.size;
    }

    return {
      status: 'success',
      year,
      fk_client_id: fkClientId,
      client_name: clientName,
      total_mission,
      total_time,
      total_hours,
      total_meter,
      total_planned,
      total_drones_used,
      total_clients_served,
    };
  } catch (error) {
    console.error('Error in getReadiTotalMission:', error);
    throw error;
  }
}

export async function getReadiLastNextMissionList(
  ownerId: number,
  fkClientId: number,
  fkUserId: number,
  isScheduledFuture: number,
  limit: number,
  userTimezone: string
): Promise<MissionListItem[]> {
  try {
    const currentYear = getCurrentYear();
    const now = new Date();

    const missions = await prisma.pilot_mission.findMany({
      where: {
        fk_owner_id: ownerId,
        ...(fkUserId !== 0 && { fk_pilot_user_id: fkUserId }),
        scheduled_start: isScheduledFuture === 1 ? { gt: now } : { lte: now },
      },
      orderBy: { scheduled_start: isScheduledFuture === 1 ? 'asc' : 'desc' },
      take: limit,
      select: {
        pilot_mission_id: true,
        scheduled_start: true,
        actual_start: true,
        flight_duration: true,
        fk_pilot_user_id: true,
        fk_planning_id: true,
        users: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
          },
        },
        tool: {
          select: {
            tool_id: true,
            tool_code: true,
          },
        },
        pilot_mission_type: {
          select: {
            mission_type_id: true,
            type_name: true,
          },
        },
        pilot_mission_result: {
          select: {
            result_id: true,
            result_type: true,
          },
          take: 1,
        },
      },
    });

    if (!missions || missions.length === 0) {
      return [];
    }

    const planningIds = missions.map(m => m.fk_planning_id).filter((id): id is number => id !== null);
    const planningMap = new Map<number, { planning_id: number; fk_client_id: number | null }>();

    if (planningIds.length > 0) {
      const planningData = await prisma.planning.findMany({
        where: {
          fk_owner_id: ownerId,
          planning_id: { in: planningIds },
          ...(fkClientId !== 0 && { fk_client_id: fkClientId }),
        },
        select: {
          planning_id: true,
          fk_client_id: true,
        },
      });

      planningData.forEach(p => planningMap.set(p.planning_id, p));
    }

    return missions
      .filter(item => {
        if (fkClientId === 0) return true;
        const planning = item.fk_planning_id ? planningMap.get(item.fk_planning_id) : null;
        return planning?.fk_client_id === fkClientId;
      })
      .map(item => {
        const planning = item.fk_planning_id ? planningMap.get(item.fk_planning_id) : null;
        const missionResult = item.pilot_mission_result[0] ?? null;
        const displayDate = item.actual_start || item.scheduled_start;

        return {
          status: 'success',
          year: currentYear,
          fk_client_id: planning?.fk_client_id || 0,
          fk_user_id: item.fk_pilot_user_id || 0,
          mission_id: item.pilot_mission_id,
          date: dateConversionUtcToLocal(displayDate?.toISOString() ?? '', userTimezone),
          pilot_name: item.users ? `${item.users.first_name} ${item.users.last_name}` : '',
          drone_code: item.tool?.tool_code || '',
          mission_type_desc: item.pilot_mission_type?.type_name || '',
          mission_result_desc: missionResult?.result_type || '',
          mission_duration_min: item.flight_duration || 0,
        };
      });
  } catch (error) {
    console.error('Error in getReadiLastNextMissionList:', error);
    throw error;
  }
}
