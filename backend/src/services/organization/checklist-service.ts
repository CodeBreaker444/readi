import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { Checklist, ChecklistCreatePayload, ChecklistUpdatePayload } from '@/config/types/checklist';

export async function getChecklistsByOwner(
  ownerId: number,
): Promise<{ code: number; message: string; dataRows: number; data: Checklist[] }> {
  const rows = await prisma.checklist.findMany({
    where: { fk_owner_id: ownerId },
    orderBy: { checklist_id: 'desc' },
  });
  return {
    code: 1,
    message: 'Checklists retrieved successfully',
    dataRows: rows.length,
    data: rows as unknown as Checklist[],
  };
}

export async function getChecklistByCode(
  ownerId: number,
  checklistCode: string,
): Promise<{ dataRows: number; data: Checklist | null }> {
  const row = await prisma.checklist.findFirst({
    where: { fk_owner_id: ownerId, checklist_code: checklistCode, checklist_active: 'Y' },
  });
  return { dataRows: row ? 1 : 0, data: row as unknown as Checklist | null };
}

export async function getChecklistById(
  checklistId: number,
): Promise<{ dataRows: number; data: Checklist | null }> {
  const row = await prisma.checklist.findUnique({
    where: { checklist_id: checklistId },
  });
  return { dataRows: row ? 1 : 0, data: row as unknown as Checklist | null };
}

export async function saveChecklistResult(
  evaluationId: number,
  taskId: number,
  checklistData: Record<string, unknown>,
): Promise<{ updated: boolean }> {
  const actionRow = await prisma.evaluation_action.findFirst({
    where: { action_id: taskId, fk_evaluation_id: evaluationId },
    select: { dependencies: true },
  });
  if (!actionRow) return { updated: false };

  const rawDeps = actionRow.dependencies;
  const existing: Record<string, unknown> =
    typeof rawDeps === 'string'
      ? (JSON.parse(rawDeps) as Record<string, unknown>)
      : rawDeps !== null && typeof rawDeps === 'object' && !Array.isArray(rawDeps)
      ? (rawDeps as Record<string, unknown>)
      : {};

  await prisma.evaluation_action.updateMany({
    where: { action_id: taskId, fk_evaluation_id: evaluationId },
    data: {
      dependencies: {
        ...existing,
        checklist_result: checklistData,
        checklist_result_at: new Date().toISOString(),
      } as unknown as Prisma.InputJsonValue,
    },
  });
  return { updated: true };
}

export async function createChecklist(
  payload: ChecklistCreatePayload,
): Promise<{ code: number; dataRows: number; data: Checklist | null }> {
  let parsedJson: Prisma.InputJsonValue;
  try {
    parsedJson = JSON.parse(payload.checklist_json) as Prisma.InputJsonValue;
  } catch {
    return { code: 0, dataRows: 0, data: null };
  }

  const existing = await prisma.checklist.findFirst({
    where: { fk_owner_id: payload.fk_owner_id, checklist_code: payload.checklist_code },
    select: { checklist_id: true },
  });
  if (existing) return { code: 0, dataRows: 0, data: null };

  const row = await prisma.checklist.create({
    data: {
      fk_owner_id: payload.fk_owner_id,
      fk_user_id: payload.fk_user_id ?? null,
      checklist_code: payload.checklist_code.trim(),
      checklist_desc: payload.checklist_desc.trim(),
      checklist_ver: parseFloat(payload.checklist_ver) || 1.0,
      checklist_active: payload.checklist_active,
      checklist_json: parsedJson,
    },
  });
  return { code: 1, dataRows: 1, data: row as unknown as Checklist };
}

export async function updateChecklist(
  payload: ChecklistUpdatePayload,
): Promise<{ dataRows: number; data: Checklist | null }> {
  let parsedJson: Prisma.InputJsonValue;
  try {
    parsedJson = JSON.parse(payload.checklist_json) as Prisma.InputJsonValue;
  } catch (e: any) {
    throw new Error(`Failed to parse JSON: ${e.message}`);
  }

  const row = await prisma.checklist.update({
    where: { checklist_id: payload.checklist_id },
    data: {
      checklist_code: payload.checklist_code.trim(),
      checklist_desc: payload.checklist_desc.trim(),
      checklist_ver: parseFloat(payload.checklist_ver) || 1.0,
      checklist_active: payload.checklist_active,
      checklist_json: parsedJson,
      fk_owner_id: payload.fk_owner_id,
      fk_user_id: payload.fk_user_id ?? null,
    },
  });
  return { dataRows: 1, data: row as unknown as Checklist };
}

export async function deleteChecklist(
  ownerId: number,
  checklistId: number,
): Promise<{ code: number; message: string; dataRows: number; data: null }> {
  const existing = await prisma.checklist.findFirst({
    where: { checklist_id: checklistId, fk_owner_id: ownerId },
    select: { checklist_active: true },
  });
  if (!existing) throw new Error('Checklist not found or does not belong to the owner.');
  if (existing.checklist_active === 'Y') {
    throw new Error('Cannot delete an active checklist. Please deactivate it first.');
  }
  await prisma.checklist.deleteMany({ where: { checklist_id: checklistId, fk_owner_id: ownerId } });
  return { code: 1, message: 'Checklist deleted successfully', dataRows: 1, data: null };
}