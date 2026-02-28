 import { supabase } from "@/backend/database/database";
import { Mission, MissionBoardData, UpdateMissionStatusPayload } from "@/config/types/operation";


function buildMissionSelect() {
  return `
    pilot_mission.pilot_mission_id AS mission_id,
    pilot_mission.fk_planning_id,
    pilot_mission.fk_pilot_user_id AS fk_pic_id,
    pilot_mission.fk_tool_id AS fk_vehicle_id,
    pilot_mission.fk_mission_type_id,
    pilot_mission.fk_mission_category_id,
    pilot_mission.fk_mission_status_id AS fk_status_id,
    pilot_mission.scheduled_start,
    pilot_mission.actual_start,
    pilot_mission.actual_end,
    pilot_mission.flight_duration AS flown_time,
    pilot_mission.distance_flown AS flown_meter,
    pilot_mission.notes AS mission_notes,
    users.first_name || ' ' || users.last_name AS pic_fullname,
    client.client_name,
    client.client_id AS fk_client_id,
    tool.tool_code AS vehicle_code,
    tool.tool_name AS vehicle_desc,
    tool.tool_id,
    pilot_mission_status.status_code AS mission_status_code,
    pilot_mission_status.status_name AS mission_status_desc,
    pilot_mission_type.type_name AS mission_type_desc,
    pilot_mission_type.type_code AS mission_type_code,
    pilot_mission_category.category_name AS mission_category_desc,
    planning_logbook.mission_planning_code,
    planning_logbook.mission_planning_desc,
    planning_logbook.mission_planning_limit_json,
    planning_logbook.mission_planning_id AS fk_mission_planning_id,
    pilot_mission.mission_name,
    pilot_mission.weather_conditions,
    pilot_mission.coordinates
  `;
}


export async function getMissionBoard(
  ownerId: number,
  userId: number,
  userProfileCode: string
): Promise<MissionBoardData> {

  const pilotFilter = userProfileCode === "PIC" ? userId : null;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  let query = supabase
    .from("pilot_mission")
    .select(
      `
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
      weather_conditions,
      mission_name,
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
      `
    )
    .eq('fk_owner_id',ownerId)
    .gte("scheduled_start", `${todayStr}T00:00:00`)
    .lte("scheduled_start", `${todayStr}T23:59:59`)
    .not("fk_pilot_user_id", "is", null);

  if (pilotFilter) {
    query = query.eq("fk_pilot_user_id", pilotFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch mission board: ${error.message}`);
  }

  const scheduled: Mission[] = [];
  const in_progress: Mission[] = [];
  const done: Mission[] = [];

  for (const row of data ?? []) {
    const mission = transformMissionRow(row);
    if (!mission) continue;

    if (mission.mission_status_code === "00") scheduled.push(mission);
    else if (mission.mission_status_code === "05") in_progress.push(mission);
    else if (mission.mission_status_code === "10") done.push(mission);
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

    const startDt = scheduledStart ? new Date(scheduledStart) : null;
    const endDt = actualEnd ? new Date(actualEnd) : null;

    return {
      mission_id: row.pilot_mission_id as number,
      fk_owner_id: (planning?.fk_owner_id as number) ?? 0,
      fk_vehicle_id: (tool?.tool_id as number) ?? 0,
      fk_pic_id: row.fk_pilot_user_id as number,
      fk_status_id: row.fk_mission_status_id as number,
      fk_mission_type_id: row.fk_mission_type_id as number,
      fk_mission_category_id: row.fk_mission_category_id as number,
      fk_result_id: 0,
      fk_client_id: (client?.client_id as number) ?? 0,
      fk_mission_planning_id: (logbook?.mission_planning_id as number) ?? 0,
      mission_status_code: (status?.status_code as "00") ?? "00",
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
      mission_group_label: null,
      mission_waypoint: null,
      incident_flag: 0,
      rth_unplanned: 0,
      link_loss: 0,
      deviation_flag: 0,
    };
  } catch {
    return null;
  }
}


export async function updateMissionStatus(
  payload: UpdateMissionStatusPayload
): Promise<{ code: number; message: string; check_daily_declaration?: string }> {

  const newStatusId = payload.workflow_mission_status === "_START" ? 2 : 3;

  if (payload.workflow_mission_status === "_START") {
    const today = new Date().toISOString().split("T")[0];
    const { data: declaration } = await supabase
      .from("pilot_declaration")
      .select("declaration_id")
      .eq("fk_user_id", payload.pilot_id)
      .eq("declaration_date", today)
      .single();

    if (!declaration) {
      return { code: 0, message: "Daily declaration not found", check_daily_declaration: "N" };
    }
  }

  const { error } = await supabase
    .from("pilot_mission")
    .update({
      fk_mission_status_id: newStatusId,
      ...(payload.workflow_mission_status === "_START"
        ? { actual_start: new Date().toISOString() }
        : { actual_end: new Date().toISOString() }),
    })
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