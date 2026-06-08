import { prisma } from '@/lib/prisma';

export interface Assignment {
  assignment_id: number
  fk_user_id: number
  fk_owner_id: number
  assignment_code: string | null
  assignment_desc: string | null
  assignment_json: Record<string, unknown> | null
  assignment_ver: number | null
  assignment_active: 'Y' | 'N'
  due_date: string | null
  completed_date: string | null
  created_at: string
  updated_at: string
}

export interface AssignmentUpdatePayload {
  assignment_id: number
  assignment_code: string
  assignment_desc: string
  assignment_ver: number
  assignment_active: 'Y' | 'N'
  assignment_json: string
  fk_owner_id: number
  fk_user_id: number
}

function mapAssignment(row: any): Assignment {
  return {
    assignment_id: row.assignment_id,
    fk_user_id: row.fk_user_id,
    fk_owner_id: row.fk_owner_id,
    assignment_code: row.assignment_code ?? null,
    assignment_desc: row.assignment_desc ?? null,
    assignment_json: row.assignment_json as Record<string, unknown> | null,
    assignment_ver: row.assignment_ver != null ? Number(row.assignment_ver) : null,
    assignment_active: (row.assignment_active ?? 'N') as 'Y' | 'N',
    due_date: row.due_date?.toISOString().slice(0, 10) ?? null,
    completed_date: row.completed_date?.toISOString().slice(0, 10) ?? null,
    created_at: row.created_at?.toISOString() ?? '',
    updated_at: row.updated_at?.toISOString() ?? '',
  };
}

export async function getAssignmentsByOwner(ownerId: number): Promise<Assignment[]> {
  const rows = await prisma.assignment.findMany({
    where: { fk_owner_id: ownerId },
    orderBy: { created_at: 'desc' },
  });
  return rows.map(mapAssignment);
}

export async function getAssignmentById(ownerId: number, assignmentId: number): Promise<Assignment | null> {
  const row = await prisma.assignment.findFirst({
    where: { assignment_id: assignmentId, fk_owner_id: ownerId },
  });
  return row ? mapAssignment(row) : null;
}

export async function createAssignment(payload: {
  assignment_code: string
  assignment_desc: string
  assignment_ver: string
  assignment_active: 'Y' | 'N'
  assignment_json: string
  fk_owner_id: number
  fk_user_id: number
}): Promise<Assignment | null> {
  let parsedJson: unknown;
  try {
    parsedJson = payload.assignment_json ? JSON.parse(payload.assignment_json) : null;
  } catch {
    throw new Error('Invalid JSON in assignment_json field');
  }

  const existing = await prisma.assignment.findFirst({
    where: { fk_owner_id: payload.fk_owner_id, assignment_code: payload.assignment_code },
    select: { assignment_id: true },
  });
  if (existing) throw new Error(`Assignment code "${payload.assignment_code}" already exists`);

  const row = await prisma.assignment.create({
    data: {
      fk_owner_id: payload.fk_owner_id,
      fk_user_id: payload.fk_user_id,
      assignment_code: payload.assignment_code,
      assignment_desc: payload.assignment_desc,
      assignment_ver: parseFloat(payload.assignment_ver) || 1.0,
      assignment_active: payload.assignment_active ?? 'Y',
      assignment_json: parsedJson ?? undefined,
    },
  });
  return mapAssignment(row);
}

export async function updateAssignment(payload: AssignmentUpdatePayload): Promise<Assignment | null> {
  let parsedJson: unknown;
  try {
    parsedJson = payload.assignment_json ? JSON.parse(payload.assignment_json) : null;
  } catch {
    throw new Error('Invalid JSON in assignment_json field');
  }

  const existing = await prisma.assignment.findFirst({
    where: { assignment_id: payload.assignment_id, fk_owner_id: payload.fk_owner_id },
    select: { assignment_id: true },
  });
  if (!existing) throw new Error('Assignment not found or access denied');

  const row = await prisma.assignment.update({
    where: { assignment_id: payload.assignment_id },
    data: {
      assignment_code: payload.assignment_code,
      assignment_desc: payload.assignment_desc,
      assignment_ver: payload.assignment_ver,
      assignment_active: payload.assignment_active,
      assignment_json: parsedJson ?? undefined,
      fk_user_id: payload.fk_user_id,
    },
  });
  return mapAssignment(row);
}

export async function deleteAssignment(
  ownerId: number,
  assignmentId: number,
): Promise<{ code: number; message: string; dataRows: number; data: null }> {
  const existing = await prisma.assignment.findFirst({
    where: { assignment_id: assignmentId, fk_owner_id: ownerId },
    select: { assignment_id: true, assignment_active: true },
  });
  if (!existing) throw new Error('Assignment not found');
  if (existing.assignment_active === 'Y') {
    throw new Error('Cannot delete an active assignment. Set it to inactive first.');
  }
  await prisma.assignment.delete({ where: { assignment_id: assignmentId } });
  return { code: 1, message: 'Assignment deleted', dataRows: 0, data: null };
}