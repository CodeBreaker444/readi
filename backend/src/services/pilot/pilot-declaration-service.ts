import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface PilotDeclarationPayload {
  fk_user_id: number;
  fk_tool_id?: number | null;
  declaration_type: string;
  declaration_data: Record<string, unknown>;
}

export interface PilotDeclaration {
  declaration_id: number;
  fk_user_id: number;
  fk_tool_id: number | null;
  declaration_type: string | null;
  declaration_date: string | null;
  declaration_data: Record<string, unknown> | null;
  checklist_completed: boolean;
  declared_at: string | null;
}

function mapDeclaration(row: any): PilotDeclaration {
  return {
    declaration_id: row.declaration_id,
    fk_user_id: row.fk_user_id,
    fk_tool_id: row.fk_tool_id ?? null,
    declaration_type: row.declaration_type ?? null,
    declaration_date: row.declaration_date?.toISOString().slice(0, 10) ?? null,
    declaration_data: row.declaration_data as Record<string, unknown> | null,
    checklist_completed: row.checklist_completed ?? false,
    declared_at: row.declared_at?.toISOString() ?? null,
  };
}

export async function checkDailyDeclaration(userId: number): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  const record = await prisma.pilot_declaration.findFirst({
    where: {
      fk_user_id: userId,
      declaration_date: new Date(today),
      checklist_completed: true,
    },
    select: { declaration_id: true },
  });

  return record !== null;
}

export async function insertPilotDeclaration(
  payload: PilotDeclarationPayload,
): Promise<PilotDeclaration> {
  const today = new Date().toISOString().split('T')[0];

  const row = await prisma.pilot_declaration.upsert({
    where: {
      fk_user_id_declaration_date_declaration_type: {
        fk_user_id: payload.fk_user_id,
        declaration_date: new Date(today),
        declaration_type: payload.declaration_type,
      },
    },
    update: {
      fk_tool_id: payload.fk_tool_id ?? null,
      declaration_data: payload.declaration_data as unknown as Prisma.InputJsonValue,
      checklist_completed: true,
      declared_at: new Date(),
    },
    create: {
      fk_user_id: payload.fk_user_id,
      fk_tool_id: payload.fk_tool_id ?? null,
      declaration_type: payload.declaration_type,
      declaration_date: new Date(today),
      declaration_data: payload.declaration_data as unknown as Prisma.InputJsonValue,
      checklist_completed: true,
      declared_at: new Date(),
    },
  });

  return mapDeclaration(row);
}

export async function getPilotDeclarations(
  userId: number,
  date?: string,
): Promise<PilotDeclaration[]> {
  const rows = await prisma.pilot_declaration.findMany({
    where: {
      fk_user_id: userId,
      ...(date && { declaration_date: new Date(date) }),
    },
    orderBy: { declared_at: 'desc' },
  });

  return rows.map(mapDeclaration);
}
