import { Mission, MissionBoardData, MissionStatusCode, UpdateMissionStatusPayload } from '@/config/types/operation';
import { prisma } from '@/lib/prisma';
import { autoAbortStaleMissions } from './auto-abort-service';
import { getToolMaintenanceStatus } from './maintenance-cycle-service';
import { assertMissionEditable } from './mission-lock';
import { sendMissionStartedModuleEmail, sendMissionCompletedModuleEmail } from '../settings/module-email-notification-service';

const BOARD_STATUS_ID_TO_CODE: Record<number, MissionStatusCode> = {
  1: '00',
  2: '05',
  3: '10',
};

const MISSION_INCLUDE = {
  users: { select: { first_name: true, last_name: true } },
  tool: { select: { tool_code: true, tool_name: true, tool_id: true } },
  pilot_mission_status: { select: { status_code: true, status_name: true, status_order: true } },
  pilot_mission_type: { select: { type_name: true, type_code: true } },
  pilot_mission_category: { select: { category_name: true } },
  planning: {
    select: {
      fk_owner_id: true,
      fk_client_id: true,
      client: { select: { client_name: true, client_id: true } },
      planning_logbook: {
        select: {
          mission_planning_id: true,
          mission_planning_code: true,
          mission_planning_desc: true,
          mission_planning_limit_json: true,
        },
        take: 1,
      },
    },
  },
} as const;

async function getLastClosedTicketPerTool(
  toolIds: number[]
): Promise<Record<number, Mission['last_closed_ticket']>> {
  const data = await prisma.maintenance_ticket.findMany({
    where: {
      fk_tool_id: { in: toolIds },
      ticket_status: 'CLOSED',
      closed_at: { not: null },
    },
    orderBy: { closed_at: 'desc' },
    select: { ticket_id: true, fk_tool_id: true, closed_at: true, resolution_notes: true },
  });

  const map: Record<number, Mission['last_closed_ticket']> = {};
  for (const row of data) {
    const toolId = row.fk_tool_id!;
    if (!map[toolId]) {
      map[toolId] = {
        ticket_id: row.ticket_id,
        closed_at: row.closed_at?.toISOString() ?? '',
        note: row.resolution_notes ?? null,
      };
    }
  }
  return map;
}

export async function getMissionBoard(
  ownerId: number,
  userId: number,
  userProfileCode: string
): Promise<MissionBoardData> {
  await autoAbortStaleMissions(ownerId);

  const pilotFilter = userProfileCode === 'PIC' ? userId : null;
  const today = new Date();
  const todayStart = new Date(today.toISOString().split('T')[0] + 'T00:00:00.000Z');
  const todayEnd = new Date(today.toISOString().split('T')[0] + 'T23:59:59.999Z');

  const [scheduledData, inProgressData, doneData] = await Promise.all([
    prisma.pilot_mission.findMany({
      where: {
        fk_owner_id: ownerId,
        fk_mission_status_id: 1,
        ...(pilotFilter && { fk_pilot_user_id: pilotFilter }),
        OR: [
          { scheduled_start: null },
          { scheduled_start: { gte: todayStart, lte: todayEnd } },
        ],
      },
      orderBy: { scheduled_start: { sort: 'desc', nulls: 'first' } },
      take: 100,
      include: MISSION_INCLUDE,
    }),
    prisma.pilot_mission.findMany({
      where: {
        fk_owner_id: ownerId,
        fk_mission_status_id: 2,
        ...(pilotFilter && { fk_pilot_user_id: pilotFilter }),
      },
      orderBy: { actual_start: { sort: 'desc', nulls: 'first' } },
      take: 100,
      include: MISSION_INCLUDE,
    }),
    prisma.pilot_mission.findMany({
      where: {
        fk_owner_id: ownerId,
        fk_mission_status_id: 3,
        actual_end: { gte: todayStart, lte: todayEnd },
        ...(pilotFilter
          ? { fk_pilot_user_id: pilotFilter }
          : { fk_pilot_user_id: { gt: 0 } }),
      },
      orderBy: { actual_end: 'desc' },
      take: 100,
      include: MISSION_INCLUDE,
    }),
  ]);

  const scheduled = scheduledData.map(transformMissionRow).filter((m): m is Mission => m !== null);
  const in_progress = inProgressData.map(transformMissionRow).filter((m): m is Mission => m !== null);
  const done = doneData.map(transformMissionRow).filter((m): m is Mission => m !== null);

  const allMissions = [...scheduled, ...in_progress, ...done];
  const uniqueToolIds = [...new Set(allMissions.map(m => m.fk_vehicle_id).filter(Boolean))];

  const statusMap: Record<number, string> = {};
  await Promise.all(
    uniqueToolIds.map(async (toolId) => {
      try {
        statusMap[toolId] = await getToolMaintenanceStatus(toolId);
      } catch {
        statusMap[toolId] = 'OK';
      }
    })
  );

  for (const m of allMissions) {
    m.maintenance_status = (statusMap[m.fk_vehicle_id] as Mission['maintenance_status']) ?? 'OK';
  }

  const scheduledToolIds = [...new Set(scheduled.map(m => m.fk_vehicle_id).filter(Boolean))];
  if (scheduledToolIds.length > 0) {
    const lastClosedMap = await getLastClosedTicketPerTool(scheduledToolIds);
    for (const m of scheduled) {
      m.last_closed_ticket = lastClosedMap[m.fk_vehicle_id] ?? null;
    }
  }

  return { scheduled, in_progress, done };
}

type MissionRow = Awaited<ReturnType<typeof prisma.pilot_mission.findFirst>> & {
  users?: { first_name: string | null; last_name: string | null } | null;
  tool?: { tool_code: string | null; tool_name: string | null; tool_id: number } | null;
  pilot_mission_status?: { status_code: string; status_name: string; status_order: number | null } | null;
  pilot_mission_type?: { type_name: string; type_code: string } | null;
  pilot_mission_category?: { category_name: string } | null;
  planning?: {
    fk_owner_id: number;
    fk_client_id: number | null;
    client?: { client_name: string; client_id: number } | null;
    planning_logbook?: Array<{
      mission_planning_id: number;
      mission_planning_code: string | null;
      mission_planning_desc: string | null;
      mission_planning_limit_json: any;
    }>;
  } | null;
};

function transformMissionRow(row: MissionRow | null): Mission | null {
  if (!row) return null;
  try {
    const user = row.users;
    const tool = row.tool;
    const status = row.pilot_mission_status;
    const missionType = row.pilot_mission_type;
    const category = row.pilot_mission_category;
    const planning = row.planning;
    const client = planning?.client;
    const logbook = planning?.planning_logbook?.[0];

    const scheduledStart = row.scheduled_start?.toISOString() ?? null;
    const actualStart = row.actual_start?.toISOString() ?? null;
    const actualEnd = row.actual_end?.toISOString() ?? null;

    const startSource = scheduledStart ?? actualStart;
    const startDt = startSource ? new Date(startSource) : null;
    const endDt = actualEnd ? new Date(actualEnd) : null;

    const fkMissionStatusId = row.fk_mission_status_id ?? 0;
    const codeFromBoardColumn = BOARD_STATUS_ID_TO_CODE[fkMissionStatusId];
    const codeFromJoin = status?.status_code as MissionStatusCode | undefined;
    const mission_status_code: MissionStatusCode = codeFromBoardColumn ?? codeFromJoin ?? '00';

    return {
      mission_id: row.pilot_mission_id,
      mission_name: row.mission_name ?? null,
      planned_at: scheduledStart,
      official_start: actualStart,
      official_end: actualEnd,
      fk_owner_id: planning?.fk_owner_id ?? 0,
      fk_vehicle_id: tool?.tool_id ?? 0,
      fk_pic_id: row.fk_pilot_user_id ?? 0,
      fk_status_id: fkMissionStatusId,
      fk_mission_type_id: row.fk_mission_type_id ?? 0,
      fk_mission_category_id: row.fk_mission_category_id ?? 0,
      fk_result_id: 0,
      fk_client_id: client?.client_id ?? 0,
      fk_mission_planning_id: logbook?.mission_planning_id ?? 0,
      mission_status_code,
      mission_status_desc: status?.status_name ?? '',
      mission_type_desc: missionType?.type_name ?? '',
      mission_category_desc: category?.category_name ?? '',
      mission_result_desc: '',
      mission_planning_code: logbook?.mission_planning_code ?? '',
      mission_planning_desc: logbook?.mission_planning_desc ?? '',
      mission_planning_limit_json: logbook?.mission_planning_limit_json
        ? JSON.stringify(logbook.mission_planning_limit_json)
        : '{}',
      pic_fullname: user ? `${user.first_name} ${user.last_name}` : 'Unassigned',
      client_name: client?.client_name ?? '',
      vehicle_code: tool?.tool_code ?? '',
      vehicle_desc: tool?.tool_name ?? '',
      date_start: startDt ? startDt.toLocaleDateString('en-GB') : '',
      time_start: startDt ? startDt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
      date_end: endDt ? endDt.toLocaleDateString('en-GB') : null,
      time_end: endDt ? endDt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null,
      flown_time: row.flight_duration ?? null,
      flown_meter: row.distance_flown ? Number(row.distance_flown) : null,
      mission_notes: row.notes ?? null,
      mission_group_label: row.mission_group_label ?? null,
      recurring_group_id: row.recurring_group_id ?? null,
      mission_waypoint: null,
      incident_flag: 0,
      rth_unplanned: 0,
      link_loss: 0,
      deviation_flag: 0,
      fk_luc_procedure_id: row.fk_luc_procedure_id ?? null,
      luc_procedure_progress: (row.luc_procedure_progress as Mission['luc_procedure_progress']) ?? null,
      luc_completed_at: row.luc_completed_at?.toISOString() ?? null,
    };
  } catch {
    return null;
  }
}


export async function updateMissionStatus(
  payload: UpdateMissionStatusPayload
): Promise<{ code: number; message: string; check_daily_declaration?: string }> {
  const current = await prisma.pilot_mission.findUnique({
    where: { pilot_mission_id: payload.mission_id },
    select: { status_name: true },
  });
  assertMissionEditable(current?.status_name);

  let updateFields: Record<string, unknown>;

  if (payload.workflow_mission_status === '_START') {
    updateFields = { fk_mission_status_id: 2, status_name: 'IN_PROGRESS', actual_start: new Date() };
  } else if (payload.workflow_mission_status === '_END') {
    updateFields = { fk_mission_status_id: 3, status_name: 'COMPLETED', actual_end: new Date() };
  } else {
    updateFields = { fk_mission_status_id: 2, status_name: 'IN_PROGRESS', actual_end: null };
  }

  await prisma.pilot_mission.update({
    where: { pilot_mission_id: payload.mission_id },
    data: updateFields,
  });

  // Send email notifications based on status change
  try {
    const mission = await prisma.pilot_mission.findUnique({
      where: { pilot_mission_id: payload.mission_id },
      select: {
        mission_code: true,
        fk_mission_type_id: true,
        fk_owner_id: true,
        actual_start: true,
        actual_end: true,
        notes: true,
        mission_name: true,
      },
    });

    if (!mission) return { code: 1, message: 'Mission status updated successfully' };

    const missionType = mission.fk_mission_type_id 
      ? await prisma.pilot_mission_type.findUnique({
          where: { mission_type_id: mission.fk_mission_type_id },
          select: { type_name: true },
        })
      : null;

    const user = payload.pilot_id 
      ? await prisma.public_users.findUnique({
          where: { user_id: payload.pilot_id },
          select: { first_name: true, last_name: true },
        })
      : null;

    const userName = user 
      ? `${user.first_name} ${user.last_name}`.trim() 
      : 'System';

    if (payload.workflow_mission_status === '_START') {
      await sendMissionStartedModuleEmail(mission.fk_owner_id, {
        missionCode: mission.mission_code || '',
        missionType: missionType?.type_name || 'Unknown',
        startedBy: userName,
        startTime: mission.actual_start?.toISOString() || new Date().toISOString(),
        pilot: userName,
      });
    } else if (payload.workflow_mission_status === '_END') {
      // Calculate duration if both start and end times are available
      let duration: string | undefined;
      if (mission.actual_start && mission.actual_end) {
        const start = new Date(mission.actual_start);
        const end = new Date(mission.actual_end);
        const diffMs = end.getTime() - start.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        duration = `${diffHours}h ${diffMins}m`;
      }

      await sendMissionCompletedModuleEmail(mission.fk_owner_id, {
        missionCode: mission.mission_code || '',
        missionType: missionType?.type_name || 'Unknown',
        completedBy: userName,
        completionTime: mission.actual_end?.toISOString() || new Date().toISOString(),
        duration,
        notes: mission.notes || mission.mission_name || undefined,
      });
    }
  } catch (emailError) {
    console.error('Failed to send mission status email:', emailError);
    // Don't fail the status update if email fails
  }

  return { code: 1, message: 'Mission status updated successfully' };
}


export async function getMissionDetail(missionId: number) {
  const data = await prisma.pilot_mission.findUnique({
    where: { pilot_mission_id: missionId },
    include: {
      users: { select: { first_name: true, last_name: true, email: true } },
      tool: { select: { tool_code: true, tool_name: true } },
      pilot_mission_status: { select: { status_code: true, status_name: true } },
      pilot_mission_type: { select: { type_name: true } },
      pilot_mission_category: { select: { category_name: true } },
    },
  });

  if (!data) throw new Error('Mission not found');
  return data;
}
