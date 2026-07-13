import { prisma } from '@/lib/prisma';
import { ChartData, MissionResultChart } from './dashboard';
import { YearMission } from './mission-queries';

export async function getChartReadiTotalMission(
  missions: YearMission[],
  ownerId: number,
  fkClientId: number
): Promise<ChartData> {
  try {
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
  missions: YearMission[],
  ownerId: number,
  fkClientId: number
): Promise<MissionResultChart> {
  try {
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
