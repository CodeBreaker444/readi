import { supabase } from "@/backend/database/database";
import { Client, CreateEvaluationInput, Evaluation, EvaluationFile, LucProcedure, UpdateEvaluationInput } from "@/config/types/evaluation";
import { deleteFileFromS3 } from "@/lib/s3Client";

/**
 * Fetch all evaluations for an owner, joining client, user and luc_procedure.
 */
export async function getEvaluationList(ownerId: number): Promise<Evaluation[]> {
  const { data, error } = await supabase
    .from('evaluation')
    .select(`
      evaluation_id,
      fk_owner_id,
      fk_client_id,
      fk_luc_procedure_id,
      evaluation_status,
      evaluation_result,
      evaluation_request_date,
      evaluation_year,
      evaluation_desc,
      evaluation_offer,
      evaluation_sale_manager,
      evaluation_folder,
      evaluation_json,
      evaluation_polygon,
      data_create,
      last_update,
      client:client_id ( client_name, client_code ),
      luc_procedure:luc_procedure_id ( luc_procedure_code, luc_procedure_ver ),
      users:fk_user_id ( user_name:username, user_profile_code )
    `)
    .eq('fk_owner_id', ownerId)
    .order('evaluation_id', { ascending: false });

  if (error) throw new Error(`getEvaluationList: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    client_name: (row.client as { client_name?: string } | null)?.client_name ?? '',
    luc_procedure_code: (row.luc_procedure as { luc_procedure_code?: string } | null)?.luc_procedure_code ?? '',
    luc_procedure_ver: (row.luc_procedure as { luc_procedure_ver?: string } | null)?.luc_procedure_ver ?? '',
    user_name: (row.users as { user_name?: string } | null)?.user_name ?? '',
    user_profile_code: (row.users as { user_profile_code?: string } | null)?.user_profile_code ?? '',
  })) as Evaluation[];
}

/**
 * Fetch a single evaluation by id.
 */
export async function getEvaluationById(
  evaluationId: number,
  ownerId: number,
): Promise<Evaluation | null> {
  const { data, error } = await supabase
    .from('evaluation')
    .select(`
      *,
      client:client_id ( client_name, client_code ),
      luc_procedure:luc_procedure_id ( luc_procedure_code, luc_procedure_ver ),
      users:fk_user_id ( user_name:username, user_profile_code )
    `)
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new Error(`getEvaluationById: ${error.message}`);
  }

  if (!data) return null;

  return {
    ...data,
    client_name: (data.client as { client_name?: string } | null)?.client_name ?? '',
    luc_procedure_code: (data.luc_procedure as { luc_procedure_code?: string } | null)?.luc_procedure_code ?? '',
    luc_procedure_ver: (data.luc_procedure as { luc_procedure_ver?: string } | null)?.luc_procedure_ver ?? '',
    user_name: (data.users as { user_name?: string } | null)?.user_name ?? '',
    user_profile_code: (data.users as { user_profile_code?: string } | null)?.user_profile_code ?? '',
  } as Evaluation;
}

/**
 * Insert a new evaluation record.
 */
export async function createEvaluation(
  input: CreateEvaluationInput,
  ownerId: number,
  userId: number,
): Promise<Evaluation> {
  const now = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('evaluation')
    .insert({
      fk_owner_id: ownerId,
      fk_client_id: input.fk_client_id,
      fk_luc_procedure_id: input.fk_luc_procedure_id,
      evaluation_status: input.evaluation_status,
      evaluation_result: input.evaluation_result,
      evaluation_request_date: input.evaluation_request_date,
      evaluation_year: input.evaluation_year,
      evaluation_desc: input.evaluation_desc ?? '',
      evaluation_offer: input.evaluation_offer ?? '',
      evaluation_sale_manager: input.evaluation_sale_manager ?? '',
      evaluation_folder: '',
      fk_user_id: userId,
      data_create: now,
      last_update: now,
    })
    .select()
    .single();

  if (error) throw new Error(`createEvaluation: ${error.message}`);
  return data as Evaluation;
}

/**
 * Update an existing evaluation.
 */
export async function updateEvaluation(
  input: UpdateEvaluationInput,
): Promise<Evaluation> {
  const { data, error } = await supabase
    .from('evaluation')
    .update({
      fk_client_id: input.fk_client_id,
      fk_luc_procedure_id: input.fk_luc_procedure_id,
      evaluation_status: input.evaluation_status,
      evaluation_result: input.evaluation_result,
      evaluation_request_date: input.evaluation_request_date,
      evaluation_year: input.evaluation_year,
      evaluation_desc: input.evaluation_desc ?? '',
      evaluation_offer: input.evaluation_offer ?? '',
      evaluation_sale_manager: input.evaluation_sale_manager ?? '',
      evaluation_folder: input.evaluation_folder ?? '',
      fk_evaluation_code: input.fk_evaluation_code,
      last_update: new Date().toISOString().split('T')[0],
    })
    .eq('evaluation_id', input.evaluation_id)
    .eq('fk_owner_id', input.fk_owner_id)
    .select()
    .single();

  if (error) throw new Error(`updateEvaluation: ${error.message}`);
  return data as Evaluation;
}

/**
 * Delete an evaluation (only allowed when status = 'NEW').
 */
export async function deleteEvaluation(
  evaluationId: number,
  ownerId: number
): Promise<void> {
  const { data: existing } = await supabase
    .from('evaluation')
    .select('evaluation_status')
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (!existing) throw new Error('Evaluation not found');
  if (existing.evaluation_status !== 'NEW') {
    throw new Error('Only evaluations with status NEW can be deleted');
  }

  const { error } = await supabase
    .from('evaluation')
    .delete()
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId);

  if (error) throw new Error(`deleteEvaluation: ${error.message}`);
}


export async function getEvaluationFiles(
  evaluationId: number,
  ownerId: number,
): Promise<EvaluationFile[]> {
  const { data, error } = await supabase
    .from('evaluation_file')
    .select('*')
    .eq('fk_evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId)
    .order('evaluation_file_id', { ascending: false });

  if (error) throw new Error(`getEvaluationFiles: ${error.message}`);
  return (data ?? []) as EvaluationFile[];
}

export async function addEvaluationFile(payload: {
  fk_owner_id: number;
  fk_user_id: number;
  fk_client_id: number;
  fk_evaluation_id: number;
  evaluation_file_desc: string;
  evaluation_file_folder: string;
  evaluation_file_filename: string;
  evaluation_file_filesize: number;
  evaluation_file_ver: string;
}): Promise<EvaluationFile> {
  const { data, error } = await supabase
    .from('evaluation_file')
    .insert({ ...payload, last_update: new Date().toISOString() })
    .select()
    .single();

  if (error) throw new Error(`addEvaluationFile: ${error.message}`);
  return data as EvaluationFile;
}

export async function deleteEvaluationFile(
  fileId: number,
  ownerId: number,
): Promise<{ file_folder: string }> {
  const { data: existing } = await supabase
    .from('evaluation_file')
    .select('evaluation_file_folder')
    .eq('evaluation_file_id', fileId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (!existing) throw new Error('File not found');

  const { error } = await supabase
    .from('evaluation_file')
    .delete()
    .eq('evaluation_file_id', fileId)
    .eq('fk_owner_id', ownerId);

  if (error) throw new Error(`deleteEvaluationFile: ${error.message}`);
  return { file_folder: existing.evaluation_file_folder };
}


export async function getClientList(ownerId: number): Promise<Client[]> {
  const { data, error } = await supabase
    .from('client')
    .select('client_id, client_name, client_code')
    .eq('fk_owner_id', ownerId)
    .eq('client_active', 'Y')
    .order('client_name');

  if (error) throw new Error(`getClientList: ${error.message}`);
  return (data ?? []) as Client[];
}

export async function getLucProcedureList(
  ownerId: number,
  sector?: string,
): Promise<LucProcedure[]> {
  let query = supabase
    .from('luc_procedure')
    .select('procedure_id, procedure_code, procedure_name, procedure_version, procedure_status')
    .eq('fk_owner_id', ownerId)
    .eq('procedure_active', 'Y')
    .order('procedure_code');

  if (sector) {
    query = query.eq('procedure_status', sector);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getLucProcedureList: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    luc_procedure_id: row.procedure_id as number,
    luc_procedure_desc: row.procedure_name as string,
    luc_procedure_code: row.procedure_code as string,
    luc_procedure_ver: row.procedure_version as string ?? '1.0',
    luc_procedure_sector: row.procedure_status as string ?? '',
  }));
}


export async function deleteLogbookFile(
  missionPlanningId: number,
  s3Key: string
) {
  if (s3Key) {
    try {
      await deleteFileFromS3(s3Key);
    } catch (err) {
      console.error("S3 delete failed:", err);
    }
  }

  const { error } = await supabase
    .from("planning_logbook")
    .update({
      mission_planning_filename: null,
      mission_planning_filesize: null,
      mission_planning_folder: null,
      mission_planning_s3_key: null,
      mission_planning_s3_url: null,
    })
    .eq("mission_planning_id", missionPlanningId);

  if (error) throw new Error(error.message);
  return { success: true };
}