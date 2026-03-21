import { supabase } from '@/backend/database/database';

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

export async function listQualifications(
  userId: number,
  ownerId: number
): Promise<UserQualification[]> {
  const { data, error } = await supabase
    .from('user_qualification')
    .select('*')
    .eq('fk_user_id', userId)
    .eq('fk_owner_id', ownerId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to list qualifications: ${error.message}`);
  return (data ?? []) as UserQualification[];
}

export async function createQualifications(
  userId: number,
  ownerId: number,
  qualifications: CreateQualificationInput[]
): Promise<UserQualification[]> {
  const rows = qualifications.map((q) => ({
    fk_user_id: userId,
    fk_owner_id: ownerId,
    qualification_name: q.qualification_name,
    qualification_type: q.qualification_type,
    description: q.description ?? null,
    start_date: q.start_date ?? null,
    expiry_date: q.expiry_date ?? null,
    status: q.status,
  }));

  const { data, error } = await supabase
    .from('user_qualification')
    .insert(rows)
    .select();

  if (error) throw new Error(`Failed to create qualifications: ${error.message}`);
  return (data ?? []) as UserQualification[];
}

export async function deleteQualification(
  qualificationId: number,
  ownerId: number
): Promise<void> {
  const { error } = await supabase
    .from('user_qualification')
    .delete()
    .eq('qualification_id', qualificationId)
    .eq('fk_owner_id', ownerId);

  if (error) throw new Error(`Failed to delete qualification: ${error.message}`);
}
