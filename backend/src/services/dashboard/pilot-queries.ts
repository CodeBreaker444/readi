import { prisma } from '@/lib/prisma';
import { getCurrentYear } from '../../utils/date-utils';
import { PilotTotal } from './dashboard';

export async function getPilotTotal(userId: number, ownerId: number): Promise<PilotTotal> {
  try {
    const currentYear = getCurrentYear();

    const data = await prisma.pilot_mission.findMany({
      where: {
        fk_pilot_user_id: userId,
        fk_owner_id: ownerId,
        actual_start: {
          gte: new Date(`${currentYear}-01-01`),
          lte: new Date(`${currentYear}-12-31`),
        },
      },
      select: {
        pilot_mission_id: true,
        flight_duration: true,
        distance_flown: true,
        actual_start: true,
        fk_owner_id: true,
      },
    });

    const total_missions = data.length;
    const total_time = data.reduce((sum, m) => sum + (m.flight_duration || 0), 0);
    const total_hours = Math.floor(total_time / 60);
    const total_distance = data.reduce((sum, m) => sum + Number(m.distance_flown || 0), 0);

    return { total_missions, total_hours, total_distance };
  } catch (error) {
    console.error('Error in getPilotTotal:', error);
    return { total_missions: 0, total_hours: 0, total_distance: 0 };
  }
}
