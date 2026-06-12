import { prisma } from '@/lib/prisma';

export interface MissionCategory {
  mission_category_id: number;
  mission_category_desc: string;
  tot_mission?: number;
  fk_owner_id: number;
}

export async function getMissionCategoryList(ownerId: number) {
  const data = await prisma.pilot_mission_category.findMany({
    where: { fk_owner_id: ownerId, is_active: true },
    orderBy: { category_id: 'asc' },
    select: {
      category_id:          true,
      category_code:        true,
      category_name:        true,
      category_description: true,
      is_active:            true,
    },
  });

  return {
    code:     1,
    message:  'Success',
    dataRows: data.length,
    data:     data.map((item) => ({
      mission_category_id:   item.category_id,
      mission_category_code: item.category_code,
      mission_category_name: item.category_name,
      mission_category_desc: item.category_description,
      tot_mission:           0,
    })),
  };
}

export async function addMissionCategory(
  ownerId: number,
  categoryData: { code: string; name: string; description?: string },
) {
  const existing = await prisma.pilot_mission_category.findFirst({
    where: { fk_owner_id: ownerId, category_code: categoryData.code, is_active: true },
    select: { category_id: true },
  });

  if (existing) throw new Error('Category code already exists');

  const created = await prisma.pilot_mission_category.create({
    data: {
      fk_owner_id:          ownerId,
      category_code:        categoryData.code,
      category_name:        categoryData.name,
      category_description: categoryData.description ?? categoryData.name,
      is_active:            true,
    },
  });

  return { code: 1, message: 'Mission category added successfully', data: created };
}

export async function deleteMissionCategory(ownerId: number, categoryId: number) {
  const row = await prisma.pilot_mission_category.findFirst({
    where:  { category_id: categoryId, fk_owner_id: ownerId },
    select: { category_code: true, category_name: true },
  });

  await prisma.pilot_mission_category.update({
    where: { category_id: categoryId },
    data:  { is_active: false },
  });

  return {
    code: 1,
    message: 'Mission category deleted successfully',
    categoryCode: row?.category_code ?? null,
    categoryName: row?.category_name ?? null,
  };
}

export async function updateMissionCategory(
  ownerId: number,
  categoryId: number,
  categoryData: { code?: string; name?: string; description?: string },
) {
  if (categoryData.code) {
    const existing = await prisma.pilot_mission_category.findFirst({
      where: {
        fk_owner_id:   ownerId,
        category_code: categoryData.code,
        is_active:     true,
        NOT:           { category_id: categoryId },
      },
      select: { category_id: true },
    });

    if (existing) throw new Error('Category code already exists');
  }

  const updated = await prisma.pilot_mission_category.update({
    where: { category_id: categoryId },
    data: {
      ...(categoryData.code        && { category_code:        categoryData.code }),
      ...(categoryData.name        && { category_name:        categoryData.name }),
      ...(categoryData.description !== undefined && { category_description: categoryData.description }),
    },
  });

  return { code: 1, message: 'Mission category updated successfully', data: updated };
}
