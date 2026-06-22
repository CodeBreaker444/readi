import { prisma } from '@/lib/prisma';

export interface MissionType {
  mission_type_id: number;
  mission_type_name: string;
  mission_type_desc: string;
  mission_type_code: string;
  mission_type_label: string;
  tot_mission?: number;
  fk_owner_id: number;
}

export async function getMissionTypeList(ownerId: number) {
  const data = await prisma.pilot_mission_type.findMany({
    where: { fk_owner_id: ownerId, is_active: true },
    select: {
      mission_type_id:  true,
      type_name:        true,
      type_code:        true,
      type_description: true,
    },
  });

  return {
    code:     1,
    message:  'Success',
    dataRows: data.length,
    data:     data.map((item) => ({
      id:          item.mission_type_id,
      name:        item.type_name,
      code:        item.type_code,
      label:       item.type_description,
      tot_mission: 0,
    })),
  };
}

export async function addMissionType(
  ownerId: number,
  missionType: Omit<MissionType, 'mission_type_id'>,
) {
  const existing = await prisma.pilot_mission_type.findFirst({
    where: { fk_owner_id: ownerId, type_code: missionType.mission_type_code, is_active: true },
    select: { mission_type_id: true },
  });

  if (existing) throw new Error('Mission type code already exists');

  const created = await prisma.pilot_mission_type.create({
    data: {
      type_name:        missionType.mission_type_name,
      fk_owner_id:      ownerId,
      type_code:        missionType.mission_type_code,
      type_description: missionType.mission_type_label,
      is_active:        true,
    },
  });

  return {
    code: 1,
    message: 'Mission type added successfully',
    data: created,
  };
}

 

export async function deleteMissionType(ownerId: number, missionTypeId: number) {
  const row = await prisma.pilot_mission_type.findFirst({
    where:  { mission_type_id: missionTypeId, fk_owner_id: ownerId },
    select: { type_code: true, type_name: true },
  });

  await prisma.pilot_mission_type.update({
    where: { mission_type_id: missionTypeId },
    data:  { is_active: false },
  });

  return {
    code: 1,
    message: 'Mission type deleted successfully',
    typeCode: row?.type_code ?? null,
    typeName: row?.type_name ?? null,
  };
}

export async function updateMissionType(
  ownerId: number,
  missionTypeId: number,
  missionType: Partial<MissionType>,
) {
  if (missionType.mission_type_code) {
    const existing = await prisma.pilot_mission_type.findFirst({
      where: {
        fk_owner_id: ownerId,
        type_code:   missionType.mission_type_code,
        is_active:   true,
        NOT:         { mission_type_id: missionTypeId },
      },
      select: { mission_type_id: true },
    });

    if (existing) throw new Error('Mission type code already exists');
  }

  const updated = await prisma.pilot_mission_type.update({
    where: { mission_type_id: missionTypeId },
    data: {
      ...(missionType.mission_type_name  && { type_name:        missionType.mission_type_name }),
      ...(missionType.mission_type_code  && { type_code:        missionType.mission_type_code }),
      ...(missionType.mission_type_label && { type_description: missionType.mission_type_label }),
    },
  });

  return { code: 1, message: 'Mission type updated successfully', data: updated };
}
