import { supabase } from '@/backend/database/database';
import {
  ClientOption,
  DroneOption,
  MissionCategoryOption,
  MissionPlanOption,
  MissionResultOption,
  MissionStatusOption,
  MissionTypeOption,
  OperationFilterParams,
  OperationLogbookItem,
  PilotOption,
} from '@/config/types/logbook';

 
export async function getOperationLogbookList(
  params: OperationFilterParams
): Promise<{ code: number; message: string; dataRows: number; data: OperationLogbookItem[] }> {
  let query = supabase
    .from("pilot_mission")
    .select(
      `
      pilot_mission_id,
      mission_code,
      scheduled_start,
      actual_start,
      actual_end,
      flight_duration,
      distance_flown,
      notes,
      pilot:users!fk_pilot_user_id (user_id, first_name, last_name),
      tool:tool!fk_tool_id (tool_id, tool_code, tool_name),
      mission_type:pilot_mission_type!fk_mission_type_id (mission_type_id, type_name),
      mission_status:pilot_mission_status!fk_mission_status_id (status_id, status_name),
      planning:planning!fk_planning_id (
        planning_id,
        fk_client_id,
        client:client!fk_client_id (client_id, client_name),
        planning_logbook (mission_planning_id, mission_planning_code, mission_planning_desc)
      )
    `
    )
    .eq('fk_owner_id',params.owner_id)
    .eq("planning.fk_owner_id", params.owner_id);

  if (params.pic_id && params.pic_id !== 0) {
    query = query.eq("fk_pilot_user_id", params.pic_id);
  }
  if (params.vehicle_id && params.vehicle_id !== 0) {
    query = query.eq("fk_tool_id", params.vehicle_id);
  }
  if (params.mission_status_id && params.mission_status_id !== 0) {
    query = query.eq("fk_mission_status_id", params.mission_status_id);
  }
  if (params.mission_type_id && params.mission_type_id !== 0) {
    query = query.eq("fk_mission_type_id", params.mission_type_id);
  }
  if (params.date_start) {
    query = query.gte("actual_start", params.date_start);
  }
  if (params.date_end) {
    query = query.lte("actual_start", params.date_end + "T23:59:59");
  }

  const { data, error } = await query.order("actual_start", { ascending: false });
  if (error) throw new Error(error.message);

  const mapped: OperationLogbookItem[] = (data || []).map((row: any) => {
    const startDT = row.actual_start ? new Date(row.actual_start) : null;
    const endDT = row.actual_end ? new Date(row.actual_end) : null;

    return {
      mission_id: row.pilot_mission_id,
      date_start: startDT ? startDT.toISOString().split("T")[0] : "",
      date_end: endDT ? endDT.toISOString().split("T")[0] : "",
      time_start: startDT ? startDT.toTimeString().slice(0, 5) : "",
      time_end: endDT ? endDT.toTimeString().slice(0, 5) : "",
      pic_fullname: row.pilot
        ? `${row.pilot.first_name ?? ""} ${row.pilot.last_name ?? ""}`.trim()
        : "",
      client_name: row.planning?.client?.client_name ?? "",
      mission_category_desc: "",
      mission_type_desc: row.mission_type?.type_name ?? "",
      vehicle_code: row.tool?.tool_code ?? "",
      vehicle_desc: row.tool?.tool_name ?? "",
      mission_status_desc: row.mission_status?.status_name ?? "",
      mission_result_desc: "",
      fk_mission_planning_id: row.planning?.planning_logbook?.[0]?.mission_planning_id ?? 0,
      mission_planning_code: row.planning?.planning_logbook?.[0]?.mission_planning_code ?? "",
      mission_planning_desc: row.planning?.planning_logbook?.[0]?.mission_planning_desc ?? "",
      flown_time: row.flight_duration ?? 0,
      flown_meter: row.distance_flown ?? 0,
      mission_notes: row.notes ?? "",
    };
  });

  return { code: 200, message: "success", dataRows: mapped.length, data: mapped };
}


export async function getOperationLogbookFilters(owner_id: number) {
  const [pilots, clients, drones, missionTypes, missionCategories, missionResults, missionStatuses, missionPlans] =
    await Promise.all([
      supabase
        .from("users")
        .select("user_id, first_name, last_name")
        .eq("fk_owner_id", owner_id)    
        .eq("user_role", "PIC")          
        .eq("user_active", "Y"),

      supabase
        .from("client")
        .select("client_id, client_name")
        .eq("fk_owner_id", owner_id)
        .eq("client_active", "Y"),

      supabase
        .from("tool")
        .select("tool_id, tool_code, tool_name")
        .eq("fk_owner_id", owner_id)
        .eq("tool_active", "Y"),

      supabase
        .from("pilot_mission_type")
        .select("mission_type_id, type_name")
        .eq("is_active", true),

      supabase
        .from("pilot_mission_category")
        .select("category_id, category_name")
        .eq("is_active", true),

      supabase
        .from("pilot_mission_result")          
        .select("result_id, result_name")
        .eq("is_active", true),

      supabase
        .from("pilot_mission_status")
        .select("status_id, status_name")
        .eq("is_active", true),

      supabase
        .from("planning_logbook")
        .select("mission_planning_id, mission_planning_code, mission_planning_desc")
        .eq("fk_owner_id", owner_id)
        .eq("mission_planning_active", "Y"),
    ]);

  const pilotOptions: PilotOption[] = (pilots.data || []).map((u: any) => ({
    user_id: u.user_id,
    fullname: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
    pilot_status_desc: "ACTIVE",
  }));

  const clientOptions: ClientOption[] = (clients.data || []).map((c: any) => ({
    client_id: c.client_id,
    client_name: c.client_name,
  }));

  const droneOptions: DroneOption[] = (drones.data || []).map((t: any) => ({
    tool_id: t.tool_id,
    tool_code: t.tool_code,
    tool_desc: t.tool_name,
    tool_status: "OPERATIONAL",
  }));

  const typeOptions: MissionTypeOption[] = (missionTypes.data || []).map((t: any) => ({
    mission_type_id: t.mission_type_id,
    mission_type_desc: t.type_name,
  }));

  const categoryOptions: MissionCategoryOption[] = (missionCategories.data || []).map((c: any) => ({
    mission_category_id: c.category_id,
    mission_category_desc: c.category_name,
  }));

  const resultOptions: MissionResultOption[] = (missionResults.data || []).map((r: any) => ({
    mission_result_id: r.result_id,
    mission_result_desc: r.result_name,
  }));

  const statusOptions: MissionStatusOption[] = (missionStatuses.data || []).map((s: any) => ({
    mission_status_id: s.status_id,
    mission_status_desc: s.status_name,
  }));

  const planOptions: MissionPlanOption[] = (missionPlans.data || []).map((p: any) => ({
    mission_planning_id: p.mission_planning_id,
    mission_planning_code: p.mission_planning_code,
    mission_planning_desc: p.mission_planning_desc,
  }));

  return {
    code: 200,
    pilots: { data: pilotOptions },
    clients: { data: clientOptions },
    drones: { data: droneOptions },
    missionTypes: { data: typeOptions },
    missionCategories: { data: categoryOptions },
    missionResults: { data: resultOptions },
    missionStatuses: { data: statusOptions },
    missionPlans: { data: planOptions },
  };
}