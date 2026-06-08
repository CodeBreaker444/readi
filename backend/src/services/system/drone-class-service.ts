'use server';

import { prisma } from '@/lib/prisma';

export interface DroneClassRow {
  class_id: number;
  class_value: string;
  class_label: string;
}

const DEFAULT_CLASSES = [
  { class_value: 'C0', class_label: 'Class C0 (< 250 g)' },
  { class_value: 'C1', class_label: 'Class C1 (< 900 g)' },
  { class_value: 'C2', class_label: 'Class C2 (< 4 kg)' },
  { class_value: 'C3', class_label: 'Class C3 (< 25 kg)' },
  { class_value: 'C4', class_label: 'Class C4 (≥ 25 kg)' },
  { class_value: 'C5', class_label: 'Class C5 (STS-01)' },
  { class_value: 'C6', class_label: 'Class C6 (STS-02)' },
];

export async function getDroneClasses(ownerId: number): Promise<DroneClassRow[]> {
  try {
    const data = await prisma.drone_class_config.findMany({
      where: { fk_owner_id: ownerId },
      select: { class_id: true, class_value: true, class_label: true },
      orderBy: { class_label: 'asc' },
    });

    if (!data || data.length === 0) {
      try {
        const created = await prisma.$transaction(
          DEFAULT_CLASSES.map((c) =>
            prisma.drone_class_config.create({
              data: { ...c, fk_owner_id: ownerId },
              select: { class_id: true, class_value: true, class_label: true },
            })
          )
        );
        return created;
      } catch {
        return DEFAULT_CLASSES.map((c, i) => ({ class_id: i + 1, ...c }));
      }
    }

    return data;
  } catch {
    return DEFAULT_CLASSES.map((c, i) => ({ class_id: i + 1, ...c }));
  }
}

export async function createDroneClass(
  ownerId: number,
  classValue: string,
  classLabel: string,
): Promise<DroneClassRow> {
  const normalized = classValue.trim().toUpperCase();

  const existing = await prisma.drone_class_config.findFirst({
    where: { fk_owner_id: ownerId, class_value: normalized },
    select: { class_id: true },
  });

  if (existing) throw new Error('A drone class with this value already exists.');

  return prisma.drone_class_config.create({
    data: { class_value: normalized, class_label: classLabel.trim(), fk_owner_id: ownerId },
    select: { class_id: true, class_value: true, class_label: true },
  });
}

export async function updateDroneClass(
  ownerId: number,
  classId: number,
  classLabel: string,
): Promise<void> {
  await prisma.drone_class_config.updateMany({
    where: { class_id: classId, fk_owner_id: ownerId },
    data: { class_label: classLabel.trim() },
  });
}

export async function deleteDroneClass(ownerId: number, classId: number): Promise<void> {
  await prisma.drone_class_config.deleteMany({
    where: { class_id: classId, fk_owner_id: ownerId },
  });
}
