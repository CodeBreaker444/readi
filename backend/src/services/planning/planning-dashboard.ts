import { supabase } from "@/backend/database/database";
import { EvaluationTask } from '@/config/types/evaluation';
import { DroneTool, FileType, MissionTemplate, PilotUser, PlanningLogbookRow, PlanningTestLogbookRow, RepositoryFile } from "@/config/types/evaluation-planning";
import { ProcedureSteps } from '@/config/types/lcuProcedures';
import { deleteFileFromS3, getPresignedDownloadUrl } from "@/lib/s3Client";

export type UpdatePlanning = {
  planning_id: number;
  fk_evaluation_id: number;
  fk_client_id?: number;
  planning_desc: string;
  planning_status: string;
  planning_request_date: string;
  planning_type: string;
};

type CreatePlanningInput = {
  fk_evaluation_id: number;
  fk_client_id?: number;
  fk_luc_procedure_id: number;
  planning_desc: string;
  planning_status:
  | "NEW"
  | "PROCESSING"
  | "REQ_FEEDBACK"
  | "POSITIVE_RESULT"
  | "NEGATIVE_RESULT";
  planning_request_date: string;
  planning_year: number;
  planning_type?: string;
  planning_folder?: string;
  planning_result?: string;
  assigned_by_user_id?: number;
  assigned_to_user_id?: number;
};


export async function addPlanningWithAssignment(
  input: CreatePlanningInput,
  userId: number,
  ownerId: number
) {
  const { data: inserted, error } = await supabase
    .from("planning")
    .insert({
      fk_owner_id: ownerId,
      created_by_user_id: userId,
      fk_client_id: input.fk_client_id ?? null,
      fk_evaluation_id: input.fk_evaluation_id,
      planning_description: input.planning_desc,
      planning_name: input.planning_desc,
      planning_status: input.planning_status,
      planning_type: input.planning_type ?? "",
      planned_date: input.planning_request_date,
      assigned_to_user_id: input.assigned_to_user_id ?? null,
    })
    .select("planning_id, created_by_user_id, assigned_to_user_id")
    .single();

  if (error) throw new Error(error.message);

  return {
    planning_id: inserted.planning_id,
    assigned_by_user_id: userId,
    assigned_to_user_id: inserted.assigned_to_user_id ?? null,
  };
}
export async function getPlanningList(ownerId: number) {
  const { data, error } = await supabase
    .from("planning")
    .select(
      `
      planning_id,
      fk_owner_id,
      fk_client_id,
      fk_evaluation_id,
      planning_code,
      planning_name,
      planning_description,
      planning_type,
      planning_status,
      planned_date,
      planning_active,
      created_at,
      updated_at,
      created_by_user_id,
      assigned_to_user_id,
      client:fk_client_id ( client_id, client_name ),
      evaluation:fk_evaluation_id (
        evaluation_id,
        evaluation_code,
        evaluation_metadata
      ),
      created_by_user:created_by_user_id ( user_id, first_name, last_name, user_role ),
      assigned_to_user:assigned_to_user_id ( user_id, first_name, last_name, user_role )
      `
    )
    .eq("fk_owner_id", ownerId)
    .order("planning_id", { ascending: false });

  if (error) throw new Error(error.message);

  const mapped = (data ?? []).map((row: any) => {
    const client = Array.isArray(row.client) ? row.client[0] : row.client;
    const evaluation = Array.isArray(row.evaluation) ? row.evaluation[0] : row.evaluation;
    const createdByUser = Array.isArray(row.created_by_user) ? row.created_by_user[0] : row.created_by_user;
    const assignedToUser = Array.isArray(row.assigned_to_user) ? row.assigned_to_user[0] : row.assigned_to_user;

    let procedureId: number | null = null;
    const evalMeta = evaluation?.evaluation_metadata;
    if (evalMeta) {
      try {
        const meta = typeof evalMeta === "string" ? JSON.parse(evalMeta) : evalMeta;
        procedureId = meta.procedure_id ?? null;
      } catch { /* ignore */ }
    }

    return {
      planning_id: row.planning_id,
      fk_owner_id: row.fk_owner_id,
      fk_client_id: client?.client_id ?? row.fk_client_id ?? null,
      fk_evaluation_id: evaluation?.evaluation_id ?? 0,
      assigned_to_user_id: row.assigned_to_user_id ?? null,
      planning_code: row.planning_code ?? "",
      planning_name: row.planning_name ?? "",
      planning_desc: row.planning_description ?? "",
      planning_status: row.planning_status ?? "",
      planning_type: row.planning_type ?? "",
      planning_request_date: row.planned_date ?? "",
      planning_year: new Date().getFullYear(),
      planning_ver: "1.0",
      planning_folder: "",
      planning_result: "PROGRESS",
      planning_active: row.planning_active ?? "Y",
      last_update: row.updated_at ?? row.created_at ?? "",
      client_name: client?.client_name ?? "",
      user_fullname: createdByUser
        ? `${createdByUser.first_name ?? ""} ${createdByUser.last_name ?? ""}`.trim()
        : "",
      user_profile_code: createdByUser?.user_role ?? "",
      pic_data: assignedToUser
        ? {
          fullname: `${assignedToUser.first_name ?? ""} ${assignedToUser.last_name ?? ""}`.trim(),
          user_profile_code: assignedToUser.user_role ?? "",
        }
        : null,
      luc_procedure_code: "",
      luc_procedure_ver: "",
      _procedure_id: procedureId,
    };
  });

  const procedureIds = [
    ...new Set(mapped.map((m: any) => m._procedure_id).filter(Boolean)),
  ] as number[];

  if (procedureIds.length > 0) {
    const { data: procedures } = await supabase
      .from("luc_procedure")
      .select("procedure_id, procedure_code, procedure_version")
      .in("procedure_id", procedureIds);

    const procMap = new Map(
      (procedures ?? []).map((p: any) => [
        p.procedure_id,
        { code: p.procedure_code ?? "", ver: p.procedure_version ?? "" },
      ])
    );

    for (const row of mapped) {
      if (row._procedure_id && procMap.has(row._procedure_id)) {
        const proc = procMap.get(row._procedure_id)!;
        row.luc_procedure_code = proc.code;
        row.luc_procedure_ver = proc.ver;
      }
    }
  }

  const cleaned = mapped.map(({ _procedure_id, ...rest }: any) => rest);
  return { data: cleaned, dataRows: cleaned.length };
}

export async function getPlanningData(ownerId: number, planningId: number) {
  const { data, error } = await supabase
    .from("planning")
    .select(
      `
      planning_id,
      fk_owner_id,
      fk_client_id,
      fk_evaluation_id,
      planning_code,
      planning_name,
      planning_description,
      planning_type,
      planning_status,
      planned_date,
      planning_active,
      assigned_to_user_id,
      created_at,
      updated_at,
      client:fk_client_id ( client_id, client_name ),
      evaluation:fk_evaluation_id ( evaluation_id, evaluation_metadata ),
      created_by_user:created_by_user_id ( user_id, first_name, last_name, user_role ),
      assigned_to_user:assigned_to_user_id ( user_id, first_name, last_name, user_role )
      `
    )
    .eq("fk_owner_id", ownerId)
    .eq("planning_id", planningId)
    .single();

  if (error) throw new Error(error.message);

  const client = Array.isArray(data.client) ? data.client[0] : data.client;
  const evaluation = Array.isArray(data.evaluation) ? data.evaluation[0] : data.evaluation;
  const assignedToUser = Array.isArray(data.assigned_to_user) ? data.assigned_to_user[0] : data.assigned_to_user;

  let lucCode = "";
  let lucVer = "";
  const evalMeta = evaluation?.evaluation_metadata;
  if (evalMeta) {
    try {
      const meta = typeof evalMeta === "string" ? JSON.parse(evalMeta) : evalMeta;
      if (meta.procedure_id) {
        const { data: proc } = await supabase
          .from("luc_procedure")
          .select("procedure_code, procedure_version")
          .eq("procedure_id", meta.procedure_id)
          .single();
        if (proc) {
          lucCode = proc.procedure_code ?? "";
          lucVer = proc.procedure_version ?? "";
        }
      }
    } catch { /* ignore */ }
  }

  return {
    planning_id: data.planning_id,
    fk_owner_id: data.fk_owner_id,
    fk_client_id: client?.client_id ?? data.fk_client_id ?? 0,
    fk_evaluation_id: evaluation?.evaluation_id ?? 0,
    assigned_to_user_id: data.assigned_to_user_id ?? null,
    planning_code: data.planning_code ?? "",
    planning_desc: data.planning_description ?? "",
    planning_status: data.planning_status ?? "",
    planning_type: data.planning_type ?? "",
    planning_request_date: data.planned_date ?? "",
    planning_active: data.planning_active ?? "Y",
    last_update: data.updated_at ?? "",
    client_name: client?.client_name ?? "",
    luc_procedure_code: lucCode,
    luc_procedure_ver: lucVer,
    pic_data: assignedToUser
      ? {
        fullname: `${assignedToUser.first_name ?? ""} ${assignedToUser.last_name ?? ""}`.trim(),
        user_profile_code: assignedToUser.user_role ?? "",
      }
      : null,
  };
}



export async function updatePlanning(payload: UpdatePlanning, ownerId: number) {
  const { planning_id, ...updates } = payload;

  const updateObj: Record<string, unknown> = {
    planning_description: updates.planning_desc,
    planning_name: updates.planning_desc,
    planning_status: updates.planning_status,
    planning_type: updates.planning_type ?? null,
    planned_date: updates.planning_request_date || null,
  };

  if (updates.fk_evaluation_id !== undefined) {
    updateObj.fk_evaluation_id = updates.fk_evaluation_id;
  }
  if (updates.fk_client_id !== undefined) {
    updateObj.fk_client_id = updates.fk_client_id;
  }

  const { data, error } = await supabase
    .from("planning")
    .update(updateObj)
    .eq("planning_id", planning_id)
    .eq("fk_owner_id", ownerId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Planning not found or access denied");
  return data;
}


export async function deletePlanning(ownerId: number, planningId: number) {
  const { data: existing } = await supabase
    .from("planning")
    .select("planning_status")
    .eq("planning_id", planningId)
    .eq("fk_owner_id", ownerId)
    .single();

  if (!existing) throw new Error("Planning not found");
  if (existing.planning_status !== "NEW") {
    throw new Error("Only planning with status NEW can be deleted");
  }

  const { error } = await supabase
    .from("planning")
    .delete()
    .eq("fk_owner_id", ownerId)
    .eq("planning_id", planningId);

  if (error) throw new Error(error.message);
  return { deleted: true };
}

export async function getPlanningLogbookList(
  ownerId: number,
  planningId: number
): Promise<PlanningLogbookRow[]> {
  const { data, error } = await supabase
    .from("planning_logbook")
    .select(
      `
      *,
      planning:fk_planning_id (planning_description),
      tool:fk_tool_id (tool_code, tool_description)
    `
    )
    .eq("fk_planning_id", planningId)
    .eq("fk_owner_id", ownerId)
    .order("mission_planning_id", { ascending: true });

  if (error) {
    console.error("getPlanningLogbookList error:", error.message);
    return [];
  }
  if (!data || data.length === 0) return [];

  const { data: testCounts } = await supabase
    .from("planning_test_logbook")
    .select("test_id")
    .eq("fk_planning_id", planningId);

  const totalTests = testCounts?.length ?? 0;

  return data.map((row: any) => ({
    mission_planning_id: row.mission_planning_id,
    fk_planning_id: row.fk_planning_id,
    fk_evaluation_id: row.fk_evaluation_id,
    fk_client_id: row.fk_client_id,
    fk_tool_id: row.fk_tool_id,
    mission_planning_code: row.mission_planning_code ?? "",
    mission_planning_desc: row.mission_planning_desc ?? "",
    mission_planning_limit_json: row.mission_planning_limit_json,
    mission_planning_active: row.mission_planning_active ?? "Y",
    mission_planning_ver: row.mission_planning_ver ?? "",
    mission_planning_filename: row.mission_planning_filename ?? "",
    mission_planning_filesize: row.mission_planning_filesize ?? 0,
    planning_desc: (row.planning as any)?.planning_description ?? "",
    tool_code: (row.tool as any)?.tool_code ?? "",
    tool_desc: (row.tool as any)?.tool_description ?? "",
    tot_test: totalTests,
  })) as PlanningLogbookRow[];
}

export async function getPlanningTestLogbookList(
  ownerId: number,
  missionPlanningId: number
): Promise<PlanningTestLogbookRow[]> {
  const { data, error } = await supabase
    .from("planning_test_logbook")
    .select("*")
    .eq("fk_planning_id", missionPlanningId)
    .order("test_id", { ascending: true });

  if (error || !data) return [];
  return data as PlanningTestLogbookRow[];
}

export async function addMissionPlanningLogbook(params: {
  fk_planning_id: number;
  fk_evaluation_id: number;
  fk_client_id: number;
  fk_owner_id: number;
  fk_user_id: number;
  mission_planning_code: string;
  mission_planning_desc: string;
  mission_planning_limit_json: Record<string, unknown> | null;
  mission_planning_active: string;
  mission_planning_ver: string;
  fk_tool_id: number | null;
  mission_planning_filename: string;
  mission_planning_filesize: number;
  mission_planning_folder: string;
  mission_planning_s3_key: string;
  mission_planning_s3_url: string;
}) {
  const { data, error } = await supabase
    .from("planning_logbook")
    .insert(params)
    .select("mission_planning_id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteMissionPlanningLogbook(
  ownerId: number,
  missionPlanningId: number
): Promise<{ deletedId: number; hadTestEntries: boolean }> {
  const { data: existing, error: fetchError } = await supabase
    .from("planning_logbook")
    .select(
      "mission_planning_id, mission_planning_code, mission_planning_folder"
    )
    .eq("mission_planning_id", missionPlanningId)
    .eq("fk_owner_id", ownerId)
    .single();

  if (fetchError || !existing) {
    throw new Error(
      "Mission planning logbook entry not found or access denied"
    );
  }

  const { data: relatedTests } = await supabase
    .from("planning_test_logbook")
    .select("test_id, mission_test_s3_key")
    .eq("fk_mission_planning_id", missionPlanningId)
    .eq("fk_owner_id", ownerId);

  const hadTestEntries = (relatedTests?.length ?? 0) > 0;

  if (hadTestEntries) {
    for (const test of relatedTests!) {
      if (test.mission_test_s3_key) {
        try {
          await deleteFileFromS3(test.mission_test_s3_key);
        } catch (s3Err) {
          console.error(
            `Failed to delete S3 file for test ${test.test_id}:`,
            s3Err
          );
        }
      }
    }

    const { error: testDeleteError } = await supabase
      .from("planning_test_logbook")
      .delete()
      .eq("fk_mission_planning_id", missionPlanningId)
      .eq("fk_owner_id", ownerId);

    if (testDeleteError) {
      throw new Error(
        `Failed to delete related test entries: ${testDeleteError.message}`
      );
    }
  }

  const { error: deleteError } = await supabase
    .from("planning_logbook")
    .delete()
    .eq("mission_planning_id", missionPlanningId)
    .eq("fk_owner_id", ownerId);

  if (deleteError) {
    throw new Error(`deleteMissionPlanningLogbook: ${deleteError.message}`);
  }

  return { deletedId: missionPlanningId, hadTestEntries };
}


export async function getRepositoryList(
  ownerId: number,
  repositoryType: string,
  planningId?: number
): Promise<RepositoryFile[]> {
  let query = supabase
    .from("repository_file")
    .select("*")
    .eq("fk_owner_id", ownerId)
    .eq("file_category", repositoryType);

  if (planningId) {
    query = query.contains("file_metadata", { planning_id: planningId });
  }

  const { data, error } = await query.order("file_id", { ascending: false });

  if (error || !data) return [];
  return data as RepositoryFile[];
}


export async function createCommunication(params: {
  fk_owner_id: number;
  client_id: number;
  planning_id: number;
  evaluation_id: number;
  pic_id: number;
}) {
  const { data, error } = await supabase
    .from("communication_general")
    .insert({
      fk_owner_id: params.fk_owner_id,
      subject: "Planning Communication",
      message: `New communication for planning ${params.planning_id}`,
      communication_type: "planning",
      status: "NEW",
      recipients: JSON.stringify({
        client_id: params.client_id,
        planning_id: params.planning_id,
        evaluation_id: params.evaluation_id,
        pic_id: params.pic_id,
      }),
    })
    .select("communication_id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getDroneToolList(
  ownerId: number,
  clientId: number,
  active: string = "ALL",
  status: string = "ALL"
): Promise<DroneTool[]> {
  let query = supabase
    .from("tool")
    .select(
      `
      *,
      tool_model:fk_model_id (model_id, model_code, model_name, manufacturer),
      tool_status:fk_status_id (status_code, status_name)
    `
    )
    .eq("fk_owner_id", ownerId);

  if (active !== "ALL") {
    query = query.eq("tool_active", active);
  }

  query = query.order("tool_id", { ascending: true });

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map((row: any) => ({
    tool_id: row.tool_id,
    tool_code: row.tool_code ?? "",
    tool_desc: row.tool_description ?? row.tool_name ?? "",
    tool_status: (row.tool_status as any)?.status_name ?? "",
    tool_active: row.tool_active ?? "N",
    fk_owner_id: row.fk_owner_id,
    fk_model_id: row.fk_model_id,
    factory_type: (row.tool_model as any)?.manufacturer ?? "",
    factory_serie: (row.tool_model as any)?.model_code ?? "",
    factory_model: (row.tool_model as any)?.model_name ?? "",
  })) as DroneTool[];
}


export async function getPilotList(ownerId: number): Promise<PilotUser[]> {
  const { data, error } = await supabase
    .from("users")
    .select(
      `
      user_id,
      first_name,
      last_name,
      email,
      user_role,
      user_active
    `
    )
    .eq("fk_owner_id", ownerId)
    .eq("user_role", "PIC")
    .order("last_name", { ascending: true });

  if (error || !data) return [];

  return data.map((row: any) => ({
    user_id: row.user_id,
    fullname: `${row.first_name} ${row.last_name}`,
    username: row.username,
    email: row.email,
    pilot_status_desc: row.user_role,
    userActive: row.user_active
  })) as PilotUser[];
}

export async function getMissionTemplateList(
  ownerId: number
): Promise<MissionTemplate[]> {
  const { data, error } = await supabase
    .from("planning_logbook")
    .select("mission_planning_id, mission_planning_code, mission_planning_desc, mission_planning_active")
    .eq("fk_owner_id", ownerId)
    .eq("mission_planning_active", "Y")
    .order("mission_planning_id", { ascending: true });

  if (error || !data) return [];
  return data as MissionTemplate[];
}

export async function getMissionTestRepositoryFiles(
  ownerId: number,
  planningId: number
) {
  const { data, error } = await supabase
    .from("planning_test_logbook")
    .select(
      `
      test_id,
      test_code,
      mission_test_filename,
      mission_test_filesize,
      mission_test_s3_key,
      mission_test_result,
      created_at
    `
    )
    .eq("fk_owner_id", ownerId)
    .eq("fk_planning_id", planningId)
    .not("mission_test_s3_key", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getMissionTestRepositoryFiles: ${error.message}`);

  const files = [];
  for (const row of data ?? []) {
    let documentUrl = "#";
    if (row.mission_test_s3_key) {
      try {
        documentUrl = await getPresignedDownloadUrl(
          row.mission_test_s3_key,
          900
        );
      } catch {
        documentUrl = "#";
      }
    }

    files.push({
      file_id: row.test_id,
      repository_filename: row.mission_test_filename ?? "",
      repository_filename_description: `Test ${row.test_code ?? ""} — ${row.mission_test_result === "success" ? "Positive" : "Negative"}`,
      repository_filesize: row.mission_test_filesize
        ? `${row.mission_test_filesize} MB`
        : "",
      document_url: documentUrl,
      last_update: row.created_at ?? "",
    });
  }

  return files;
}


export async function deleteRepositoryFile(
  fileId: number,
  fileType: FileType,
  s3Key: string | null,
  ownerId: number
) {
  if (s3Key) {
    try {
      await deleteFileFromS3(s3Key);
    } catch (err) {
      console.error(`S3 delete failed for key ${s3Key}:`, err);
    }
  }

  if (fileType === "mission_planning_logbook") {
    const { error } = await supabase
      .from("planning_logbook")
      .update({
        mission_planning_filename: null,
        mission_planning_filesize: null,
        mission_planning_folder: null,
        mission_planning_s3_key: null,
        mission_planning_s3_url: null,
      })
      .eq("mission_planning_id", fileId)
      .eq("fk_owner_id", ownerId);

    if (error) throw new Error(`Database error (logbook): ${error.message}`);
  }

  else if (fileType === "mission_planning_test_logbook") {
    const { error } = await supabase
      .from("planning_test_logbook")
      .update({
        mission_test_filename: null,
        mission_test_filesize: null,
        mission_test_s3_key: null,
      })
      .eq("test_id", fileId)
      .eq("fk_owner_id", ownerId);

    if (error) throw new Error(`Database error (test_logbook): ${error.message}`);
  }

  return { success: true };
}


export async function addCommunicationGeneral(params: {
  fk_owner_id: number;
  subject: string;
  message: string;
  communication_type: string;
  communication_level: string;
  priority: string;
  status: string;
  sent_by_user_id: number;
  recipients: number[];
  fk_client_id: number | null;
  fk_planning_id: number | null;
  fk_evaluation_id: number | null;
  communication_to: number[];
  communication_file_name: string | null;
  communication_file_key: string | null;
  communication_file_url: string | null;
}): Promise<number> {
  const { data, error } = await supabase
    .from("communication_general")
    .insert({
      fk_owner_id: params.fk_owner_id,
      subject: params.subject,
      message: params.message,
      communication_type: params.communication_type,
      communication_level: params.communication_level,
      priority: params.priority,
      status: params.status,
      sent_by_user_id: params.sent_by_user_id,
      recipients: params.recipients,
      fk_client_id: params.fk_client_id,
      fk_planning_id: params.fk_planning_id,
      fk_evaluation_id: params.fk_evaluation_id,
      communication_to: params.communication_to,
      communication_file_name: params.communication_file_name,
      communication_file_key: params.communication_file_key,
      communication_file_url: params.communication_file_url,
    })
    .select("communication_id")
    .single();

  if (error) throw new Error(error.message);
  return data.communication_id;
}

export async function getUsers(params: {
  fk_owner_id: number;
}): Promise<{ user_id: number; first_name: string; last_name: string; email: string; user_role: string; }[]> {
  const { data, error } = await supabase
    .from("users")
    .select("user_id, first_name, last_name, email, user_role")
    .eq("fk_owner_id", params.fk_owner_id)
    .eq("user_active", "Y");

  if (error) throw new Error(error.message);
  return data ?? [];
}


export async function getCommunicationsByPlanning(
  ownerId: number,
  planningId: number
) {
  const { data, error } = await supabase
    .from("communication_general")
    .select(
      `
      communication_id,
      subject,
      message,
      communication_type,
      communication_level,
      priority,
      status,
      sent_by_user_id,
      recipients,
      communication_to,
      fk_client_id,
      fk_planning_id,
      fk_evaluation_id,
      communication_file_name,
      communication_file_key,
      communication_file_url,
      sent_at,
      read_at,
      sender:sent_by_user_id ( user_id, first_name, last_name )
    `
    )
    .eq("fk_owner_id", ownerId)
    .eq("fk_planning_id", planningId)
    .order("sent_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender;
    return {
      communication_id: row.communication_id,
      subject: row.subject ?? "",
      message: row.message ?? "",
      communication_type: row.communication_type ?? "",
      communication_level: row.communication_level ?? "info",
      priority: row.priority ?? "normal",
      status: row.status ?? "sent",
      sent_by_user_id: row.sent_by_user_id,
      sender_name: sender
        ? `${sender.first_name ?? ""} ${sender.last_name ?? ""}`.trim()
        : "",
      recipients: row.recipients ?? [],
      communication_to: row.communication_to ?? [],
      fk_client_id: row.fk_client_id,
      fk_planning_id: row.fk_planning_id,
      fk_evaluation_id: row.fk_evaluation_id,
      communication_file_name: row.communication_file_name,
      communication_file_key: row.communication_file_key,
      communication_file_url: row.communication_file_url,
      sent_at: row.sent_at ?? "",
      read_at: row.read_at ?? null,
    };
  });
}


export async function getChecklistList(
  ownerId: number
): Promise<{ checklist_id: number; checklist_code: string; checklist_desc: string }[]> {
  const { data, error } = await supabase
    .from("checklist")
    .select("checklist_id, checklist_code, checklist_desc")
    .eq("fk_owner_id", ownerId)
    .eq("checklist_active", "Y")
    .order("checklist_code", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    checklist_id: row.checklist_id,
    checklist_code: row.checklist_code ?? "",
    checklist_desc: row.checklist_desc ?? "",
  }));
}


export async function addChecklistTaskToPlanning(
  ownerId: number,
  planningId: number,
  checklistId: number,
  taskTitle: string,
  taskDescription: string
) {
  const { data: planning, error: fetchErr } = await supabase
    .from("planning")
    .select("planning_id, planning_json")
    .eq("fk_owner_id", ownerId)
    .eq("planning_id", planningId)
    .single();

  if (fetchErr) throw new Error(fetchErr.message);

  let planningJson: any;
  const raw = (planning as any)?.planning_json;
  if (raw) {
    try {
      planningJson = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      planningJson = { tasks: [] };
    }
  } else {
    planningJson = { tasks: [] };
  }

  if (!Array.isArray(planningJson.tasks)) {
    planningJson.tasks = [];
  }

  const { data: checklist, error: clErr } = await supabase
    .from("checklist")
    .select("checklist_id, checklist_code, checklist_desc")
    .eq("checklist_id", checklistId)
    .eq("fk_owner_id", ownerId)
    .single();

  if (clErr) throw new Error(`Checklist not found: ${clErr.message}`);

  const existingIds = planningJson.tasks
    .map((t: any) => Number(t?.task_id ?? t?.id ?? 0))
    .filter((n: number) => !isNaN(n));
  const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

  const newTask = {
    task_id: nextId,
    title: taskTitle,
    task_title: taskTitle,
    name: taskTitle,
    description: taskDescription,
    task_completed: false,
    completed: false,
    checklist: [
      {
        checklist_id: checklist.checklist_id,
        checklist_code: checklist.checklist_code ?? "",
        checklist_name: checklist.checklist_desc ?? "",
        checklist_completed: false,
        completed: false,
      },
    ],
  };

  planningJson.tasks.push(newTask);

  const { error: updateErr } = await supabase
    .from("planning")
    .update({ planning_json: planningJson })
    .eq("planning_id", planningId)
    .eq("fk_owner_id", ownerId);

  if (updateErr) throw new Error(updateErr.message);

  return { task_id: nextId, checklist_id: checklistId };
}




export async function movePlanningToTesting(
  ownerId: number,
  planningId: number
) {
  const { data: existing, error: fetchErr } = await supabase
    .from("planning")
    .select("planning_id, planning_status")
    .eq("fk_owner_id", ownerId)
    .eq("planning_id", planningId)
    .single();

  if (fetchErr || !existing) {
    throw new Error("Planning not found or access denied");
  }

  if (existing.planning_status === "TESTING") {
    throw new Error("Planning is already in TESTING status");
  }

  const { error } = await supabase
    .from("planning")
    .update({ planning_status: "TESTING" })
    .eq("planning_id", planningId)
    .eq("fk_owner_id", ownerId);

  if (error) throw new Error(error.message);
  return { moved: true, planning_id: planningId };
}



async function fetchChecklistJsonMap(
  ownerId: number,
  codes: string[],
): Promise<Map<string, object>> {
  const map = new Map<string, object>();
  if (codes.length === 0) return map;

  const { data, error } = await supabase
    .from('checklist')
    .select('checklist_code, checklist_json')
    .eq('fk_owner_id', ownerId)
    .in('checklist_code', codes);

  if (error) return map;

  for (const row of data ?? []) {
    if (!row.checklist_code) continue;
    const json =
      typeof row.checklist_json === 'string'
        ? JSON.parse(row.checklist_json)
        : row.checklist_json;
    if (json) map.set(row.checklist_code, json);
  }

  return map;
}

type StoredTask = Omit<EvaluationTask, 'checklist_json'>;

export async function getPlanningTasks(
  ownerId: number,
  planningId: number,
): Promise<{ tasks: EvaluationTask[]; allCompleted: boolean }> {
  const { data: planningBase, error: planningErr } = await supabase
    .from('planning')
    .select('planning_id, fk_evaluation_id')
    .eq('planning_id', planningId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (planningErr) throw new Error(`getPlanningTasks (base): ${planningErr.message}`);
  if (!planningBase) throw new Error('Planning not found or access denied');

  const { data: planningJsonRow, error: jsonErr } = await supabase
    .from('planning')
    .select('planning_json')
    .eq('planning_id', planningId)
    .eq('fk_owner_id', ownerId)
    .single();

  let planningJson: Record<string, any> = {};
  if (!jsonErr && planningJsonRow) {
    const raw = (planningJsonRow as any).planning_json;
    if (raw) {
      planningJson = typeof raw === 'string' ? JSON.parse(raw) : raw;
    }
  } else if (jsonErr) {
    console.warn('[getPlanningTasks] planning_json fetch error:', jsonErr.message);
  }

  if (Array.isArray(planningJson.procedure_tasks) && planningJson.procedure_tasks.length > 0) {
    const stored = planningJson.procedure_tasks as StoredTask[];
    const checklistCodes = stored
      .filter((t) => t.task_type === 'checklist')
      .map((t) => t.task_code);
    const checklistJsonMap = await fetchChecklistJsonMap(ownerId, checklistCodes);

    const tasks: EvaluationTask[] = stored.map((t) => ({
      ...t,
      checklist_json: t.task_type === 'checklist' ? (checklistJsonMap.get(t.task_code) ?? null) : null,
    }));

    const allCompleted =
      tasks.length > 0 &&
      tasks.every((t) => t.task_status === 'completed' || t.task_status === 'skipped');

    return { tasks, allCompleted };
  }

  const evaluationId = (planningBase as any).fk_evaluation_id as number | null;
  if (!evaluationId) return { tasks: [], allCompleted: false };

  const { data: evaluation } = await supabase
    .from('evaluation')
    .select('fk_luc_procedure_id, evaluation_metadata')
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId)
    .single();

  let procedureId: number | null = (evaluation as any)?.fk_luc_procedure_id ?? null;
  if (!procedureId && evaluation?.evaluation_metadata) {
    const meta =
      typeof evaluation.evaluation_metadata === 'string'
        ? JSON.parse(evaluation.evaluation_metadata)
        : evaluation.evaluation_metadata;
    procedureId = meta?.procedure_id ?? null;
  }

  if (!procedureId) return { tasks: [], allCompleted: false };

  const { data: procData } = await supabase
    .from('luc_procedure')
    .select('procedure_steps')
    .eq('procedure_id', procedureId)
    .single();

  const steps = procData?.procedure_steps as ProcedureSteps | null;

  if (!steps?.tasks || !Array.isArray(steps.tasks) || (steps.tasks as any[]).length === 0) {
    return { tasks: [], allCompleted: false };
  }

  const newTasks: StoredTask[] = [];
  let order = 1;
  let taskId = 1;

  for (const procTask of steps.tasks as any[]) {
    if (Array.isArray(procTask.checklist)) {
      for (const cl of procTask.checklist) {
        newTasks.push({
          task_id: taskId++,
          task_code: cl.checklist_code || `CL_${order}`,
          task_name: cl.checklist_name || procTask.title || 'Checklist item',
          task_type: 'checklist',
          task_status: 'pending',
          task_order: order++,
        });
      }
    }

    if (Array.isArray(procTask.assignment)) {
      for (const asg of procTask.assignment) {
        newTasks.push({
          task_id: taskId++,
          task_code: asg.assignment_code || `ASG_${order}`,
          task_name: asg.assignment_name || procTask.title || 'Assignment item',
          task_type: 'assignment',
          task_status: 'pending',
          task_order: order++,
        });
      }
    }

    if (Array.isArray(procTask.communication)) {
      for (const comm of procTask.communication) {
        newTasks.push({
          task_id: taskId++,
          task_code: comm.communication_code || `COMM_${order}`,
          task_name: comm.communication_name || procTask.title || 'Communication item',
          task_type: 'communication',
          task_status: 'pending',
          task_order: order++,
        });
      }
    }
  }

  if (newTasks.length === 0) return { tasks: [], allCompleted: false };

  planningJson.procedure_tasks = newTasks;

  await supabase
    .from('planning')
    .update({ planning_json: planningJson })
    .eq('planning_id', planningId)
    .eq('fk_owner_id', ownerId);

  const checklistCodes = newTasks.filter((t) => t.task_type === 'checklist').map((t) => t.task_code);
  const checklistJsonMap = await fetchChecklistJsonMap(ownerId, checklistCodes);

  const tasks: EvaluationTask[] = newTasks.map((t) => ({
    ...t,
    checklist_json: t.task_type === 'checklist' ? (checklistJsonMap.get(t.task_code) ?? null) : null,
  }));

  return { tasks, allCompleted: false };
}

export async function updatePlanningTask(
  ownerId: number,
  planningId: number,
  taskId: number,
  newStatus: 'pending' | 'in_progress' | 'completed' | 'skipped',
): Promise<{ success: boolean; message?: string }> {
  const { data: planningBase, error: baseErr } = await supabase
    .from('planning')
    .select('planning_id')
    .eq('planning_id', planningId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (baseErr) return { success: false, message: `updatePlanningTask (base): ${baseErr.message}` };
  if (!planningBase) return { success: false, message: 'Planning not found or access denied' };

  const { data: jsonRow, error: jsonErr } = await supabase
    .from('planning')
    .select('planning_json')
    .eq('planning_id', planningId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (jsonErr) return { success: false, message: `updatePlanningTask (read json): ${jsonErr.message}` };

  let planningJson: Record<string, any> = {};
  const raw = (jsonRow as any)?.planning_json;
  if (raw) {
    planningJson = typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  if (!Array.isArray(planningJson.procedure_tasks)) {
    return { success: false, message: 'Planning tasks not initialised — fetch tasks first' };
  }

  const idx = (planningJson.procedure_tasks as StoredTask[]).findIndex((t) => t.task_id === taskId);
  if (idx === -1) return { success: false, message: `Task ${taskId} not found` };

  planningJson.procedure_tasks[idx].task_status = newStatus;

  const { error: updateErr } = await supabase
    .from('planning')
    .update({ planning_json: planningJson })
    .eq('planning_id', planningId)
    .eq('fk_owner_id', ownerId);

  if (updateErr) return { success: false, message: `updatePlanningTask (update): ${updateErr.message}` };

  return { success: true };
}
