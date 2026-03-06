import { supabase } from "@/backend/database/database";
import { DroneTool, FileType, MissionTemplate, PilotUser, PlanningLogbookRow, PlanningTestLogbookRow, RepositoryFile } from "@/config/types/evaluation-planning";
import { deleteFileFromS3, getPresignedDownloadUrl } from "@/lib/s3Client";


type CreatePlanning = {
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
  planning_ver?: string;
  planning_folder?: string;
  planning_result: string;
};

export type UpdatePlanning = {
 planning_id: number;
  fk_evaluation_id: number;
  fk_client_id?: number;
  planning_desc: string;
  planning_status: string;
  planning_request_date: string;
  planning_type: string;
};


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
      client:fk_client_id ( client_id, client_name ),
      evaluation:fk_evaluation_id (
        evaluation_id,
        evaluation_code,
        evaluation_metadata
      ),
      user:created_by_user_id ( user_id, first_name, last_name, user_role )
    `
    )
    .eq("fk_owner_id", ownerId)
    .order("planning_id", { ascending: false });

  if (error) throw new Error(error.message);

  const mapped = (data ?? []).map((row: any) => {
    let procedureId: number | null = null;
    const evalMeta = row.evaluation?.evaluation_metadata;
    if (evalMeta) {
      try {
        const meta =
          typeof evalMeta === "string" ? JSON.parse(evalMeta) : evalMeta;
        procedureId = meta.procedure_id ?? null;
      } catch {
        // ignore parse errors
      }
    }

    return {
      planning_id: row.planning_id,
      fk_owner_id: row.fk_owner_id,
      fk_client_id: row.client?.client_id ?? row.fk_client_id ?? null,
      fk_evaluation_id: row.evaluation?.evaluation_id ?? 0,
      fk_user_id: row.user?.user_id ?? 0,
      fk_pic_id: row.user?.user_id ?? 0,
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
      client_name: row.client?.client_name ?? "",
      user_fullname: row.user
        ? `${row.user.first_name ?? ""} ${row.user.last_name ?? ""}`.trim()
        : "",
      user_profile_code: row.user?.user_role ?? "",
      luc_procedure_code: "",
      luc_procedure_ver: "",
      _procedure_id: procedureId,
      pic_data: {
        fullname: row.user
          ? `${row.user.first_name ?? ""} ${row.user.last_name ?? ""}`.trim()
          : "",
        user_profile_code: row.user?.user_role ?? "",
      },
    };
  });

  const procedureIds = [
    ...new Set(
      mapped.map((m: any) => m._procedure_id).filter(Boolean)
    ),
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
      created_at,
      updated_at,
      client:fk_client_id ( client_id, client_name ),
      evaluation:fk_evaluation_id ( evaluation_id, evaluation_metadata ),
      user:created_by_user_id ( user_id, first_name, last_name, user_role )
    `
    )
    .eq("fk_owner_id", ownerId)
    .eq("planning_id", planningId)
    .single();

  if (error) throw new Error(error.message);

  const client = Array.isArray(data.client) ? data.client[0] : data.client;
  const evaluation = Array.isArray(data.evaluation) ? data.evaluation[0] : data.evaluation;

  let lucCode = "";
  let lucVer = "";
  const evalMeta = evaluation?.evaluation_metadata;
  if (evalMeta) {
    try {
      const meta =
        typeof evalMeta === "string" ? JSON.parse(evalMeta) : evalMeta;
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
    } catch {
      // ignore
    }
  }

return {
    planning_id: data.planning_id,
    fk_owner_id: data.fk_owner_id,
    fk_client_id: client?.client_id ?? data.fk_client_id ?? 0,
    fk_evaluation_id: evaluation?.evaluation_id ?? 0,
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
  };
}

export async function addPlanning(
  input: CreatePlanning,
  userId: number,
  ownerId: number
) {
  const { data: inserted, error } = await supabase
    .from("planning")
    .insert({
      fk_owner_id: ownerId,
      created_by_user_id: userId,
      fk_client_id: input.fk_client_id,
      fk_evaluation_id: input.fk_evaluation_id,
      planning_description: input.planning_desc,
      planning_name: input.planning_desc,
      planning_status: input.planning_status,
      planning_type: input.planning_type ?? "",
      planned_date: input.planning_request_date,
    })
    .select("planning_id")
    .single();

  if (error) throw new Error(error.message);
  return inserted;
}

export async function updatePlanning(payload: UpdatePlanning) {
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
    .select()
    .single();

  if (error) throw new Error(error.message);
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

 

export async function movePlanningToTesting(
  ownerId: number,
  planningId: number
) {
  const { error } = await supabase
    .from("planning")
    .update({ planning_status: "TESTING" })
    .eq("planning_id", planningId)
    .eq("fk_owner_id", ownerId);

  if (error) throw new Error(error.message);
  return { moved: true };
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