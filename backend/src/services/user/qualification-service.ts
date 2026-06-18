import { prisma } from '@/lib/prisma';

export interface UserQualification {
  qualification_id: number;
  fk_user_id: number;
  fk_owner_id: number;
  qualification_name: string;
  qualification_type: string;
  description: string | null;
  start_date: string | null;
  expiry_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualificationInput {
  qualification_name: string;
  qualification_type: string;
  description?: string | null;
  start_date?: string | null;
  expiry_date?: string | null;
  status: string;
}

function mapQualification(row: {
  qualification_id: number;
  fk_user_id: number;
  fk_owner_id: number;
  qualification_name: string;
  qualification_type: string;
  description: string | null;
  start_date: Date | null;
  expiry_date: Date | null;
  status: string;
  created_at: Date | null;
  updated_at: Date | null;
}): UserQualification {
  return {
    qualification_id: row.qualification_id,
    fk_user_id: row.fk_user_id,
    fk_owner_id: row.fk_owner_id,
    qualification_name: row.qualification_name,
    qualification_type: row.qualification_type,
    description: row.description,
    start_date: row.start_date ? row.start_date.toISOString().slice(0, 10) : null,
    expiry_date: row.expiry_date ? row.expiry_date.toISOString().slice(0, 10) : null,
    status: row.status,
    created_at: row.created_at?.toISOString() ?? '',
    updated_at: row.updated_at?.toISOString() ?? '',
  };
}

export async function listQualifications(
  userId: number,
  ownerId: number
): Promise<UserQualification[]> {
  const rows = await prisma.user_qualification.findMany({
    where: { fk_user_id: userId, fk_owner_id: ownerId },
    orderBy: { created_at: 'asc' },
  });
  return rows.map(mapQualification);
}

export async function createQualifications(
  userId: number,
  ownerId: number,
  qualifications: CreateQualificationInput[]
): Promise<UserQualification[]> {
  const created = await prisma.$transaction(
    qualifications.map((q) =>
      prisma.user_qualification.create({
        data: {
          fk_user_id: userId,
          fk_owner_id: ownerId,
          qualification_name: q.qualification_name,
          qualification_type: q.qualification_type,
          description: q.description ?? null,
          start_date: q.start_date ? new Date(q.start_date) : null,
          expiry_date: q.expiry_date ? new Date(q.expiry_date) : null,
          status: q.status,
        },
      })
    )
  );
  return created.map(mapQualification);
}

export async function deleteQualification(
  qualificationId: number,
  ownerId: number
): Promise<void> {
  await prisma.user_qualification.deleteMany({
    where: { qualification_id: qualificationId, fk_owner_id: ownerId },
  });
}
