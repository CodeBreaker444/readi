import { prisma } from '@/lib/prisma';

import { Evaluation, EvaluationFile, EvaluationTask, SendAssignmentPayload, SendAssignmentResult } from '@/config/types/evaluation';
import { ProcedureSteps } from '@/config/types/lcuProcedures';
import { deleteFileFromS3, getPresignedDownloadUrl, uploadFileToS3 } from '@/lib/s3Client';
import { logEvent } from '@/backend/services/auditLog/audit-log';

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
  evaluationId: number
): Promise<Evaluation> {
  const data = await prisma.evaluation.findFirst({
    where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
    include: {
      client: { select: { client_name: true } },
      luc_procedure: { select: { procedure_code: true, procedure_version: true } },
    },
  });

  if (!data) throw new Error('Evaluation not found');

  const metadata =
    typeof data.evaluation_metadata === 'string'
      ? JSON.parse(data.evaluation_metadata)
      : (data.evaluation_metadata as Record<string, any>) ?? {};

  let procedureCode = data.luc_procedure?.procedure_code ?? '';
  let procedureVersion = data.luc_procedure?.procedure_version ?? '';

  if (!procedureCode && metadata.procedure_id) {
    const procData = await prisma.luc_procedure.findUnique({
      where: { procedure_id: metadata.procedure_id },
      select: { procedure_code: true, procedure_version: true },
    });

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
  } as unknown as Evaluation;
}

export interface EvaluationUpdateInput {
  evaluation_id: number;
  fk_owner_id: number;
  fk_client_id: number;
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
  userId?: number,
  userName?: string,
  userEmail?: string,
  userRole?: string
): Promise<{ success: boolean; message: string; data?: Evaluation }> {
  const {
    evaluation_id, fk_owner_id, fk_client_id,
    evaluation_request_date, evaluation_year, evaluation_desc,
    evaluation_status, evaluation_result, evaluation_offer, evaluation_sale_manager,
  } = payload;

  const updateData: Record<string, any> = { fk_client_id };

  if (evaluation_request_date !== undefined) updateData.scheduled_date = evaluation_request_date ? new Date(evaluation_request_date) : null;
  if (evaluation_year !== undefined) updateData.evaluation_year = evaluation_year;
  if (evaluation_desc !== undefined) updateData.evaluation_description = evaluation_desc;
  if (evaluation_status !== undefined) updateData.evaluation_status = evaluation_status;
  if (evaluation_result !== undefined) updateData.evaluation_result = evaluation_result;

  if (evaluation_offer !== undefined || evaluation_sale_manager !== undefined) {
    const current = await prisma.evaluation.findFirst({
      where: { evaluation_id, fk_owner_id },
      select: { evaluation_metadata: true },
    });

    const existingMeta =
      typeof current?.evaluation_metadata === 'string'
        ? JSON.parse(current.evaluation_metadata)
        : (current?.evaluation_metadata as Record<string, any>) ?? {};

    if (evaluation_offer !== undefined) existingMeta.offer = evaluation_offer;
    if (evaluation_sale_manager !== undefined) existingMeta.sale_manager = evaluation_sale_manager;
    updateData.evaluation_metadata = existingMeta;
  }

  const data = await prisma.evaluation.updateMany({
    where: { evaluation_id, fk_owner_id },
    data: updateData,
  });

  if (data.count === 0) {
    return { success: false, message: 'Update failed: record not found' };
  }

  const evalIdentifier = `EVAL_${evaluation_id}`;

  logEvent({
    eventType: 'UPDATE',
    entityType: 'evaluation',
    entityId: evaluation_id,
    description: `${evalIdentifier} updated`,
    userId: userId,
    userName: userName,
    userEmail: userEmail,
    userRole: userRole,
    ownerId: fk_owner_id,
    metadata: { updateData },
  });

  const updated = await getEvaluationById(fk_owner_id, evaluation_id);

  return { success: true, message: 'Evaluation updated', data: updated };
}

export async function deleteEvaluation(
  ownerId: number,
  evaluationId: number
): Promise<{ success: boolean; message: string }> {
  const existing = await prisma.evaluation.findFirst({
    where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
    select: { evaluation_status: true },
  });

  if (existing?.evaluation_status !== 'NEW') {
    return { success: false, message: 'Only NEW evaluations can be deleted' };
  }

  await prisma.evaluation.deleteMany({
    where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
  });

  logEvent({
    eventType: 'DELETE',
    entityType: 'evaluation',
    entityId: evaluationId,
    description: `Evaluation #${evaluationId} deleted`,
    ownerId: ownerId,
  });

  return { success: true, message: 'Evaluation deleted' };
}

function buildEvaluationFileKey(evaluationId: number, originalName: string): string {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `evaluation/${evaluationId}/${Date.now()}_${safeName}`;
}

export async function getEvaluationFiles(
  ownerId: number,
  evaluationId: number
): Promise<EvaluationFile[]> {
  const [evalCheck, data] = await Promise.all([
    prisma.evaluation.findFirst({
      where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
      select: { evaluation_id: true },
    }),
    prisma.evaluation_file.findMany({
      where: { fk_evaluation_id: evaluationId },
      orderBy: { uploaded_at: 'desc' },
      select: {
        file_id: true,
        fk_evaluation_id: true,
        file_name: true,
        file_path: true,
        file_description: true,
        file_version: true,
        file_size: true,
        uploaded_at: true,
      },
    }),
  ]);

  if (!evalCheck) throw new Error('Evaluation not found or access denied');

  const files = await Promise.all(
    data.map(async (row) => {
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
          ? Number((Number(row.file_size) / (1024 * 1024)).toFixed(2))
          : 0,
        last_update: row.uploaded_at ?? '',
        download_url: downloadUrl,
      } as EvaluationFile;
    })
  );

  return files;
}

export async function addEvaluationFile(
  evaluationId: number,
  ownerId: number,
  file: File,
  description: string,
  version: string,
  uploadedByUserId?: number
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

  let row: any;
  try {
    row = await prisma.evaluation_file.create({
      data: {
        fk_evaluation_id: evaluationId,
        file_name: file.name,
        file_path: s3Key,
        file_type: file.type,
        file_category: 'document',
        file_size: BigInt(file.size),
        file_description: description,
        file_version: parseInt(version) || 1,
        is_latest: true,
        uploaded_by_user_id: uploadedByUserId ?? null,
      },
    });
  } catch (dbError: any) {
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
      ? Number((Number(row.file_size) / (1024 * 1024)).toFixed(2))
      : 0,
    last_update: row.uploaded_at ?? '',
    download_url: downloadUrl,
  };

  logEvent({
    eventType: 'CREATE',
    entityType: 'evaluation_file',
    entityId: row.file_id,
    description: `File "${file.name}" uploaded to evaluation #${evaluationId}`,
    ownerId: ownerId,
    userId: uploadedByUserId,
    metadata: { fileName: file.name, fileSize: file.size },
  });

  return { success: true, data: mapped };
}

export async function deleteEvaluationFile(
  ownerId: number,
  evaluationId: number,
  fileId: number
): Promise<{ success: boolean; message?: string }> {
  const fileRow = await prisma.evaluation_file.findFirst({
    where: { file_id: fileId, fk_evaluation_id: evaluationId },
    select: { file_id: true, file_path: true, fk_evaluation_id: true },
  });

  if (!fileRow) {
    return { success: false, message: 'File not found' };
  }

  const evalCheck = await prisma.evaluation.findFirst({
    where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
    select: { evaluation_id: true },
  });

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

  await prisma.evaluation_file.delete({ where: { file_id: fileId } });

  logEvent({
    eventType: 'DELETE',
    entityType: 'evaluation_file',
    entityId: fileId,
    description: `File deleted from evaluation #${evaluationId}`,
    ownerId: ownerId,
  });

  return { success: true };
}

async function fetchChecklistJsonMap(
  ownerId: number,
  codes: string[]
): Promise<Map<string, object>> {
  const map = new Map<string, object>();
  if (codes.length === 0) return map;

  const data = await prisma.checklist.findMany({
    where: { fk_owner_id: ownerId, checklist_code: { in: codes } },
    select: { checklist_code: true, checklist_json: true },
  });

  for (const row of data) {
    if (!row.checklist_code) continue;
    const json =
      typeof row.checklist_json === 'string'
        ? JSON.parse(row.checklist_json)
        : row.checklist_json;
    if (json) map.set(row.checklist_code, json as object);
  }

  return map;
}

function buildTasksFromActions(
  rows: Record<string, unknown>[],
  checklistJsonMap: Map<string, object>
): { tasks: EvaluationTask[]; allCompleted: boolean } {
  const tasks: EvaluationTask[] = rows.map((r) => {
    const type = r.action_type as EvaluationTask['task_type'];
    const code = r.action_code as string;
    const dependencies = r.dependencies as Record<string, unknown> | null;
    
    let checklistJson = type === 'checklist' ? (checklistJsonMap.get(code) ?? null) : null;
    let checklistResult = null;
    
    if (dependencies && typeof dependencies === 'object') {
      checklistResult = (dependencies as any).checklist_result ?? null;
    }

    return {
      task_id: r.action_id as number,
      task_code: code,
      task_name: r.action_title as string,
      task_type: type,
      task_status: r.action_status as EvaluationTask['task_status'],
      task_order: r.action_order as number,
      checklist_json: checklistJson,
      checklist_result: checklistResult,
    };
  });

  const allCompleted =
    tasks.length > 0 &&
    tasks.every((t) => t.task_status === 'completed' || t.task_status === 'skipped');

  return { tasks, allCompleted };
}

export async function getEvaluationTasks(
  ownerId: number,
  evaluationId: number
): Promise<{ tasks: EvaluationTask[]; allCompleted: boolean }> {
  const evalRow = await prisma.evaluation.findFirst({
    where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
    select: { evaluation_id: true, fk_luc_procedure_id: true },
  });

  if (!evalRow) throw new Error('Evaluation not found or access denied');

  const existing = await prisma.evaluation_action.findMany({
    where: { fk_evaluation_id: evaluationId },
    orderBy: { action_order: 'asc' },
  });

  if (existing.length > 0) {
    const checklistCodes = existing
      .filter((r) => r.action_type === 'checklist' && r.action_code)
      .map((r) => r.action_code as string);

    const checklistJsonMap = await fetchChecklistJsonMap(ownerId, checklistCodes);
    return buildTasksFromActions(existing as unknown as Record<string, unknown>[], checklistJsonMap);
  }

  const procedureId = evalRow.fk_luc_procedure_id;
  if (!procedureId) return { tasks: [], allCompleted: false };

  const procData = await prisma.luc_procedure.findUnique({
    where: { procedure_id: procedureId },
    select: { procedure_steps: true },
  });

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
          action_code: cl.checklist_code || `CL_${order}`,
          action_title: cl.checklist_name || procTask.title || 'Checklist item',
          action_type: 'checklist',
          action_status: 'pending',
          action_order: order++,
          dependencies: {
            procedure_task_id: procTask.task_id,
            procedure_item_id: cl.checklist_id,
            procedure_task_title: procTask.title,
          },
        });
      }
    }

    if (Array.isArray(procTask.assignment)) {
      for (const asg of procTask.assignment) {
        seedRows.push({
          fk_evaluation_id: evaluationId,
          action_code: asg.assignment_code || `ASG_${order}`,
          action_title: asg.assignment_name || procTask.title || 'Assignment item',
          action_type: 'assignment',
          action_status: 'pending',
          action_order: order++,
          dependencies: {
            procedure_task_id: procTask.task_id,
            procedure_item_id: asg.assignment_id,
            procedure_task_title: procTask.title,
            default_assignment_message: asg.assignment_message ?? '',
            assignment_role: asg.assignment_role ?? '',
          },
        });
      }
    }

    if (Array.isArray(procTask.communication)) {
      for (const comm of procTask.communication) {
        seedRows.push({
          fk_evaluation_id: evaluationId,
          action_code: comm.communication_code || `COMM_${order}`,
          action_title: comm.communication_name || procTask.title || 'Communication item',
          action_type: 'communication',
          action_status: 'pending',
          action_order: order++,
          dependencies: {
            procedure_task_id: procTask.task_id,
            procedure_item_id: comm.communication_id,
            procedure_task_title: procTask.title,
          },
        });
      }
    }
  }

  if (seedRows.length === 0) return { tasks: [], allCompleted: false };

  const seeded = await prisma.evaluation_action.createManyAndReturn({
    data: seedRows as any[],
    select: {
      action_id: true,
      action_code: true,
      action_title: true,
      action_type: true,
      action_status: true,
      action_order: true,
      dependencies: true,
    },
  });

  const checklistCodes = seeded
    .filter((r) => r.action_type === 'checklist' && r.action_code)
    .map((r) => r.action_code as string);

  const checklistJsonMap = await fetchChecklistJsonMap(ownerId, checklistCodes);
  return buildTasksFromActions(seeded as unknown as Record<string, unknown>[], checklistJsonMap);
}

export async function updateEvaluationTask(
  ownerId: number,
  evaluationId: number,
  actionId: number,
  newStatus: 'pending' | 'in_progress' | 'completed' | 'skipped',
  userId?: number,
  userName?: string,
  userEmail?: string,
  userRole?: string
): Promise<{ success: boolean; message?: string }> {
  const evalRow = await prisma.evaluation.findFirst({
    where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
    select: { evaluation_id: true },
  });

  if (!evalRow) return { success: false, message: 'Evaluation not found or access denied' };

  const actionRow = await prisma.evaluation_action.findFirst({
    where: { action_id: actionId, fk_evaluation_id: evaluationId },
    select: { action_title: true },
  });

  await prisma.evaluation_action.updateMany({
    where: { action_id: actionId, fk_evaluation_id: evaluationId },
    data: { action_status: newStatus },
  });

  const evalIdentifier = `EVAL_${evaluationId}`;
  const taskName = actionRow?.action_title ?? `Task #${actionId}`;

  logEvent({
    eventType: 'UPDATE',
    entityType: 'evaluation_task',
    entityId: actionId,
    description: `${taskName} status updated to ${newStatus} for ${evalIdentifier}`,
    userId: userId,
    userName: userName,
    userEmail: userEmail,
    userRole: userRole,
    ownerId: ownerId,
    metadata: { newStatus, evaluationId, taskName: actionRow?.action_title },
  });

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
  }
): Promise<{ success: boolean; planningId?: number; message?: string }> {
  const evaluation = await prisma.evaluation.findFirst({
    where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
    select: { evaluation_id: true, evaluation_status: true },
  });

  if (!evaluation) {
    return { success: false, message: 'Evaluation not found' };
  }

  const planning = await prisma.planning.create({
    data: {
      fk_owner_id: ownerId,
      fk_client_id: clientId,
      fk_evaluation_id: evaluationId,
      planning_name: planningData.planning_name,
      planning_description: planningData.planning_description ?? '',
      planning_type: planningData.planning_type ?? 'standard',
      planning_status: 'NEW',
      planned_date: planningData.planned_date ? new Date(planningData.planned_date) : null,
    },
    select: { planning_id: true },
  });

  await prisma.evaluation.updateMany({
    where: { evaluation_id: evaluationId },
    data: { evaluation_status: 'DONE' },
  });

  logEvent({
    eventType: 'UPDATE',
    entityType: 'evaluation',
    entityId: evaluationId,
    description: `Evaluation #${evaluationId} moved to planning (PLAN_${planning.planning_id})`,
    ownerId: ownerId,
    metadata: { planningId: planning.planning_id, clientId },
  });

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
  userName?: string,
  userEmail?: string,
  userRole?: string
): Promise<{ success: boolean; message?: string }> {
  const evalCheck = await prisma.evaluation.findFirst({
    where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
    select: { evaluation_id: true },
  });

  if (!evalCheck) {
    return { success: false, message: 'Evaluation not found or access denied' };
  }

  const recipientUser = await prisma.public_users.findFirst({
    where: { user_id: params.to_user_id },
    select: { first_name: true, last_name: true },
  });

  const communication = await prisma.communication_general.create({
    data: {
      fk_owner_id: ownerId,
      subject: params.subject ?? `Evaluation #${evaluationId} Communication`,
      message: params.message,
      communication_type: 'evaluation',
      fk_evaluation_id: evaluationId,
      status: 'sent',
      sent_by_user_id: params.from_user_id,
      recipients: [params.to_user_id],
      sent_at: new Date(),
    },
  });

  const evalIdentifier = `EVAL_${evaluationId}`;
  const recipientName = recipientUser ? `${recipientUser.first_name} ${recipientUser.last_name}`.trim() : `User #${params.to_user_id}`;

  logEvent({
    eventType: 'CREATE',
    entityType: 'evaluation_communication',
    entityId: communication.communication_id,
    description: `Communication sent for ${evalIdentifier} to ${recipientName}`,
    userId: params.from_user_id,
    userName: userName,
    userEmail: userEmail,
    userRole: userRole,
    ownerId: ownerId,
    metadata: { evaluationId, toUserId: params.to_user_id, subject: params.subject, recipientName },
  });

  return { success: true };
}

export async function getEvaluationList(ownerId: number): Promise<Evaluation[]> {
  const data = await prisma.evaluation.findMany({
    where: { fk_owner_id: ownerId },
    orderBy: { evaluation_id: 'desc' },
    include: {
      client: { select: { client_name: true } },
    },
  });

  return data.map((row) => ({
    ...row,
    client_name: row.client?.client_name ?? '',
  })) as unknown as Evaluation[];
}

export async function sendAssignment(
  payload: SendAssignmentPayload
): Promise<SendAssignmentResult> {
  const {
    evaluationId, ownerId, fromUserUuid,
    taskId, taskCode, taskName, toUserId, message,
  } = payload;

  const evalRow = await prisma.evaluation.findFirst({
    where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
    select: { evaluation_id: true },
  });

  if (!evalRow) {
    return { success: false, message: 'Evaluation not found or access denied' };
  }

  let fromUserId: number;
  try {
    fromUserId = fromUserUuid;
  } catch (e: any) {
    return { success: false, message: e.message };
  }

  const subject = `[Assignment] ${taskName} — Evaluation EVAL_${evaluationId}`;

  try {
    await prisma.messages.create({
      data: {
        from_user_id: fromUserId,
        to_user_id: toUserId,
        message_subject: subject,
        message_body: message,
        message_type: 'assignment',
      },
    });
  } catch (msgErr: any) {
    return { success: false, message: `Failed to send message: ${msgErr.message}` };
  }

  try {
    await prisma.assignment.create({
      data: {
        fk_user_id: toUserId,
        fk_owner_id: ownerId,
        assignment_code: taskCode,
        assignment_desc: taskName,
        assignment_json: {
          evaluation_id: evaluationId,
          task_id: taskId,
          task_code: taskCode,
          task_name: taskName,
          from_user_id: fromUserId,
          message,
        },
        assignment_ver: 1,
        assignment_active: 'Y',
      },
    });
  } catch (asgErr: any) {
    console.warn('[sendAssignment] assignment insert warning:', asgErr.message);
  }

  try {
    await prisma.notification.create({
      data: {
        fk_user_id: toUserId,
        notification_type: 'assignment',
        notification_title: 'New Assignment',
        notification_message: subject,
        notification_data: {
          evaluation_id: evaluationId,
          task_id: taskId,
          task_code: taskCode,
          from_user_id: fromUserId,
        },
        priority: 'normal',
      },
    });
  } catch (notifErr: any) {
    console.warn('[sendAssignment] notification insert warning:', notifErr.message);
  }

  return { success: true, message: 'Assignment sent' };
}

export async function getFlightRequestsByEvaluationId(
  ownerId: number,
  evaluationId: number
): Promise<any[]> {
  const evalRow = await prisma.evaluation.findFirst({
    where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
    select: { evaluation_id: true },
  });

  if (!evalRow) {
    throw new Error('Evaluation not found or access denied');
  }

  const planning = await prisma.planning.findFirst({
    where: { fk_evaluation_id: evaluationId, fk_owner_id: ownerId },
    select: { planning_id: true },
  });

  if (!planning) {
    return [];
  }

  const { getFlightRequestsByPlanningId } = await import('@/backend/services/mission/flight-request-service');
  return getFlightRequestsByPlanningId(planning.planning_id, ownerId);
}

export async function getCommunicationsByEvaluation(
  ownerId: number,
  evaluationId: number
): Promise<any[]> {
  const [evalRow, communications] = await Promise.all([
    prisma.evaluation.findFirst({
      where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
      select: { evaluation_id: true },
    }),
    prisma.communication_general.findMany({
      where: {
        fk_owner_id: ownerId,
        communication_type: 'evaluation',
        OR: [
          { fk_evaluation_id: evaluationId },
          { communication_id: evaluationId },
        ],
      },
      orderBy: { sent_at: 'desc' },
      select: {
        communication_id: true,
        subject: true,
        message: true,
        status: true,
        sent_at: true,
        sent_by_user_id: true,
        recipients: true,
      },
    }),
  ]);

  if (!evalRow) {
    throw new Error('Evaluation not found or access denied');
  }

  const userIds = communications.map(c => c.sent_by_user_id).filter(Boolean);
  const recipientIds = Array.from(
    new Set(
      communications.flatMap((c) => (Array.isArray(c.recipients) ? (c.recipients as unknown[]) : []))
        .filter((id): id is number => typeof id === 'number')
    )
  );
  const allUserIds = Array.from(new Set([...(userIds as number[]), ...recipientIds]));
  const users = allUserIds.length > 0 ? await prisma.public_users.findMany({
    where: { user_id: { in: allUserIds } },
    select: {
      user_id: true,
      first_name: true,
      last_name: true,
      email: true,
    },
  }) : [];

  const userMap = new Map(users.map((u: any) => [u.user_id, u]));

  return communications.map((comm) => ({
    communication_id: comm.communication_id,
    subject: comm.subject,
    message: comm.message,
    status: comm.status,
    sent_at: comm.sent_at,
    sent_by_user_id: comm.sent_by_user_id,
    sender: comm.sent_by_user_id ? userMap.get(comm.sent_by_user_id) : null,
    recipients: comm.recipients,
    recipient_names: (Array.isArray(comm.recipients) ? (comm.recipients as unknown[]) : [])
      .filter((id): id is number => typeof id === 'number')
      .map((id) => {
        const u = userMap.get(id);
        return u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : `#${id}`;
      }),
  }));
}
