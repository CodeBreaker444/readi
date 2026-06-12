import { prisma } from '@/lib/prisma';

export async function getMissionStatusList(ownerId: number) {
  const rows = await prisma.pilot_mission_status.findMany({
    where: { fk_owner_id: ownerId, is_active: true },
    select: {
      status_id: true,
      status_code: true,
      status_name: true,
      status_description: true,
      status_order: true,
      is_final_status: true,
      is_active: true,
    },
    orderBy: { status_order: 'asc' },
  });

  return {
    code: 1,
    message: 'Success',
    dataRows: rows.length,
    data: rows.map((item) => ({
      mission_status_id: item.status_id,
      mission_status_code: item.status_code,
      mission_status_name: item.status_name,
      mission_status_desc: item.status_description,
      status_order: item.status_order,
      is_final_status: item.is_final_status,
      tot_mission: 0,
    })),
  };
}

export async function addMissionStatus(ownerId: number, statusData: {
  code: string;
  name: string;
  description?: string;
  order?: number;
  isFinalStatus?: boolean;
}) {
  const existing = await prisma.pilot_mission_status.findFirst({
    where: { fk_owner_id: ownerId, status_code: statusData.code, is_active: true },
    select: { status_id: true },
  });

  if (existing) {
    throw new Error('Status code already exists');
  }

  const row = await prisma.pilot_mission_status.create({
    data: {
      status_code: statusData.code,
      status_name: statusData.name,
      status_description: statusData.description || statusData.name,
      status_order: statusData.order || 0,
      is_final_status: statusData.isFinalStatus || false,
      fk_owner_id: ownerId,
      is_active: true,
    },
  });

  return { code: 1, message: 'Mission status added successfully', data: row };
}

export async function deleteMissionStatus(ownerId: number, statusId: number) {
  const row = await prisma.pilot_mission_status.findFirst({
    where:  { status_id: statusId, fk_owner_id: ownerId },
    select: { status_code: true, status_name: true },
  });

  await prisma.pilot_mission_status.update({
    where: { status_id: statusId },
    data:  { is_active: false },
  });

  return {
    code: 1,
    message: 'Mission status deleted successfully',
    statusCode: row?.status_code ?? null,
    statusName: row?.status_name ?? null,
  };
}

export async function updateMissionStatus(ownerId: number, statusId: number, statusData: {
  code?: string;
  name?: string;
  description?: string;
  order?: number;
  isFinalStatus?: boolean;
}) {
  if (statusData.code) {
    const existing = await prisma.pilot_mission_status.findFirst({
      where: {
        fk_owner_id: ownerId,
        status_code: statusData.code,
        is_active: true,
        NOT: { status_id: statusId },
      },
      select: { status_id: true },
    });

    if (existing) {
      throw new Error('Status code already exists');
    }
  }

  const updateData: {
    status_code?: string;
    status_name?: string;
    status_description?: string;
    status_order?: number;
    is_final_status?: boolean;
  } = {};
  if (statusData.code) updateData.status_code = statusData.code;
  if (statusData.name) updateData.status_name = statusData.name;
  if (statusData.description !== undefined) updateData.status_description = statusData.description;
  if (statusData.order !== undefined) updateData.status_order = statusData.order;
  if (statusData.isFinalStatus !== undefined) updateData.is_final_status = statusData.isFinalStatus;

  const row = await prisma.pilot_mission_status.update({
    where: { status_id: statusId },
    data: updateData,
  });

  return { code: 1, message: 'Mission status updated successfully', data: row };
}
