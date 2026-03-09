import { supabase } from '@/backend/database/database';
 
import { Evaluation, EvaluationFile, EvaluationTask } from '@/config/types/evaluation';
import { deleteFileFromS3, getPresignedDownloadUrl, uploadFileToS3 } from '@/lib/s3Client';

 
function normalisePolygonData(raw: any): { type: string; features: any[] } | null {
  if (!raw) return null;

  if (raw.type === 'FeatureCollection' && Array.isArray(raw.features)) {
    return raw.features.length > 0 ? raw : null;
  }
  if (raw.type === 'Feature' && raw.geometry) {
    return { type: 'FeatureCollection', features: [raw] };
  }
  if (raw.type === 'Polygon' || raw.type === 'MultiPolygon') {
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: raw }],
    };
  }
  if (Array.isArray(raw)) {
    const features = raw
      .map((item: any) => {
        if (item.type === 'Feature') return item;
        if (item.type === 'Polygon' || item.type === 'MultiPolygon') {
          return { type: 'Feature', properties: {}, geometry: item };
        }
        return null;
      })
      .filter(Boolean);
    return features.length > 0 ? { type: 'FeatureCollection', features } : null;
  }
  return null;
}

 
export async function getEvaluationById(
  ownerId: number,
  evaluationId: number,
): Promise<Evaluation> {
  const { data, error } = await supabase
    .from('evaluation')
    .select(`
      *,
      client:fk_client_id ( client_name ),
      luc_procedure:fk_luc_procedure_id ( procedure_code, procedure_version )
    `)
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (error) throw new Error(`getEvaluationById: ${error.message}`);
  if (!data) throw new Error('Evaluation not found');

  const metadata =
    typeof data.evaluation_metadata === 'string'
      ? JSON.parse(data.evaluation_metadata)
      : data.evaluation_metadata ?? {};

  let procedureCode = data.luc_procedure?.procedure_code ?? '';
  let procedureVersion = data.luc_procedure?.procedure_version ?? '';

  if (!procedureCode && metadata.procedure_id) {
    const { data: procData } = await supabase
      .from('luc_procedure')
      .select('procedure_code, procedure_version')
      .eq('procedure_id', metadata.procedure_id)
      .single();

    if (procData) {
      procedureCode = procData.procedure_code ?? '';
      procedureVersion = procData.procedure_version ?? '';
    }
  }

  const polygonData = normalisePolygonData(metadata.polygon);

  return {
    ...data,
    client_name: data.client?.client_name ?? '',
    luc_procedure_code: procedureCode,
    luc_procedure_ver: procedureVersion,
    polygon_data: polygonData,
    area_sqm: metadata.area_sqm ?? 0,
    evaluation_offer: metadata.offer ?? '',
    evaluation_sale_manager: metadata.sale_manager ?? '',
    evaluation_result: data.evaluation_result ?? 'PROCESSING',
    evaluation_year: data.evaluation_year ?? metadata.year ?? null,
    evaluation_desc: data.evaluation_description ?? '',
    evaluation_request_date: data.scheduled_date ?? '',
    last_update: data.updated_at ?? '',
  } as Evaluation;
}

 
export interface EvaluationUpdateInput {
  evaluation_id: number;
  fk_owner_id: number;
  fk_client_id: number;
  fk_evaluation_code?: string;
  evaluation_request_date?: string;
  evaluation_year?: number;
  evaluation_desc?: string;
  evaluation_offer?: string;
  evaluation_sale_manager?: string;
  evaluation_status?: string;
  evaluation_result?: string;
  evaluation_folder?: string;
}

export async function updateEvaluation(
  payload: EvaluationUpdateInput,
): Promise<{ success: boolean; message: string; data?: Evaluation }> {
  const {
    evaluation_id,
    fk_owner_id,
    fk_client_id,
    fk_evaluation_code,
    evaluation_request_date,
    evaluation_year,
    evaluation_desc,
    evaluation_status,
    evaluation_result,
    evaluation_offer,
    evaluation_sale_manager,
  } = payload;

  const updateData: Record<string, any> = { fk_client_id };

  if (fk_evaluation_code !== undefined) updateData.evaluation_code = fk_evaluation_code;
  if (evaluation_request_date !== undefined) updateData.scheduled_date = evaluation_request_date;
  if (evaluation_year !== undefined) updateData.evaluation_year = evaluation_year;
  if (evaluation_desc !== undefined) updateData.evaluation_description = evaluation_desc;
  if (evaluation_status !== undefined) updateData.evaluation_status = evaluation_status;
  if (evaluation_result !== undefined) updateData.evaluation_result = evaluation_result;

  if (evaluation_offer !== undefined || evaluation_sale_manager !== undefined) {
    const { data: current } = await supabase
      .from('evaluation')
      .select('evaluation_metadata')
      .eq('evaluation_id', evaluation_id)
      .eq('fk_owner_id', fk_owner_id)
      .single();

    const existingMeta =
      typeof current?.evaluation_metadata === 'string'
        ? JSON.parse(current.evaluation_metadata)
        : current?.evaluation_metadata ?? {};

    if (evaluation_offer !== undefined) existingMeta.offer = evaluation_offer;
    if (evaluation_sale_manager !== undefined) existingMeta.sale_manager = evaluation_sale_manager;
    updateData.evaluation_metadata = existingMeta;
  }

  const { data, error } = await supabase
    .from('evaluation')
    .update(updateData)
    .eq('evaluation_id', evaluation_id)
    .eq('fk_owner_id', fk_owner_id)
    .select()
    .single();

  if (error) {
    return { success: false, message: `Update failed: ${error.message}` };
  }
  return { success: true, message: 'Evaluation updated', data: data as Evaluation };
}

 
export async function deleteEvaluation(
  ownerId: number,
  evaluationId: number,
): Promise<{ success: boolean; message: string }> {
  const { data: existing } = await supabase
    .from('evaluation')
    .select('evaluation_status')
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (existing?.evaluation_status !== 'NEW') {
    return { success: false, message: 'Only NEW evaluations can be deleted' };
  }

  const { error } = await supabase
    .from('evaluation')
    .delete()
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId);

  if (error) {
    return { success: false, message: `Delete failed: ${error.message}` };
  }
  return { success: true, message: 'Evaluation deleted' };
}


function buildEvaluationFileKey(evaluationId: number, originalName: string): string {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `evaluation/${evaluationId}/${Date.now()}_${safeName}`;
}

 
export async function getEvaluationFiles(
  ownerId: number,
  evaluationId: number,
): Promise<EvaluationFile[]> {
  const { data: evalCheck } = await supabase
    .from('evaluation')
    .select('evaluation_id')
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (!evalCheck) throw new Error('Evaluation not found or access denied');

  const { data, error } = await supabase
    .from('evaluation_file')
    .select('*')
    .eq('fk_evaluation_id', evaluationId)
    .order('uploaded_at', { ascending: false });

  if (error) throw new Error(`getEvaluationFiles: ${error.message}`);

  const files = await Promise.all(
    (data ?? []).map(async (row) => {
      let downloadUrl = '';
      if (row.file_path) {
        try {
          downloadUrl = await getPresignedDownloadUrl(row.file_path, 3600);
        } catch (err) {
          console.error(`Presigned URL failed for ${row.file_path}:`, err);
        }
      }

      return {
        evaluation_file_id: row.file_id,
        fk_evaluation_id: row.fk_evaluation_id,
        evaluation_file_filename: row.file_name,
        evaluation_file_desc: row.file_description ?? '',
        evaluation_file_ver: String(row.file_version ?? '1'),
        evaluation_file_folder: row.file_path ?? '',
        evaluation_file_filesize: row.file_size
          ? Number((row.file_size / (1024 * 1024)).toFixed(2))
          : 0,
        last_update: row.uploaded_at ?? '',
        download_url: downloadUrl,
      } as EvaluationFile;
    }),
  );

  return files;
}

 
export async function addEvaluationFile(
  evaluationId: number,
  ownerId: number,
  file: File,
  description: string,
  version: string,
  uploadedByUserId?: number,
): Promise<{ success: boolean; data?: EvaluationFile; message?: string }> {
  const s3Key = buildEvaluationFileKey(evaluationId, file.name);

  try {
    await uploadFileToS3(s3Key, file);
  } catch (err) {
    console.error('S3 upload failed:', err);
    return {
      success: false,
      message: `S3 upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }

  const { data: row, error: dbError } = await supabase
    .from('evaluation_file')
    .insert({
      fk_evaluation_id: evaluationId,
      file_name: file.name,
      file_path: s3Key,
      file_type: file.type,
      file_category: 'document',
      file_size: file.size,
      file_description: description,
      file_version: parseInt(version) || 1,
      is_latest: true,
      uploaded_by_user_id: uploadedByUserId ?? null,
    })
    .select()
    .single();

  if (dbError) {
    try { await deleteFileFromS3(s3Key); } catch {}
    return { success: false, message: `DB insert failed: ${dbError.message}` };
  }

  let downloadUrl = '';
  try {
    downloadUrl = await getPresignedDownloadUrl(s3Key, 3600);
  } catch {}

  const mapped: EvaluationFile = {
    evaluation_file_id: row.file_id,
    fk_evaluation_id: row.fk_evaluation_id,
    evaluation_file_filename: row.file_name,
    evaluation_file_desc: row.file_description ?? '',
    evaluation_file_ver: String(row.file_version ?? '1'),
    evaluation_file_folder: row.file_path ?? '',
    evaluation_file_filesize: row.file_size
      ? Number((row.file_size / (1024 * 1024)).toFixed(2))
      : 0,
    last_update: row.uploaded_at ?? '',
    download_url: downloadUrl,
  };

  return { success: true, data: mapped };
}

 
export async function deleteEvaluationFile(
  ownerId: number,
  evaluationId: number,
  fileId: number,
): Promise<{ success: boolean; message?: string }> {
  const { data: fileRow, error: fetchErr } = await supabase
    .from('evaluation_file')
    .select('file_id, file_path, fk_evaluation_id')
    .eq('file_id', fileId)
    .eq('fk_evaluation_id', evaluationId)
    .single();

  if (fetchErr || !fileRow) {
    return { success: false, message: 'File not found' };
  }

  const { data: evalCheck } = await supabase
    .from('evaluation')
    .select('evaluation_id')
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (!evalCheck) {
    return { success: false, message: 'Access denied' };
  }

  if (fileRow.file_path) {
    try {
      await deleteFileFromS3(fileRow.file_path);
    } catch (err) {
      console.error('S3 delete failed (continuing with DB delete):', err);
    }
  }

  const { error: deleteErr } = await supabase
    .from('evaluation_file')
    .delete()
    .eq('file_id', fileId);

  if (deleteErr) {
    return { success: false, message: `Delete failed: ${deleteErr.message}` };
  }
  return { success: true };
}


export async function getEvaluationTasks(
  ownerId: number,
  evaluationId: number,
): Promise<{ tasks: EvaluationTask[]; allCompleted: boolean }> {
  const { data: evalCheck } = await supabase
    .from('evaluation')
    .select('evaluation_id')
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (!evalCheck) throw new Error('Evaluation not found or access denied');

  const { data, error } = await supabase
    .from('evaluation_action')
    .select('*')
    .eq('fk_evaluation_id', evaluationId)
    .order('action_order', { ascending: true });

  if (error) throw new Error(`getEvaluationTasks: ${error.message}`);

  const tasks: EvaluationTask[] = (data ?? []).map((row) => ({
    task_id: row.action_id,
    task_name: row.action_title,
    task_description: row.action_description ?? '',
    task_status: mapActionStatusToTaskStatus(row.action_status),
    task_type: mapActionTypeToTaskType(row.action_type),
    assignment_id: row.action_type === 'assignment' ? row.action_id : undefined,
    assignment_code: row.action_type === 'assignment' ? row.action_code : undefined,
    checklist_id: row.action_type === 'checklist' ? row.action_id : undefined,
    checklist_code: row.action_type === 'checklist' ? row.action_code : undefined,
    communication_id: row.action_type === 'communication' ? row.action_id : undefined,
    communication_code: row.action_type === 'communication' ? row.action_code : undefined,
    completed_at: row.completed_date ?? undefined,
    completed_by: row.assigned_to_user_id ? String(row.assigned_to_user_id) : undefined,
  }));

  const allCompleted =
    tasks.length > 0 && tasks.every((t) => t.task_status === 'completed');

  return { tasks, allCompleted };
}

export async function updateEvaluationTask(
  ownerId: number,
  evaluationId: number,
  taskId: number,
  taskStatus: string,
): Promise<{ success: boolean; message?: string }> {
  const { data: evalCheck } = await supabase
    .from('evaluation')
    .select('evaluation_id')
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (!evalCheck) {
    return { success: false, message: 'Evaluation not found or access denied' };
  }

  const actionStatus = mapTaskStatusToActionStatus(taskStatus);
  const updateData: Record<string, unknown> = { action_status: actionStatus };

  if (taskStatus === 'completed') {
    updateData.completed_date = new Date().toISOString().split('T')[0];
  } else {
    updateData.completed_date = null;
  }

  const { error } = await supabase
    .from('evaluation_action')
    .update(updateData)
    .eq('action_id', taskId)
    .eq('fk_evaluation_id', evaluationId);

  if (error) {
    return { success: false, message: `Task update failed: ${error.message}` };
  }
  return { success: true };
}

export async function moveEvaluationToPlanning(
  ownerId: number,
  evaluationId: number,
  clientId: number,
  planningData: {
    planning_name: string;
    planning_description?: string;
    planning_type?: string;
    planned_date?: string;
  },
): Promise<{ success: boolean; planningId?: number; message?: string }> {
  const { data: evaluation } = await supabase
    .from('evaluation')
    .select('evaluation_id, evaluation_status')
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (!evaluation) {
    return { success: false, message: 'Evaluation not found' };
  }

  const { data: planning, error } = await supabase
    .from('planning')
    .insert({
      fk_owner_id: ownerId,
      fk_client_id: clientId,
      fk_evaluation_id: evaluationId,
      planning_name: planningData.planning_name,
      planning_description: planningData.planning_description ?? '',
      planning_type: planningData.planning_type ?? 'standard',
      planning_status: 'NEW',
      planned_date: planningData.planned_date ?? null,
    })
    .select('planning_id')
    .single();

  if (error) {
    return { success: false, message: `Planning creation failed: ${error.message}` };
  }

  await supabase
    .from('evaluation')
    .update({ evaluation_status: 'DONE' })
    .eq('evaluation_id', evaluationId);

  return {
    success: true,
    planningId: planning.planning_id,
    message: 'Moved to planning successfully',
  };
}

 

export async function getEvaluationList(ownerId: number): Promise<Evaluation[]> {
  const { data, error } = await supabase
    .from('evaluation')
    .select(`*, client:fk_client_id ( client_name )`)
    .eq('fk_owner_id', ownerId)
    .order('evaluation_id', { ascending: false });

  if (error) throw new Error(`getEvaluationList: ${error.message}`);

  return (data ?? []).map((row) => ({
    ...row,
    client_name: row.client?.client_name ?? '',
  })) as Evaluation[];
}
 

function mapActionStatusToTaskStatus(
  actionStatus: string | null,
): EvaluationTask['task_status'] {
  switch (actionStatus?.toLowerCase()) {
    case 'completed':
    case 'done':
      return 'completed';
    case 'in_progress':
    case 'progress':
    case 'active':
      return 'in_progress';
    case 'skipped':
    case 'cancelled':
      return 'skipped';
    default:
      return 'pending';
  }
}

function mapTaskStatusToActionStatus(taskStatus: string): string {
  switch (taskStatus) {
    case 'completed':
      return 'completed';
    case 'in_progress':
      return 'in_progress';
    case 'skipped':
      return 'skipped';
    default:
      return 'pending';
  }
}

function mapActionTypeToTaskType(
  actionType: string | null,
): EvaluationTask['task_type'] {
  switch (actionType?.toLowerCase()) {
    case 'assignment':
      return 'assignment';
    case 'checklist':
      return 'checklist';
    case 'communication':
      return 'communication';
    default:
      return 'assignment';
  }
}