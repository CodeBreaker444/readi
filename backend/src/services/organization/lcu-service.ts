import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type {
  CreateLucProcedurePayload,
  LucProcedure,
  UpdateLucProcedurePayload,
} from '@/config/types/lcuProcedures';

export async function getLucProcedures(ownerId: number, sector?: string): Promise<LucProcedure[]> {
  const rows = await prisma.luc_procedure.findMany({
    where: {
      fk_owner_id: ownerId,
      ...(sector && { procedure_status: sector }),
    },
    orderBy: { procedure_id: 'asc' },
  });
  return rows as unknown as LucProcedure[];
}

export async function getLucProcedureById(procedureId: number): Promise<LucProcedure | null> {
  const row = await prisma.luc_procedure.findUnique({
    where: { procedure_id: procedureId },
  });
  return row as unknown as LucProcedure | null;
}

export async function createLucProcedure(payload: CreateLucProcedurePayload): Promise<LucProcedure> {
  const row = await prisma.luc_procedure.create({ data: payload as any });
  return row as unknown as LucProcedure;
}

export async function updateLucProcedure(payload: UpdateLucProcedurePayload): Promise<LucProcedure> {
  const { procedure_id, ...fields } = payload;
  const row = await prisma.luc_procedure.update({
    where: { procedure_id },
    data: { ...fields, updated_at: new Date() } as any,
  });
  return row as unknown as LucProcedure;
}

export async function deleteLucProcedure(procedureId: number): Promise<boolean> {
  try {
    await prisma.luc_procedure.delete({ where: { procedure_id: procedureId } });
    return true;
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      throw new Error('This procedure is linked to one or more evaluations and cannot be deleted. Remove the linked evaluations first.');
    }
    throw new Error(`Failed to delete Procedure: ${e.message}`);
  }
}

export async function deactivateLucProcedure(procedureId: number): Promise<LucProcedure> {
  const row = await prisma.luc_procedure.update({
    where: { procedure_id: procedureId },
    data: { procedure_active: 'N', updated_at: new Date() },
  });
  return row as unknown as LucProcedure;
}