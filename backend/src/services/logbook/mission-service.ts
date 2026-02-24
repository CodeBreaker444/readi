import { supabase } from "@/backend/database/database";
import type {
  EvaluationOption,
  FilterParams,
  MissionPlanningLogbookItem,
  PilotOption,
  PlanningOption
} from "@/config/types/logbook";

export async function getMissionPlanningLogbookList(
  params: FilterParams
): Promise<{ code: number; data: MissionPlanningLogbookItem[] }> {

  let query = supabase
    .from("planning_logbook")
    .select(
      `
      mission_planning_id,
      mission_planning_code,
      mission_planning_desc,
      mission_planning_ver,
      mission_planning_filename,
      mission_planning_active,
      fk_evaluation_id,
      fk_planning_id,
      fk_client_id,
      fk_owner_id,
      created_at,
      updated_at,
      client:client!fk_client_id (
        client_name
      ),
      evaluation:evaluation!fk_evaluation_id (
        evaluation_name
      ),
      planning:planning!fk_planning_id (
        planning_name
      )
    `
    )
    .eq("fk_owner_id", params.owner_id);

  if (params.client_id && params.client_id !== 0) {
    query = query.eq("fk_client_id", params.client_id);
  }

  if (params.evaluation_id && params.evaluation_id !== 0) {
    query = query.eq("fk_evaluation_id", params.evaluation_id);
  }

  if (params.planning_id && params.planning_id !== 0) {
    query = query.eq("fk_planning_id", params.planning_id);
  }

  if (params.user_id && params.user_id !== 0) {
    query = query.eq("fk_user_id", params.user_id);
  }

  if (params.date_start) {
    query = query.gte("updated_at", params.date_start);
  }

  if (params.date_end) {
    query = query.lte("updated_at", params.date_end + "T23:59:59");
  }

 const { data, error } = await query.order("mission_planning_id", { ascending: false });

  if (error) throw new Error(error.message);

  const planningIds = [...new Set((data || []).map((r: any) => r.fk_planning_id).filter(Boolean))];
  
  let testCountMap: Record<number, number> = {};

  if (planningIds.length > 0) {
    const { data: testData, error: testError } = await supabase
      .from("planning_test_logbook")
      .select("fk_planning_id")
      .in("fk_planning_id", planningIds);

    if (!testError && testData) {
      testCountMap = testData.reduce((acc: Record<number, number>, row: any) => {
        acc[row.fk_planning_id] = (acc[row.fk_planning_id] ?? 0) + 1;
        return acc;
      }, {});
    }
  }

  const mapped: MissionPlanningLogbookItem[] = (data || []).map((row: any) => ({
    mission_planning_id: row.mission_planning_id,
    client_name: row.client?.client_name ?? "",
    evaluation_desc: row.evaluation?.evaluation_name ?? "",
    planning_desc: row.planning?.planning_name ?? "",
    mission_planning_desc: row.mission_planning_desc ?? "",
    mission_planning_code: row.mission_planning_code ?? "",
    mission_planning_ver: row.mission_planning_ver ?? 1,
    mission_planning_filename: row.mission_planning_filename ?? "",
    mission_planning_active: row.mission_planning_active ?? "N",
    tot_test: testCountMap[row.fk_planning_id] ?? 0,
    fk_evaluation_id: row.fk_evaluation_id,
    fk_planning_id: row.fk_planning_id,
    fk_client_id: row.fk_client_id,
    fk_owner_id: row.fk_owner_id,
  }));

  return { code: 200, data: mapped };
}

export async function getClientList(
  ownerId: number
) {

  const { data, error } = await supabase
    .from("client")
    .select("client_id, client_name, client_code")
    .eq("fk_owner_id", ownerId)
    .eq("client_active", "Y")
    .order("client_name");

  if (error) {
    throw new Error(error.message);
  }

  return data;

}

export async function getPilotList(
  ownerId: number
): Promise<{ data: PilotOption[] }> {

  const { data, error } = await supabase
    .from("users")
    .select(
      `
      user_id,
      first_name,
      last_name,
      user_owner!inner (fk_owner_id)
    `
    )
    .eq("user_owner.fk_owner_id", ownerId)
    .eq("user_active", "Y");

  if (error) {
    throw new Error(error.message);
  }

  const mapped: PilotOption[] = (data || []).map((u: any) => ({
    user_id: u.user_id,
    fullname: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
    pilot_status_desc: "ACTIVE",
  }));

  return { data: mapped };
}

export async function getEvaluationList(
  ownerId: number
): Promise<{ data: EvaluationOption[] }> {

  const { data, error } = await supabase
    .from("evaluation")
    .select("evaluation_id, evaluation_name")
    .eq("fk_owner_id", ownerId)
    .eq("evaluation_active", "Y")
    .order("evaluation_name");

  if (error) {
    throw new Error(error.message);
  }

  const mapped: EvaluationOption[] = (data || []).map((e: any) => ({
    evaluation_id: e.evaluation_id,
    evaluation_desc: e.evaluation_name,
  }));

  return { data: mapped };
}

export async function getPlanningList(
  ownerId: number
): Promise<{ data: PlanningOption[] }> {

  const { data, error } = await supabase
    .from("planning")
    .select("planning_id, planning_name")
    .eq("fk_owner_id", ownerId)
    .eq("planning_active", "Y")
    .order("planning_name");

  if (error) {
    throw new Error(error.message);
  }

  const mapped: PlanningOption[] = (data || []).map((p: any) => ({
    planning_id: p.planning_id,
    planning_desc: p.planning_name,
  }));

  return { data: mapped };
}