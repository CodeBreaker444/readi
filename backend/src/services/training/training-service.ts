import { supabase } from '@/backend/database/database';


export interface TrainingRecord {
  training_id: number;
  fk_owner_id: number;
  training_code: string | null;
  training_name: string;
  training_description: string | null;
  training_type: string | null;
  training_duration: number | null;
  training_cost: number | null;
  trainer_user_id: number | null;
  training_active: string;
  created_at: string;
  updated_at: string;
  trainer_name?: string | null;
  attendance_count?: number;
  completed_count?: number;
}

export interface TrainingAttendanceRecord {
  attendance_id: number;
  fk_training_id: number;
  fk_user_id: number;
  training_session_date: string | null;
  attendance_status: string | null;
  completion_status: string | null;
  score: number | null;
  feedback: string | null;
  certification_issued: boolean;
  certification_number: string | null;
  certification_date: string | null;
  certification_expiry: string | null;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
  training_name?: string | null;
}

export interface CreateTrainingInput {
  owner_id: number;
  training_name: string;
  training_description?: string | null;
  training_type?: string | null;
  training_duration?: number | null;
  training_cost?: number | null;
  trainer_user_id?: number | null;
}

export interface UpdateTrainingInput extends Partial<CreateTrainingInput> {
  training_id: number;
}

export interface AddAttendanceInput {
  training_id: number;
  user_id: number;
  training_session_date?: string | null;
  attendance_status?: string | null;
  completion_status?: string | null;
  score?: number | null;
  feedback?: string | null;
  certification_issued?: boolean;
  certification_number?: string | null;
  certification_date?: string | null;
  certification_expiry?: string | null;
}

export interface TrainingListParams {
  owner_id: number;
  q?: string;
  training_type?: string;
  training_active?: string;
  page?: number;
  page_size?: number;
}

export interface TrainingCalendarEvent {
  id: string;
  title: string;
  start: string;
  color: string;
  training_id: number;
  attendance_id: number;
  user_name: string | null;
  training_name: string;
  completion_status: string | null;
}


export async function getTrainingList(params: TrainingListParams): Promise<{
  data: TrainingRecord[];
  total: number;
}> {
  const { owner_id, q, training_type, training_active = 'Y', page = 1, page_size = 20 } = params;
  const offset = (page - 1) * page_size;

  let query = supabase
    .from('training')
    .select(
      `
      *,
      trainer:trainer_user_id (
        first_name,
        last_name
      ),
      training_attendance (
        attendance_id,
        completion_status
      )
    `,
      { count: 'exact' }
    )
    .eq('fk_owner_id', owner_id);

  if (training_active) {
    query = query.eq('training_active', training_active);
  }
  if (training_type) {
    query = query.eq('training_type', training_type);
  }
  if (q) {
    query = query.ilike('training_name', `%${q}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + page_size - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch training list: ${error.message}`);

  const records: TrainingRecord[] = (data || []).map((row: any) => ({
    ...row,
    trainer_name: row.trainer
      ? `${row.trainer.first_name ?? ''} ${row.trainer.last_name ?? ''}`.trim() || null
      : null,
    attendance_count: (row.training_attendance ?? []).length,
    completed_count: (row.training_attendance ?? []).filter(
      (a: any) => a.completion_status === 'COMPLETED'
    ).length,
    trainer: undefined,
    training_attendance: undefined,
  }));

  return { data: records, total: count ?? 0 };
}

export async function getTrainingById(training_id: number): Promise<TrainingRecord | null> {
  const { data, error } = await supabase
    .from('training')
    .select(
      `
      *,
      trainer:trainer_user_id (
        first_name,
        last_name
      )
    `
    )
    .eq('training_id', training_id)
    .single();

  if (error) throw new Error(`Failed to fetch training: ${error.message}`);
  if (!data) return null;

  return {
    ...data,
    trainer_name: data.trainer
      ? `${data.trainer.first_name ?? ''} ${data.trainer.last_name ?? ''}`.trim() || null
      : null,
    trainer: undefined,
  };
}

export async function createTraining(input: CreateTrainingInput): Promise<number> {
  const { owner_id, training_name, training_description, training_type, training_duration, training_cost, trainer_user_id } = input;

  const { data, error } = await supabase
    .from('training')
    .insert({
      fk_owner_id: owner_id,
      training_name,
      training_description: training_description ?? null,
      training_type: training_type ?? null,
      training_duration: training_duration ?? null,
      training_cost: training_cost ?? null,
      trainer_user_id: trainer_user_id ?? null,
      training_active: 'Y',
    })
    .select('training_id')
    .single();

  if (error) throw new Error(`Failed to create training: ${error.message}`);
  return data.training_id;
}

export async function updateTraining(input: UpdateTrainingInput): Promise<void> {
  const { training_id, owner_id, training_name, training_description, training_type, training_duration, training_cost, trainer_user_id } = input;

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (training_name !== undefined) updates.training_name = training_name;
  if (training_description !== undefined) updates.training_description = training_description;
  if (training_type !== undefined) updates.training_type = training_type;
  if (training_duration !== undefined) updates.training_duration = training_duration;
  if (training_cost !== undefined) updates.training_cost = training_cost;
  if (trainer_user_id !== undefined) updates.trainer_user_id = trainer_user_id;

  const { error } = await supabase
    .from('training')
    .update(updates)
    .eq('training_id', training_id);

  if (error) throw new Error(`Failed to update training: ${error.message}`);
}

export async function deleteTraining(training_id: number): Promise<void> {
  const { error } = await supabase
    .from('training')
    .delete()
    .eq('training_id', training_id);

  if (error) throw new Error(`Failed to delete training: ${error.message}`);
}

export async function getTrainingAttendance(training_id: number): Promise<TrainingAttendanceRecord[]> {
  const { data, error } = await supabase
    .from('training_attendance')
    .select(
      `
      *,
      user:fk_user_id (
        first_name,
        last_name,
        email
      )
    `
    )
    .eq('fk_training_id', training_id)
    .order('training_session_date', { ascending: false });

  if (error) throw new Error(`Failed to fetch attendance: ${error.message}`);

  return (data || []).map((row: any) => ({
    ...row,
    user_name: row.user
      ? `${row.user.first_name ?? ''} ${row.user.last_name ?? ''}`.trim() || null
      : null,
    user_email: row.user?.email ?? null,
    user: undefined,
  }));
}

export async function addTrainingAttendance(input: AddAttendanceInput): Promise<number> {
  const { data, error } = await supabase
    .from('training_attendance')
    .insert({
      fk_training_id: input.training_id,
      fk_user_id: input.user_id,
      training_session_date: input.training_session_date ?? null,
      attendance_status: input.attendance_status ?? 'PRESENT',
      completion_status: input.completion_status ?? 'IN_PROGRESS',
      score: input.score ?? null,
      feedback: input.feedback ?? null,
      certification_issued: input.certification_issued ?? false,
      certification_number: input.certification_number ?? null,
      certification_date: input.certification_date ?? null,
      certification_expiry: input.certification_expiry ?? null,
    })
    .select('attendance_id')
    .single();

  if (error) throw new Error(`Failed to add attendance: ${error.message}`);
  return data.attendance_id;
}

export async function deleteTrainingAttendance(attendance_id: number): Promise<void> {
  const { error } = await supabase
    .from('training_attendance')
    .delete()
    .eq('attendance_id', attendance_id);

  if (error) throw new Error(`Failed to delete attendance: ${error.message}`);
}

export async function getTrainingCalendarEvents(owner_id: number): Promise<TrainingCalendarEvent[]> {
  const { data, error } = await supabase
    .from('training_attendance')
    .select(
      `
      attendance_id,
      training_session_date,
      completion_status,
      user:fk_user_id (
        first_name,
        last_name
      ),
      training:fk_training_id (
        training_id,
        training_name,
        fk_owner_id
      )
    `
    )
    .not('training_session_date', 'is', null)
    .order('training_session_date', { ascending: true });

  if (error) throw new Error(`Failed to fetch training calendar: ${error.message}`);

  const STATUS_COLORS: Record<string, string> = {
    COMPLETED: '#2e7d32',
    IN_PROGRESS: '#1976d2',
    FAILED: '#c62828',
    ABSENT: '#ef6c00',
  };

  return (data || [])
    .filter((row: any) => row.training?.fk_owner_id === owner_id)
    .map((row: any) => {
      const userName = row.user
        ? `${row.user.first_name ?? ''} ${row.user.last_name ?? ''}`.trim()
        : 'Unknown';
      const trainingName = row.training?.training_name ?? 'Training';
      const status = row.completion_status ?? 'IN_PROGRESS';
      return {
        id: String(row.attendance_id),
        title: `${trainingName} – ${userName}`,
        start: row.training_session_date,
        color: STATUS_COLORS[status] ?? '#6a1b9a',
        training_id: row.training?.training_id ?? 0,
        attendance_id: row.attendance_id,
        user_name: userName,
        training_name: trainingName,
        completion_status: row.completion_status,
      };
    });
}

// ─── Flat per-user training records ──────────────────────────────────────────

export interface FlatTrainingRecord {
  attendance_id: number;
  fk_training_id: number;
  fk_user_id: number;
  user_name: string | null;
  user_role: string | null;
  training_name: string;
  training_type: string | null;
  session_code: string | null;
  completion_date: string | null;
  expiry_date: string | null;
  status: 'VALID' | 'EXPIRED' | null;
}

export interface AddFlatTrainingInput {
  owner_id: number;
  user_ids: number[];
  training_name: string;
  training_type?: string | null;
  session_code?: string | null;
  completion_date?: string | null;
  expiry_date?: string | null;
}

export interface UpdateFlatTrainingInput {
  attendance_id: number;
  fk_training_id: number;
  training_name: string;
  training_type?: string | null;
  session_code?: string | null;
  completion_date?: string | null;
  expiry_date?: string | null;
}

export async function getFlatTrainingList(owner_id: number): Promise<FlatTrainingRecord[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('training_attendance')
    .select(
      `
      attendance_id,
      fk_training_id,
      fk_user_id,
      certification_number,
      certification_date,
      certification_expiry,
      training:fk_training_id!inner (
        training_id,
        training_name,
        training_type,
        fk_owner_id
      ),
      user:fk_user_id (
        first_name,
        last_name,
        user_role
      )
    `
    )
    .eq('training.fk_owner_id', owner_id)
    .order('certification_expiry', { ascending: false, nullsFirst: false });

  if (error) throw new Error(`Failed to fetch training records: ${error.message}`);

  return (data || []).map((row: any) => {
    const expiryDate = row.certification_expiry as string | null;
    let status: 'VALID' | 'EXPIRED' | null = null;
    if (expiryDate) {
      status = expiryDate >= today ? 'VALID' : 'EXPIRED';
    }
    return {
      attendance_id: row.attendance_id,
      fk_training_id: row.fk_training_id,
      fk_user_id: row.fk_user_id,
      user_name: row.user
        ? `${row.user.first_name ?? ''} ${row.user.last_name ?? ''}`.trim() || null
        : null,
      user_role: row.user?.user_role ?? null,
      training_name: row.training?.training_name ?? '',
      training_type: row.training?.training_type ?? null,
      session_code: row.certification_number ?? null,
      completion_date: row.certification_date ?? null,
      expiry_date: row.certification_expiry ?? null,
      status,
    };
  });
}

export async function addFlatTraining(input: AddFlatTrainingInput): Promise<number[]> {
  const { owner_id, user_ids, training_name, training_type, session_code, completion_date, expiry_date } = input;

  // Create new training catalog entry for this session
  const { data: created, error: createErr } = await supabase
    .from('training')
    .insert({
      fk_owner_id: owner_id,
      training_name,
      training_type: training_type ?? null,
      training_active: 'Y',
    })
    .select('training_id')
    .single();

  if (createErr) throw new Error(`Failed to create training: ${createErr.message}`);
  const trainingId = created.training_id;

  const rows = user_ids.map((uid) => ({
    fk_training_id: trainingId,
    fk_user_id: uid,
    certification_number: session_code ?? null,
    certification_date: completion_date ?? null,
    certification_expiry: expiry_date ?? null,
    certification_issued: !!completion_date,
    completion_status: completion_date ? 'COMPLETED' : 'IN_PROGRESS',
    attendance_status: 'PRESENT',
  }));

  const { data: inserted, error: insErr } = await supabase
    .from('training_attendance')
    .insert(rows)
    .select('attendance_id');

  if (insErr) throw new Error(`Failed to add attendance records: ${insErr.message}`);
  return (inserted || []).map((r: any) => r.attendance_id);
}

export async function updateFlatTraining(input: UpdateFlatTrainingInput): Promise<void> {
  const { attendance_id, fk_training_id, training_name, training_type, session_code, completion_date, expiry_date } = input;

  await supabase
    .from('training')
    .update({ training_name, training_type: training_type ?? null, updated_at: new Date().toISOString() })
    .eq('training_id', fk_training_id);

  const { error } = await supabase
    .from('training_attendance')
    .update({
      certification_number: session_code ?? null,
      certification_date: completion_date ?? null,
      certification_expiry: expiry_date ?? null,
      certification_issued: !!completion_date,
      completion_status: completion_date ? 'COMPLETED' : 'IN_PROGRESS',
    })
    .eq('attendance_id', attendance_id);

  if (error) throw new Error(`Failed to update training record: ${error.message}`);
}

export async function deleteFlatTraining(attendance_id: number): Promise<void> {
  const { error } = await supabase
    .from('training_attendance')
    .delete()
    .eq('attendance_id', attendance_id);

  if (error) throw new Error(`Failed to delete training record: ${error.message}`);
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getTrainingUsers(owner_id: number, q?: string): Promise<Array<{
  user_id: number;
  full_name: string;
  email: string;
}>> {
  let query = supabase
    .from('users')
    .select(
      `
      user_id,
      first_name,
      last_name,
      email,
      user_owner!inner (
        fk_owner_id
      )
    `
    )
    .eq('user_active', 'Y')
    .eq('user_owner.fk_owner_id', owner_id);

  if (q) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  query = query.order('first_name', { ascending: true }).limit(100);

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch training users: ${error.message}`);

  return (data || []).map((u: any) => ({
    user_id: u.user_id,
    full_name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
    email: u.email,
  }));
}
