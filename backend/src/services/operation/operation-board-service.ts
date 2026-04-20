import { supabase } from "@/backend/database/database";
import { Mission, MissionBoardData, MissionStatusCode, UpdateMissionStatusPayload } from "@/config/types/operation";
import { getToolMaintenanceStatus } from "./maintenance-cycle-service";


/** Board queries filter by these IDs; UI codes must stay aligned when status join is stale or non-canonical. */
const BOARD_STATUS_ID_TO_CODE: Record<number, MissionStatusCode> = {
  1: "00",
  2: "05",
  3: "10",
};

const MISSION_SELECT = `
      pilot_mission_id,
      fk_planning_id,
      fk_pilot_user_id,
      fk_tool_id,
      fk_mission_type_id,
      fk_mission_category_id,
      fk_mission_status_id,
      scheduled_start,
      actual_start,
      actual_end,
      flight_duration,
      distance_flown,
      notes,
      mission_name,
      recurring_group_id,
      mission_group_label,
      fk_luc_procedure_id,
      luc_procedure_progress,
      luc_completed_at,
      users!pilot_mission_fk_pilot_user_id_fkey(first_name, last_name),
      tool!pilot_mission_fk_tool_id_fkey(tool_code, tool_name, tool_id),
      pilot_mission_status!pilot_mission_fk_mission_status_id_fkey(status_code, status_name, status_order),
      pilot_mission_type!pilot_mission_fk_mission_type_id_fkey(type_name, type_code),
      pilot_mission_category!pilot_mission_fk_mission_category_id_fkey(category_name),
      planning!pilot_mission_fk_planning_id_fkey(
        fk_owner_id,
        fk_client_id,
        client!planning_fk_client_id_fkey(client_name, client_id),
        planning_logbook!planning_logbook_fk_planning_id_fkey(
          mission_planning_id,
          mission_planning_code,
          mission_planning_desc,
          mission_planning_limit_json
        )
      )
`;

export async function getMissionBoard(
  ownerId: number,
  userId: number,
  userProfileCode: string
): Promise<MissionBoardData> {

  const pilotFilter = userProfileCode === "PIC" ? userId : null;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  let scheduledQuery = supabase
    .from("pilot_mission")
    .select(MISSION_SELECT)
    .eq('fk_owner_id', ownerId)
    .eq("fk_mission_status_id", 1)
    .or(`scheduled_start.is.null,and(scheduled_start.gte.${todayStr}T00:00:00,scheduled_start.lte.${todayStr}T23:59:59)`)
    .order("scheduled_start", { ascending: false, nullsFirst: true })
    .limit(100);

  if (pilotFilter) {
    scheduledQuery = scheduledQuery.eq("fk_pilot_user_id", pilotFilter);
  }

  // In-progress missions: all active regardless of date
  let inProgressQuery = supabase
    .from("pilot_mission")
    .select(MISSION_SELECT)
    .eq('fk_owner_id', ownerId)
    .eq("fk_mission_status_id", 2)
    .order("actual_start", { ascending: false, nullsFirst: true })
    .limit(100);

  if (pilotFilter) {
    inProgressQuery = inProgressQuery.eq("fk_pilot_user_id", pilotFilter);
  }

  // Done missions from the past 7 days
  let doneQuery = supabase
    .from("pilot_mission")
    .select(MISSION_SELECT)
    .eq('fk_owner_id', ownerId)
    .eq("fk_mission_status_id", 3)
    .gte("actual_end", `${weekAgoStr}T00:00:00`)
    .not("fk_pilot_user_id", "is", null)
    .order("actual_end", { ascending: false })
    .limit(100);

  if (pilotFilter) {
    doneQuery = doneQuery.eq("fk_pilot_user_id", pilotFilter);
  }

  const [
    { data: scheduledData, error: scheduledError },
    { data: inProgressData, error: inProgressError },
    { data: doneData, error: doneError },
  ] = await Promise.all([scheduledQuery, inProgressQuery, doneQuery]);

  if (scheduledError) throw new Error(`Failed to fetch scheduled missions: ${scheduledError.message}`);
  if (inProgressError) throw new Error(`Failed to fetch in-progress missions: ${inProgressError.message}`);
  if (doneError) throw new Error(`Failed to fetch done missions: ${doneError.message}`);

  const scheduled: Mission[] = [];
  const in_progress: Mission[] = [];
  const done: Mission[] = [];

  for (const row of scheduledData ?? []) {
    const mission = transformMissionRow(row);
    if (mission) scheduled.push(mission);
  }

  for (const row of inProgressData ?? []) {
    const mission = transformMissionRow(row);
    if (mission) in_progress.push(mission);
  }

  for (const row of doneData ?? []) {
    const mission = transformMissionRow(row);
    if (mission) done.push(mission);
  }

  const allMissions = [...scheduled, ...in_progress, ...done];
  const uniqueToolIds = [...new Set(allMissions.map(m => m.fk_vehicle_id).filter(Boolean))];

  const statusMap: Record<number, string> = {};
  await Promise.all(
    uniqueToolIds.map(async (toolId) => {
      try {
        statusMap[toolId] = await getToolMaintenanceStatus(toolId);
      } catch {
        statusMap[toolId] = "OK";
      }
    })
  );

  for (const m of allMissions) {
    m.maintenance_status = (statusMap[m.fk_vehicle_id] as Mission['maintenance_status']) ?? "OK";
  }

  return { scheduled, in_progress, done };
}


function transformMissionRow(row: Record<string, unknown>): Mission | null {
  try {
    const user = row.users as Record<string, string> | null;
    const tool = row.tool as Record<string, unknown> | null;
    const status = row.pilot_mission_status as Record<string, string> | null;
    const missionType = row.pilot_mission_type as Record<string, string> | null;
    const category = row.pilot_mission_category as Record<string, string> | null;
    const planning = row.planning as Record<string, unknown> | null;
    const client = planning?.client as Record<string, unknown> | null;
    const logbook = (planning?.planning_logbook as Record<string, unknown>[] | null)?.[0];

    const scheduledStart = row.scheduled_start as string | null;
    const actualStart = row.actual_start as string | null;
    const actualEnd = row.actual_end as string | null;

    const startSource = scheduledStart ?? actualStart;
    const startDt = startSource ? new Date(startSource) : null;
    const endDt = actualEnd ? new Date(actualEnd) : null;

    const fkMissionStatusId = row.fk_mission_status_id as number;
    const codeFromBoardColumn = BOARD_STATUS_ID_TO_CODE[fkMissionStatusId];
    const codeFromJoin = status?.status_code as MissionStatusCode | undefined;
    const mission_status_code: MissionStatusCode =
      codeFromBoardColumn ?? codeFromJoin ?? "00";

    return {
      mission_id: row.pilot_mission_id as number,
      mission_name: (row.mission_name as string | null) ?? null,
      planned_at: scheduledStart,
      official_start: actualStart,
      official_end: actualEnd,
      fk_owner_id: (planning?.fk_owner_id as number) ?? 0,
      fk_vehicle_id: (tool?.tool_id as number) ?? 0,
      fk_pic_id: row.fk_pilot_user_id as number,
      fk_status_id: fkMissionStatusId,
      fk_mission_type_id: row.fk_mission_type_id as number,
      fk_mission_category_id: row.fk_mission_category_id as number,
      fk_result_id: 0,
      fk_client_id: (client?.client_id as number) ?? 0,
      fk_mission_planning_id: (logbook?.mission_planning_id as number) ?? 0,
      mission_status_code,
      mission_status_desc: status?.status_name ?? "",
      mission_type_desc: missionType?.type_name ?? "",
      mission_category_desc: category?.category_name ?? "",
      mission_result_desc: "",
      mission_planning_code: (logbook?.mission_planning_code as string) ?? "",
      mission_planning_desc: (logbook?.mission_planning_desc as string) ?? "",
      mission_planning_limit_json: logbook?.mission_planning_limit_json
        ? JSON.stringify(logbook.mission_planning_limit_json)
        : "{}",
      pic_fullname: user ? `${user.first_name} ${user.last_name}` : "Unassigned",
      client_name: (client?.client_name as string) ?? "",
      vehicle_code: (tool?.tool_code as string) ?? "",
      vehicle_desc: (tool?.tool_name as string) ?? "",
      date_start: startDt ? startDt.toLocaleDateString("en-GB") : "",
      time_start: startDt ? startDt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "",
      date_end: endDt ? endDt.toLocaleDateString("en-GB") : null,
      time_end: endDt ? endDt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : null,
      flown_time: row.flight_duration as number | null,
      flown_meter: row.distance_flown as number | null,
      mission_notes: row.notes as string | null,
      mission_group_label: (row.mission_group_label as string) ?? null,
      recurring_group_id: (row.recurring_group_id as string) ?? null,
      mission_waypoint: null,
      incident_flag: 0,
      rth_unplanned: 0,
      link_loss: 0,
      deviation_flag: 0,
      fk_luc_procedure_id: (row.fk_luc_procedure_id as number | null) ?? null,
      luc_procedure_progress: (row.luc_procedure_progress as Mission["luc_procedure_progress"]) ?? null,
      luc_completed_at: (row.luc_completed_at as string | null) ?? null,
    };
  } catch {
    return null;
  }
}


export async function updateMissionStatus(
  payload: UpdateMissionStatusPayload
): Promise<{ code: number; message: string; check_daily_declaration?: string }> {

  let updateFields: Record<string, unknown>;

  if (payload.workflow_mission_status === "_START") {
    updateFields = { fk_mission_status_id: 2, status_name: "IN_PROGRESS", actual_start: new Date().toISOString() };
  } else if (payload.workflow_mission_status === "_END") {
    updateFields = { fk_mission_status_id: 3, status_name: "COMPLETED", actual_end: new Date().toISOString() };
  } else {
    updateFields = { fk_mission_status_id: 2, status_name: "IN_PROGRESS", actual_end: null };
  }

  const { error } = await supabase
    .from("pilot_mission")
    .update(updateFields)
    .eq("pilot_mission_id", payload.mission_id);

  if (error) {
    return { code: 0, message: error.message };
  }

  return { code: 1, message: "Mission status updated successfully" };
}


export async function getMissionDetail(missionId: number) {

  const { data, error } = await supabase
    .from("pilot_mission")
    .select(
      `
      *,
      users!pilot_mission_fk_pilot_user_id_fkey(first_name, last_name, email),
      tool!pilot_mission_fk_tool_id_fkey(tool_code, tool_name, tool_serial_number),
      pilot_mission_status!pilot_mission_fk_mission_status_id_fkey(status_code, status_name),
      pilot_mission_type!pilot_mission_fk_mission_type_id_fkey(type_name),
      pilot_mission_category!pilot_mission_fk_mission_category_id_fkey(category_name)
    `
    )
    .eq("pilot_mission_id", missionId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}