import { supabase } from "@/backend/database/database";
 
import type {
    MissionTestCreateInput,
    MissionTestRow,
    PilotUser,
} from "@/config/types/evaluation-planning";
import { deleteFileFromS3, getPresignedDownloadUrl } from "@/lib/s3Client";


function formatUserName(user: unknown): string {
  if (!user || typeof user !== "object") return "—";
  const u = user as {
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  if (u.first_name || u.last_name) {
    return `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  }
  return u.username ?? "—";
}

 
export function buildMissionTestS3Key(
  ownerId: number,
  evaluationId: number,
  planningId: number,
  missionPlanningId: number,
  originalName: string
): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `mission_tests/${ownerId}/${evaluationId}/${planningId}/${missionPlanningId}/${Date.now()}_${safe}`;
}

 
export async function getMissionTestLogbookList(
  ownerId: number,
  missionPlanningId: number
): Promise<MissionTestRow[]> {
  const { data, error } = await supabase
    .from("planning_test_logbook")
    .select(
      `
      test_id,
      fk_planning_id,
      fk_owner_id,
      fk_mission_planning_id,
      fk_evaluation_id,
      fk_pic_id,
      fk_observer_id,
      fk_user_id,
      test_code,
      test_description,
      test_date,
      test_status,
      test_results,
      tested_by_user_id,
      test_notes,
      mission_test_date_start,
      mission_test_date_end,
      mission_test_result,
      mission_test_folder,
      mission_test_filename,
      mission_test_filesize,
      mission_test_s3_key,
      created_at,
      pic:fk_pic_id ( username, first_name, last_name ),
      observer:fk_observer_id ( username, first_name, last_name )
    `
    )
    .eq("fk_owner_id", ownerId)
    .eq("fk_mission_planning_id", missionPlanningId)
    .order("test_id", { ascending: false });

  if (error) throw new Error(`getMissionTestLogbookList: ${error.message}`);

  const rows = (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as MissionTestRow),
    pic_name: formatUserName(row.pic),
    observer_name: formatUserName(row.observer),
  }));

  for (const row of rows) {
    if (row.mission_test_s3_key) {
      try {
        row.document_url = await getPresignedDownloadUrl(
          row.mission_test_s3_key,
          900
        );
      } catch {
        row.document_url = undefined;
      }
    }
  }

  return rows;
}

 
export async function addMissionTestLogbook(
  ownerId: number,
  userId: number,
  input: MissionTestCreateInput,
  fileData?: {
    s3Key: string;
    s3Url: string;
    filename: string;
    filesize: number;
  }
): Promise<MissionTestRow> {
  if (input.fk_pic_id === input.fk_observer_id) {
    throw new Error("Pilot in Command and Observer must be different users");
  }

  const insertPayload: Record<string, unknown> = {
    fk_planning_id: input.fk_planning_id,
    test_code: input.mission_test_code,
    test_date: input.mission_test_date_start,
    test_status: input.mission_test_result === "success" ? "PASS" : "FAIL",
    tested_by_user_id: input.fk_pic_id,
    test_results: {
      result: input.mission_test_result,
      pic_id: input.fk_pic_id,
      observer_id: input.fk_observer_id,
      date_start: input.mission_test_date_start,
      date_end: input.mission_test_date_end,
    },

    fk_owner_id: ownerId,
    fk_mission_planning_id: input.fk_mission_planning_id,
    fk_evaluation_id: input.fk_evaluation_id,
    fk_pic_id: input.fk_pic_id,
    fk_observer_id: input.fk_observer_id,
    fk_user_id: userId,
    mission_test_date_start: input.mission_test_date_start,
    mission_test_date_end: input.mission_test_date_end,
    mission_test_result: input.mission_test_result,
  };

  if (fileData) {
    insertPayload.mission_test_s3_key = fileData.s3Key;
    insertPayload.mission_test_s3_url = fileData.s3Url;
    insertPayload.mission_test_filename = fileData.filename;
    insertPayload.mission_test_filesize = fileData.filesize;
    insertPayload.mission_test_folder = fileData.s3Key;
  }

  const { data, error } = await supabase
    .from("planning_test_logbook")
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw new Error(`addMissionTestLogbook: ${error.message}`);
  return data as MissionTestRow;
}

 
export async function deleteMissionTestLogbook(
  ownerId: number,
  testId: number
): Promise<void> {
  const { data: existing } = await supabase
    .from("planning_test_logbook")
    .select("mission_test_s3_key")
    .eq("test_id", testId)
    .eq("fk_owner_id", ownerId)
    .single();

  const { error } = await supabase
    .from("planning_test_logbook")
    .delete()
    .eq("test_id", testId)
    .eq("fk_owner_id", ownerId);

  if (error) throw new Error(`deleteMissionTestLogbook: ${error.message}`);

  if (existing?.mission_test_s3_key) {
    try {
      await deleteFileFromS3(existing.mission_test_s3_key);
    } catch (s3Err) {
      console.error("Failed to delete S3 file:", s3Err);
    }
  }
}
 
export async function updateMissionPlanningActiveStatus(
  ownerId: number,
  missionPlanningId: number,
  status: "Y" | "N",
  userId: number
): Promise<void> {
  const { error } = await supabase
    .from("planning_logbook")
    .update({
      mission_planning_active: status,
      updated_at: new Date().toISOString(),
    })
    .eq("mission_planning_id", missionPlanningId)
    .eq("fk_owner_id", ownerId);

  if (error)
    throw new Error(`updateMissionPlanningActiveStatus: ${error.message}`);
}

 
export async function getPilotUsers(ownerId: number): Promise<PilotUser[]> {
  const { data, error } = await supabase
    .from("users")
    .select(`user_id, username, first_name, last_name`)
    .eq("user_active", "Y")
    .eq("fk_owner_id", ownerId)
    .eq("user_role", "PIC")
    .order("first_name", { ascending: true });

  if (error) {
    throw new Error(`getPilotUsers: ${error.message}`);
  }

  return (data ?? []) as PilotUser[];
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
    // Clean up S3 files from related tests
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