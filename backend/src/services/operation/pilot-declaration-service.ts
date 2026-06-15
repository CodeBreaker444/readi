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

export async function checkDailyDeclaration(userId: number): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  const data = await prisma.pilot_declaration.findFirst({
    where: {
      fk_user_id: userId,
      declaration_date: new Date(today),
      checklist_completed: true,
    },
    select: { declaration_id: true },
  });

  return data !== null;
}

export async function insertPilotDeclaration(
  payload: PilotDeclarationPayload
): Promise<PilotDeclaration> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  const existing = await prisma.pilot_declaration.findFirst({
    where: {
      fk_user_id: payload.fk_user_id,
      declaration_date: new Date(today),
      declaration_type: payload.declaration_type,
    },
    select: { declaration_id: true },
  });

  if (existing) {
    const data = await prisma.pilot_declaration.update({
      where: { declaration_id: existing.declaration_id },
      data: {
        fk_tool_id: payload.fk_tool_id ?? null,
        declaration_data: payload.declaration_data as any,
        checklist_completed: true,
        declared_at: now,
      },
    });
    return data as unknown as PilotDeclaration;
  }

  const data = await prisma.pilot_declaration.create({
    data: {
      fk_user_id: payload.fk_user_id,
      fk_tool_id: payload.fk_tool_id ?? null,
      declaration_type: payload.declaration_type,
      declaration_date: new Date(today),
      declaration_data: payload.declaration_data as any,
      checklist_completed: true,
      declared_at: now,
    },
  });

  return data as unknown as PilotDeclaration;
}

export async function getPilotDeclarations(
  userId: number,
  date?: string
): Promise<PilotDeclaration[]> {
  const data = await prisma.pilot_declaration.findMany({
    where: {
      fk_user_id: userId,
      ...(date && { declaration_date: new Date(date) }),
    },
    orderBy: { declared_at: 'desc' },
  });

  return data as unknown as PilotDeclaration[];
}
