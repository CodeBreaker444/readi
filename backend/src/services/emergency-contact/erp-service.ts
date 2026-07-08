import { prisma } from '@/lib/prisma';
import { EmergencyResponsePlan, ErpCreateInput, ErpListInput } from "@/config/types/erp";

function mapRow(row: any): EmergencyResponsePlan {
  return {
    id: Number(row.erp_id),
    description: row.description,
    contact: row.contact,
    type: row.erp_type as EmergencyResponsePlan['type'],
    owner_id: row.fk_owner_id,
    created_at: row.created_at?.toISOString() ?? '',
    updated_at: row.updated_at?.toISOString() ?? '',
  };
}

export async function listErp(input: ErpListInput): Promise<EmergencyResponsePlan[]> {
  const rows = await prisma.emergency_response_plan.findMany({
    where: { fk_owner_id: input.owner_id },
    orderBy: { created_at: 'desc' },
  });
  return rows.map(mapRow);
}

export async function listErpByCompany(ownerId: number): Promise<EmergencyResponsePlan[]> {
  const rows = await prisma.emergency_response_plan.findMany({
    where: { fk_owner_id: ownerId },
    orderBy: { created_at: 'desc' },
  });
  return rows.map(mapRow);
}

export async function createErp(input: ErpCreateInput): Promise<EmergencyResponsePlan> {
  const row = await prisma.emergency_response_plan.create({
    data: {
      description: input.description,
      contact: input.contact,
      erp_type: input.type,
      fk_owner_id: input.owner_id,
    },
  });
  return mapRow(row);
}

export async function updateErp(id: number, input: Omit<ErpCreateInput, 'owner_id'>): Promise<EmergencyResponsePlan> {
  const row = await prisma.emergency_response_plan.update({
    where: { erp_id: BigInt(id) },
    data: {
      description: input.description,
      contact: input.contact,
      erp_type: input.type,
    },
  });
  return mapRow(row);
}

export async function deleteErp(id: number): Promise<void> {
  await prisma.emergency_response_plan.delete({
    where: { erp_id: BigInt(id) },
  });
}
