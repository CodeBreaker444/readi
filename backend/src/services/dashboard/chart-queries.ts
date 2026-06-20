import { prisma } from '@/lib/prisma';
import { ChartData, MissionResultChart } from './dashboard';

export async function getChartReadiTotalMission(
  ownerId: number,
  fkClientId: number,
  fkUserId: number,
  year: number
): Promise<ChartData> {
  try {
    const missions = await prisma.pilot_mission.findMany({
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
        scheduled_start: true,
        fk_tool_id: true,
        fk_planning_id: true,
        tool: {
          select: {
            tool_id: true,
            tool_code: true,
          },
        },
      },
    });

    let filteredData = missions;

    if (fkClientId !== 0 && filteredData.length > 0) {
      const planningIds = filteredData.map(m => m.fk_planning_id).filter((id): id is number => id !== null);

      if (planningIds.length > 0) {
        const planningData = await prisma.planning.findMany({
          where: {
            fk_owner_id: ownerId,
            planning_id: { in: planningIds },
            fk_client_id: fkClientId,
          },
          select: { planning_id: true },
        });

        const validPlanningIds = new Set(planningData.map(p => p.planning_id));
        filteredData = filteredData.filter(m => m.fk_planning_id !== null && validPlanningIds.has(m.fk_planning_id!));
      }
    }

    const labels = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const droneMap = new Map<string, number[]>();

    filteredData.forEach(mission => {
      const droneName = mission.tool?.tool_code;
      if (!droneName) return;

      const date = new Date(mission.scheduled_start!);
      const month = date.getMonth();

      if (!droneMap.has(droneName)) {
        droneMap.set(droneName, new Array(12).fill(0));
      }

      droneMap.get(droneName)![month]++;
    });

    const series = Array.from(droneMap.entries()).map(([name, data]) => ({ name, data }));

    return { labels, series };
  } catch (error) {
    console.error('Error in getChartReadiTotalMission:', error);
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      series: [],
    };
  }
}

export async function getChartReadiTotalMissionResult(
  ownerId: number,
  fkClientId: number,
  fkUserId: number,
  year: number
): Promise<MissionResultChart> {
  try {
    const missions = await prisma.pilot_mission.findMany({
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
        scheduled_start: true,
        fk_planning_id: true,
        pilot_mission_result: {
          select: {
            result_id: true,
            result_type: true,
          },
          take: 1,
        },
      },
    });

    let filteredData = missions;

    if (fkClientId !== 0 && filteredData.length > 0) {
      const planningIds = filteredData.map(m => m.fk_planning_id).filter((id): id is number => id !== null);

      if (planningIds.length > 0) {
        const planningData = await prisma.planning.findMany({
          where: {
            fk_owner_id: ownerId,
            planning_id: { in: planningIds },
            fk_client_id: fkClientId,
          },
          select: { planning_id: true },
        });

        const validPlanningIds = new Set(planningData.map(p => p.planning_id));
        filteredData = filteredData.filter(m => m.fk_planning_id !== null && validPlanningIds.has(m.fk_planning_id!));
      }
    }

    const resultMap = new Map<string, number>();

    filteredData.forEach(mission => {
      const result = mission.pilot_mission_result[0] ?? null;
      const resultType = result?.result_type || 'Pending';
      resultMap.set(resultType, (resultMap.get(resultType) || 0) + 1);
    });

    const labels: string[] = [];
    const series: number[] = [];

    Array.from(resultMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([label, count]) => {
        labels.push(label);
        series.push(count);
      });

    return { labels, series };
  } catch (error) {
    console.error('Error in getChartReadiTotalMissionResult:', error);
    return { labels: [], series: [] };
  }
}
