import { supabase } from '@/backend/database/database';

import { Evaluation, EvaluationFile, EvaluationTask, SendAssignmentPayload, SendAssignmentResult } from '@/config/types/evaluation';
import { ProcedureSteps } from '@/config/types/lcuProcedures';
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

  if (error) {
    console.warn('[fetchChecklistJsonMap] warning:', error.message);
    return map;
  }

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

function buildTasksFromActions(
  rows: Record<string, unknown>[],
  checklistJsonMap: Map<string, object>,
): { tasks: EvaluationTask[]; allCompleted: boolean } {
  const tasks: EvaluationTask[] = rows.map((r) => {
    const type = r.action_type as EvaluationTask['task_type'];
    const code = r.action_code as string;
    return {
      task_id:        r.action_id    as number,
      task_code:      code,
      task_name:      r.action_title as string,
      task_type:      type,
      task_status:    r.action_status as EvaluationTask['task_status'],
      task_order:     r.action_order as number,
      checklist_json: type === 'checklist' ? (checklistJsonMap.get(code) ?? null) : null,
    };
  });

  const allCompleted =
    tasks.length > 0 &&
    tasks.every((t) => t.task_status === 'completed' || t.task_status === 'skipped');

  return { tasks, allCompleted };
}


export async function getEvaluationTasks(
  ownerId: number,
  evaluationId: number,
): Promise<{ tasks: EvaluationTask[]; allCompleted: boolean }> {

  const { data: evalRow, error: evalErr } = await supabase
    .from('evaluation')
    .select('evaluation_id, fk_luc_procedure_id')
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (evalErr || !evalRow) throw new Error('Evaluation not found or access denied');

  const { data: existing, error: existErr } = await supabase
    .from('evaluation_action')
    .select('*')
    .eq('fk_evaluation_id', evaluationId)
    .order('action_order', { ascending: true });

  if (existErr) throw new Error(`getEvaluationTasks (fetch existing): ${existErr.message}`);

  if ((existing?.length ?? 0) > 0) {
    const checklistCodes = existing!
      .filter((r) => r.action_type === 'checklist' && r.action_code)
      .map((r) => r.action_code as string);

    const checklistJsonMap = await fetchChecklistJsonMap(ownerId, checklistCodes);
    return buildTasksFromActions(existing!, checklistJsonMap);
  }

  const procedureId = (evalRow as any).fk_luc_procedure_id as number | null;
  if (!procedureId) return { tasks: [], allCompleted: false };

  const { data: procData, error: procErr } = await supabase
    .from('luc_procedure')
    .select('procedure_steps')
    .eq('procedure_id', procedureId)
    .single();

  if (procErr) throw new Error(`getEvaluationTasks (fetch procedure): ${procErr.message}`);

  const steps = procData?.procedure_steps as ProcedureSteps | null;

  if (!steps?.tasks || !Array.isArray(steps.tasks) || steps.tasks.length === 0) {
    return { tasks: [], allCompleted: false };
  }

  const seedRows: Record<string, unknown>[] = [];
  let order = 1;

  for (const procTask of steps.tasks) {
    if (Array.isArray(procTask.checklist)) {
      for (const cl of procTask.checklist) {
        seedRows.push({
          fk_evaluation_id: evaluationId,
          action_code:      cl.checklist_code  || `CL_${order}`,
          action_title:     cl.checklist_name  || procTask.title || 'Checklist item',
          action_type:      'checklist',
          action_status:    'pending',
          action_order:     order++,
          dependencies: {
            procedure_task_id:    procTask.task_id,
            procedure_item_id:    cl.checklist_id,
            procedure_task_title: procTask.title,
          },
        });
      }
    }

    if (Array.isArray(procTask.assignment)) {
      for (const asg of procTask.assignment) {
        seedRows.push({
          fk_evaluation_id: evaluationId,
          action_code:      asg.assignment_code  || `ASG_${order}`,
          action_title:     asg.assignment_name  || procTask.title || 'Assignment item',
          action_type:      'assignment',
          action_status:    'pending',
          action_order:     order++,
          dependencies: {
            procedure_task_id:          procTask.task_id,
            procedure_item_id:          asg.assignment_id,
            procedure_task_title:       procTask.title,
            default_assignment_message: asg.assignment_message ?? '',
            assignment_role:            asg.assignment_role ?? '',
          },
        });
      }
    }

    if (Array.isArray(procTask.communication)) {
      for (const comm of procTask.communication) {
        seedRows.push({
          fk_evaluation_id: evaluationId,
          action_code:      comm.communication_code  || `COMM_${order}`,
          action_title:     comm.communication_name  || procTask.title || 'Communication item',
          action_type:      'communication',
          action_status:    'pending',
          action_order:     order++,
          dependencies: {
            procedure_task_id:    procTask.task_id,
            procedure_item_id:    comm.communication_id,
            procedure_task_title: procTask.title,
          },
        });
      }
    }
  }

  if (seedRows.length === 0) return { tasks: [], allCompleted: false };

  const { error: insertErr } = await supabase.from('evaluation_action').insert(seedRows);
  if (insertErr) throw new Error(`getEvaluationTasks (seed actions): ${insertErr.message}`);

  const { data: seeded, error: seededErr } = await supabase
    .from('evaluation_action')
    .select('*')
    .eq('fk_evaluation_id', evaluationId)
    .order('action_order', { ascending: true });

  if (seededErr) throw new Error(`getEvaluationTasks (re-fetch seeded): ${seededErr.message}`);

  const checklistCodes = (seeded ?? [])
    .filter((r) => r.action_type === 'checklist' && r.action_code)
    .map((r) => r.action_code as string);

  const checklistJsonMap = await fetchChecklistJsonMap(ownerId, checklistCodes);
  return buildTasksFromActions(seeded ?? [], checklistJsonMap);
}


export async function updateEvaluationTask(
  ownerId: number,
  evaluationId: number,
  actionId: number,
  newStatus: 'pending' | 'in_progress' | 'completed' | 'skipped',
): Promise<{ success: boolean; message?: string }> {

  const { data: evalRow } = await supabase
    .from('evaluation')
    .select('evaluation_id')
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (!evalRow) return { success: false, message: 'Evaluation not found or access denied' };

  const { error } = await supabase
    .from('evaluation_action')
    .update({ action_status: newStatus })
    .eq('action_id', actionId)
    .eq('fk_evaluation_id', evaluationId);

  if (error) return { success: false, message: `updateEvaluationTask: ${error.message}` };

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

export async function sendEvaluationCommunication(
  ownerId: number,
  evaluationId: number,
  params: {
    to_user_id: number;
    from_user_id: number;
    message: string;
    subject?: string;
  },
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

  const { error: commError } = await supabase
    .from('communication_general')
    .insert({
      fk_owner_id: ownerId,
      subject: params.subject ?? `Evaluation #${evaluationId} Communication`,
      message: params.message,
      communication_type: 'evaluation',
      status: 'sent',
      sent_by_user_id: params.from_user_id,
      recipients: [params.to_user_id],
      sent_at: new Date().toISOString(),
    });

  if (commError) {
    return { success: false, message: `Communication save failed: ${commError.message}` };
  }

  return { success: true };
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
 
 
export async function sendAssignment(
  payload: SendAssignmentPayload,
): Promise<SendAssignmentResult> {
  const {
    evaluationId, ownerId, fromUserUuid,
    taskId, taskCode, taskName, toUserId, message,
  } = payload;

  const { data: evalRow } = await supabase
    .from('evaluation')
    .select('evaluation_id, evaluation_code')
    .eq('evaluation_id', evaluationId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (!evalRow) {
    return { success: false, message: 'Evaluation not found or access denied' };
  }

  let fromUserId: number;
  try {
    fromUserId =  fromUserUuid
  } catch (e: any) {
    return { success: false, message: e.message };
  }

  const subject = `[Assignment] ${taskName} — Evaluation ${evalRow.evaluation_code ?? evaluationId}`;

  const { error: msgErr } = await supabase.from('messages').insert({
    from_user_id:    fromUserId,   
    to_user_id:      toUserId,
    message_subject: subject,
    message_body:    message,
    message_type:    'assignment',
  });

  if (msgErr) {
    return { success: false, message: `Failed to send message: ${msgErr.message}` };
  }

  const { error: asgErr } = await supabase.from('assignment').insert({
    fk_user_id:      toUserId,
    fk_owner_id:     ownerId,
    assignment_code: taskCode,
    assignment_desc: taskName,
    assignment_json: {
      evaluation_id: evaluationId,
      task_id:       taskId,
      task_code:     taskCode,
      task_name:     taskName,
      from_user_id:  fromUserId,
      message,
    },
    assignment_ver:    1,
    assignment_active: 'Y',
  });

  if (asgErr) {
    console.warn('[sendAssignment] assignment insert warning:', asgErr.message);
  }

  const { error: notifErr } = await supabase.from('notification').insert({
    fk_user_id:           toUserId,
    notification_type:    'assignment',
    notification_title:   'New Assignment',
    notification_message: subject,
    notification_data: {
      evaluation_id: evaluationId,
      task_id:       taskId,
      task_code:     taskCode,
      from_user_id:  fromUserId,
    },
    priority: 'normal',
  });

  if (notifErr) {
    console.warn('[sendAssignment] notification insert warning:', notifErr.message);
  }

  return { success: true, message: 'Assignment sent' };
}
