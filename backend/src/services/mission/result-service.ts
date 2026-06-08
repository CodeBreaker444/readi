import { prisma } from '@/lib/prisma';

export interface MissionResultType {
  result_type_id: number;
  result_type_code: string;
  result_type_desc: string;
  fk_owner_id: number;
  is_active: boolean;
}

export async function getMissionResultList(ownerId: number) {
  const rows = await prisma.pilot_mission_result_type.findMany({
    where: { fk_owner_id: ownerId, is_active: true },
    orderBy: { result_type_id: 'asc' },
  });

  return {
    code: 1,
    message: 'Success',
    dataRows: rows.length,
    data: rows.map((item) => ({
      mission_result_id: item.result_type_id,
      mission_result_code: item.result_type_code,
      mission_result_desc: item.result_type_desc || '',
      tot_mission: 0,
    })),
  };
}

export async function addMissionResult(ownerId: number, resultData: {
  code: string;
  description: string;
}) {
  const existing = await prisma.pilot_mission_result_type.findFirst({
    where: { fk_owner_id: ownerId, result_type_code: resultData.code, is_active: true },
    select: { result_type_id: true },
  });

  if (existing) {
    throw new Error('Result code already exists');
  }

  const row = await prisma.pilot_mission_result_type.create({
    data: {
      fk_owner_id: ownerId,
      result_type_code: resultData.code,
      result_type_desc: resultData.description,
      is_active: true,
    },
  });

  return {
    code: 1,
    message: 'Mission result added successfully',
    data: {
      result_id: row.result_type_id,
      result_type: row.result_type_code,
      result_description: row.result_type_desc,
    },
  };
}

export async function deleteMissionResult(ownerId: number, resultId: number) {
  await prisma.pilot_mission_result_type.updateMany({
    where: { result_type_id: resultId, fk_owner_id: ownerId },
    data: { is_active: false },
  });

  return { code: 1, message: 'Mission result deleted successfully' };
}

export async function updateMissionResult(ownerId: number, resultId: number, resultData: {
  code?: string;
  description?: string;
}) {
  if (resultData.code) {
    const existing = await prisma.pilot_mission_result_type.findFirst({
      where: {
        fk_owner_id: ownerId,
        result_type_code: resultData.code,
        is_active: true,
        NOT: { result_type_id: resultId },
      },
      select: { result_type_id: true },
    });

    if (existing) {
      throw new Error('Result code already exists');
    }
  }

  const updateData: { result_type_code?: string; result_type_desc?: string } = {};
  if (resultData.code) updateData.result_type_code = resultData.code;
  if (resultData.description !== undefined) updateData.result_type_desc = resultData.description;

  const row = await prisma.pilot_mission_result_type.update({
    where: { result_type_id: resultId },
    data: updateData,
  });

  return {
    code: 1,
    message: 'Mission result updated successfully',
    data: {
      result_id: row.result_type_id,
      result_type: row.result_type_code,
      result_description: row.result_type_desc,
    },
  };
}
