import { prisma } from '@/lib/prisma';
import { attachFlytbaseFlightLog } from './flight-log-service';
import { sendMissionCreatedModuleEmail, sendMissionCompletedModuleEmail } from '../settings/module-email-notification-service';

export interface CreateAndAttachMissionParams {
  mission_code: string;
  mission_name?: string;
  scheduled_start?: string;
  fk_pilot_user_id?: number | null;
  fk_tool_id?: number | null;
  fk_client_id?: number | null;
  fk_mission_type_id?: number | null;
  fk_mission_category_id?: number | null;
  fk_planning_id?: number | null;
  fk_luc_procedure_id: number;
  location?: string;
  notes?: string;
  status_name?: string;
  actual_start?: string;
  actual_end?: string;
  flight_id: string;
  op_type?: string;
}

export async function createAndAttachMission(
  params: CreateAndAttachMissionParams,
  userId: number,
  ownerId: number
) {
  const {
    mission_code,
    mission_name,
    scheduled_start,
    fk_pilot_user_id,
    fk_tool_id,
    fk_client_id,
    fk_mission_type_id,
    fk_mission_category_id,
    fk_planning_id,
    fk_luc_procedure_id,
    location,
    notes,
    status_name,
    actual_start,
    actual_end,
    flight_id,
    op_type,
  } = params;

  // Create the mission
  const mission = await prisma.pilot_mission.create({
    data: {
      mission_code: mission_code.trim(),
      mission_name: mission_name?.trim() || null,
      scheduled_start: scheduled_start ? new Date(scheduled_start) : null,
      actual_start: actual_start ? new Date(actual_start) : null,
      actual_end: actual_end ? new Date(actual_end) : null,
      fk_pilot_user_id: fk_pilot_user_id || null,
      fk_tool_id: fk_tool_id || null,
      fk_client_id: fk_client_id || null,
      fk_mission_type_id: fk_mission_type_id || null,
      fk_mission_category_id: fk_mission_category_id || null,
      fk_planning_id: fk_planning_id || null,
      fk_luc_procedure_id: fk_luc_procedure_id,
      location: location || null,
      notes: notes || null,
      status_name: status_name || 'COMPLETED',
      fk_owner_id: ownerId,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Send mission created email notification
  try {
    const missionType = fk_mission_type_id
      ? await prisma.pilot_mission_type.findUnique({
          where: { mission_type_id: fk_mission_type_id },
          select: { type_name: true },
        })
      : null;
    
    const user = await prisma.public_users.findUnique({
      where: { user_id: userId },
      select: { first_name: true, last_name: true },
    });

    const createdBy = user 
      ? `${user.first_name} ${user.last_name}`.trim() 
      : 'System';

    await sendMissionCreatedModuleEmail(ownerId, {
      missionCode: mission.mission_code || '',
      missionType: missionType?.type_name || 'Unknown',
      createdBy,
      scheduledDate: scheduled_start,
      description: mission_name || notes || undefined,
    });
  } catch (emailError) {
    console.error('Failed to send mission created email:', emailError);
    // Don't fail the mission creation if email fails
  }

  // Attach the flight log
  await attachFlytbaseFlightLog(mission.pilot_mission_id, userId, ownerId, flight_id);

  // Send mission completed email notification if status is COMPLETED
  if (status_name === 'COMPLETED' && actual_end) {
    try {
      const missionType = fk_mission_type_id
        ? await prisma.pilot_mission_type.findUnique({
            where: { mission_type_id: fk_mission_type_id },
            select: { type_name: true },
          })
        : null;
      
      const user = await prisma.public_users.findUnique({
        where: { user_id: userId },
        select: { first_name: true, last_name: true },
      });

      const completedBy = user 
        ? `${user.first_name} ${user.last_name}`.trim() 
        : 'System';

      // Calculate duration if both start and end times are available
      let duration: string | undefined;
      if (actual_start && actual_end) {
        const start = new Date(actual_start);
        const end = new Date(actual_end);
        const diffMs = end.getTime() - start.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        duration = `${diffHours}h ${diffMins}m`;
      }

      await sendMissionCompletedModuleEmail(ownerId, {
        missionCode: mission.mission_code || '',
        missionType: missionType?.type_name || 'Unknown',
        completedBy,
        completionTime: actual_end,
        duration,
        notes: notes || undefined,
      });
    } catch (emailError) {
      console.error('Failed to send mission completed email:', emailError);
      // Don't fail the mission creation if email fails
    }
  }

  // If PDRA and created after flight completion, add compliance warning to audit logs
  if (op_type === 'PDRA' && actual_start && actual_end) {
    const flightEndTime = new Date(actual_end);
    const missionCreatedTime = new Date();

    // Check if mission was created significantly after flight completion (more than 1 hour)
    const timeDiff = missionCreatedTime.getTime() - flightEndTime.getTime();
    if (timeDiff > 3600000) {
      await prisma.audit_logs.create({
        data: {
          user_id: userId,
          owner_id: ownerId,
          event_type: 'COMPLIANCE_WARNING',
          entity_type: 'pilot_mission',
          entity_id: String(mission.pilot_mission_id),
          description: `PDRA mission ${mission_code} was created after flight completion. This may indicate a compliance issue.`,
          metadata: {
            mission_code,
            op_type,
            flight_end_time: actual_end,
            mission_created_time: missionCreatedTime.toISOString(),
            time_difference_hours: Math.floor(timeDiff / 3600000),
          },
          created_at: new Date(),
        },
      });
    }
  }

  return {
    mission_id: mission.pilot_mission_id,
    mission_code: mission.mission_code,
  };
}

export async function getAttachableMissions(droneSerialNumber: string, ownerId: number) {
  // A system (tool) can have more than one active drone/aircraft component
  // (e.g. a dock with several swappable airframes), so find every tool that
  // has a component matching this serial rather than just the first one.
  const toolComponents = await prisma.tool_component.findMany({
    where: {
      serial_number: { equals: droneSerialNumber.trim(), mode: 'insensitive' },
      component_active: 'Y',
      OR: [
        { component_type: { equals: 'DRONE', mode: 'insensitive' } },
        { component_type: { equals: 'AIRCRAFT', mode: 'insensitive' } },
      ],
      tool: {
        fk_owner_id: ownerId,
      },
    },
    select: {
      fk_tool_id: true,
    },
  });

  const toolIds = [...new Set(toolComponents.map((c) => c.fk_tool_id).filter((id): id is number => id != null))];
  if (toolIds.length === 0) return [];
// If a mission already has a flight log attached (manual or FlytBase),
// don't allow another log to be attached. We still return it to the UI
// so it can be shown as disabled instead of being hidden.
  const missionsWithLogs = await prisma.mission_flight_logs.findMany({
    select: {
      fk_mission_id: true,
    },
    distinct: ['fk_mission_id'],
  });

  const missionIdsWithLogs = new Set(missionsWithLogs.map((log) => Number(log.fk_mission_id)));

  const missions = await prisma.pilot_mission.findMany({
    where: {
      fk_tool_id: { in: toolIds },
      fk_owner_id: ownerId,
      status_name: 'COMPLETED',
    },
    select: {
      pilot_mission_id: true,
      mission_code: true,
      mission_name: true,
      actual_start: true,
      actual_end: true,
      location: true,
      tool: {
        select: {
          tool_code: true,
          tool_name: true,
        },
      },
      users: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
    },
    orderBy: {
      actual_start: 'desc',
    },
    take: 50,
  });

  return missions.map((mission) => ({
    ...mission,
    has_flight_log: missionIdsWithLogs.has(mission.pilot_mission_id),
  }));
}

export interface LinkedMissionInfo {
  pilot_mission_id: number;
  mission_code: string | null;
  mission_name: string | null;
}

/**
 * Returns a map of FlytBase flight ID -> the mission it's already attached to
 * (out of the given list), for missions belonging to this owner.
 */
export async function getFlightIdsLinkedToMission(
  flightIds: string[],
  ownerId: number,
): Promise<Map<string, LinkedMissionInfo>> {
  if (flightIds.length === 0) return new Map();

  const logs = await prisma.mission_flight_logs.findMany({
    where: {
      flytbase_flight_id: { in: flightIds },
      log_source: 'flytbase',
    },
    select: { flytbase_flight_id: true, fk_mission_id: true },
  });
  if (logs.length === 0) return new Map();

  const missionIds = [...new Set(logs.map((log) => Number(log.fk_mission_id)))];
  const ownedMissions = await prisma.pilot_mission.findMany({
    where: { pilot_mission_id: { in: missionIds }, fk_owner_id: ownerId },
    select: { pilot_mission_id: true, mission_code: true, mission_name: true },
  });
  const ownedMissionsById = new Map(ownedMissions.map((m) => [m.pilot_mission_id, m]));

  const linked = new Map<string, LinkedMissionInfo>();
  for (const log of logs) {
    const mission = ownedMissionsById.get(Number(log.fk_mission_id));
    if (log.flytbase_flight_id && mission) {
      linked.set(log.flytbase_flight_id, mission);
    }
  }
  return linked;
}