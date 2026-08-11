import { prisma } from '@/lib/prisma';

export interface DepartmentRow {
  department_id: number;
  department_name: string;
}

export async function getDepartments(ownerId: number): Promise<DepartmentRow[]> {
  return prisma.department_config.findMany({
    where: { fk_owner_id: ownerId },
    select: { department_id: true, department_name: true },
    orderBy: { department_name: 'asc' },
  });
}

export async function createDepartment(ownerId: number, name: string): Promise<DepartmentRow> {
  const normalized = name.trim();
  if (!normalized) throw new Error('Department name is required.');

  const existing = await prisma.department_config.findFirst({
    where: {
      fk_owner_id: ownerId,
      department_name: { equals: normalized, mode: 'insensitive' },
    },
    select: { department_id: true },
  });
  if (existing) throw new Error('A department with this name already exists.');

  return prisma.department_config.create({
    data: { department_name: normalized, fk_owner_id: ownerId },
    select: { department_id: true, department_name: true },
  });
}

export interface DepartmentUsageRow {
  user_id: number;
  fullname: string;
}

export async function getUsersUsingDepartment(ownerId: number, departmentName: string): Promise<DepartmentUsageRow[]> {
  const users = await prisma.public_users.findMany({
    where: { fk_owner_id: ownerId, department: departmentName },
    select: { user_id: true, first_name: true, last_name: true, username: true },
  });

  return users.map((u) => ({
    user_id: u.user_id,
    fullname: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || `#${u.user_id}`,
  }));
}

export async function updateDepartment(
  ownerId: number,
  departmentId: number,
  name: string,
): Promise<void> {
  const normalized = name.trim();
  if (!normalized) throw new Error('Department name is required.');

  const dept = await prisma.department_config.findFirst({
    where: { department_id: departmentId, fk_owner_id: ownerId },
    select: { department_name: true },
  });
  if (!dept) throw new Error('Department not found.');

  const duplicate = await prisma.department_config.findFirst({
    where: {
      fk_owner_id: ownerId,
      department_name: { equals: normalized, mode: 'insensitive' },
      department_id: { not: departmentId },
    },
    select: { department_id: true },
  });
  if (duplicate) throw new Error('A department with this name already exists.');

  await prisma.$transaction([
    prisma.department_config.update({
      where: { department_id: departmentId },
      data: { department_name: normalized },
    }),
    prisma.public_users.updateMany({
      where: { fk_owner_id: ownerId, department: dept.department_name },
      data: { department: normalized },
    }),
  ]);
}

export async function deleteDepartment(ownerId: number, departmentId: number): Promise<void> {
  const dept = await prisma.department_config.findFirst({
    where: { department_id: departmentId, fk_owner_id: ownerId },
    select: { department_name: true },
  });
  if (!dept) throw new Error('Department not found.');

  const usage = await getUsersUsingDepartment(ownerId, dept.department_name);
  if (usage.length > 0) {
    throw new Error(`Cannot delete: ${usage.length} user${usage.length > 1 ? 's' : ''} assigned to this department.`);
  }

  await prisma.department_config.delete({ where: { department_id: departmentId } });
}
