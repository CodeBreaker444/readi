import { prisma } from '@/lib/prisma';


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

  const where = {
    fk_owner_id: owner_id,
    ...(training_active && { training_active }),
    ...(training_type && { training_type }),
    ...(q && { training_name: { contains: q, mode: 'insensitive' as const } }),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.training.count({ where }),
    prisma.training.findMany({
      where,
      include: {
        users: { select: { first_name: true, last_name: true } },
        training_attendance: { select: { attendance_id: true, completion_status: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: page_size,
    }),
  ]);

  const records: TrainingRecord[] = rows.map((row: any) => ({
    training_id: row.training_id,
    fk_owner_id: row.fk_owner_id,
    training_code: row.training_code ?? null,
    training_name: row.training_name,
    training_description: row.training_description ?? null,
    training_type: row.training_type ?? null,
    training_duration: row.training_duration ?? null,
    training_cost: row.training_cost != null ? Number(row.training_cost) : null,
    trainer_user_id: row.trainer_user_id ?? null,
    training_active: row.training_active ?? 'Y',
    created_at: row.created_at?.toISOString() ?? '',
    updated_at: row.updated_at?.toISOString() ?? '',
    trainer_name: row.users
      ? `${row.users.first_name ?? ''} ${row.users.last_name ?? ''}`.trim() || null
      : null,
    attendance_count: (row.training_attendance ?? []).length,
    completed_count: (row.training_attendance ?? []).filter(
      (a: any) => a.completion_status === 'COMPLETED'
    ).length,
  }));

  return { data: records, total };
}

export async function getTrainingById(training_id: number): Promise<TrainingRecord | null> {
  const row = await prisma.training.findUnique({
    where: { training_id },
    include: { users: { select: { first_name: true, last_name: true } } },
  });

  if (!row) return null;

  return {
    training_id: row.training_id,
    fk_owner_id: row.fk_owner_id ?? 0,
    training_code: row.training_code ?? null,
    training_name: row.training_name,
    training_description: row.training_description ?? null,
    training_type: row.training_type ?? null,
    training_duration: row.training_duration ?? null,
    training_cost: row.training_cost != null ? Number(row.training_cost) : null,
    trainer_user_id: row.trainer_user_id ?? null,
    training_active: row.training_active ?? 'Y',
    created_at: row.created_at?.toISOString() ?? '',
    updated_at: row.updated_at?.toISOString() ?? '',
    trainer_name: row.users
      ? `${row.users.first_name ?? ''} ${row.users.last_name ?? ''}`.trim() || null
      : null,
  };
}

export async function createTraining(input: CreateTrainingInput): Promise<number> {
  const { owner_id, training_name, training_description, training_type, training_duration, training_cost, trainer_user_id } = input;

  const row = await prisma.training.create({
    data: {
      fk_owner_id: owner_id,
      training_name,
      training_description: training_description ?? null,
      training_type: training_type ?? null,
      training_duration: training_duration ?? null,
      training_cost: training_cost ?? null,
      trainer_user_id: trainer_user_id ?? null,
      training_active: 'Y',
    },
    select: { training_id: true },
  });

  return row.training_id;
}

export async function updateTraining(input: UpdateTrainingInput): Promise<void> {
  const { training_id, training_name, training_description, training_type, training_duration, training_cost, trainer_user_id } = input;

  await prisma.training.update({
    where: { training_id },
    data: {
      updated_at: new Date(),
      ...(training_name !== undefined && { training_name }),
      ...(training_description !== undefined && { training_description }),
      ...(training_type !== undefined && { training_type }),
      ...(training_duration !== undefined && { training_duration }),
      ...(training_cost !== undefined && { training_cost }),
      ...(trainer_user_id !== undefined && { trainer_user_id }),
    },
  });
}

export async function deleteTraining(training_id: number): Promise<void> {
  await prisma.training.delete({ where: { training_id } });
}

export async function getTrainingAttendance(training_id: number): Promise<TrainingAttendanceRecord[]> {
  const rows = await prisma.training_attendance.findMany({
    where: { fk_training_id: training_id },
    include: { users: { select: { first_name: true, last_name: true, email: true } } },
    orderBy: { training_session_date: 'desc' },
  });

  return rows.map((row: any) => ({
    attendance_id: row.attendance_id,
    fk_training_id: row.fk_training_id,
    fk_user_id: row.fk_user_id,
    training_session_date: row.training_session_date?.toISOString().slice(0, 10) ?? null,
    attendance_status: row.attendance_status ?? null,
    completion_status: row.completion_status ?? null,
    score: row.score != null ? Number(row.score) : null,
    feedback: row.feedback ?? null,
    certification_issued: row.certification_issued ?? false,
    certification_number: row.certification_number ?? null,
    certification_date: row.certification_date?.toISOString().slice(0, 10) ?? null,
    certification_expiry: row.certification_expiry?.toISOString().slice(0, 10) ?? null,
    created_at: row.created_at?.toISOString() ?? '',
    user_name: row.users
      ? `${row.users.first_name ?? ''} ${row.users.last_name ?? ''}`.trim() || null
      : null,
    user_email: row.users?.email ?? null,
  }));
}

export async function addTrainingAttendance(input: AddAttendanceInput): Promise<number> {
  const row = await prisma.training_attendance.create({
    data: {
      fk_training_id: input.training_id,
      fk_user_id: input.user_id,
      training_session_date: input.training_session_date ? new Date(input.training_session_date) : null,
      attendance_status: input.attendance_status ?? 'PRESENT',
      completion_status: input.completion_status ?? 'IN_PROGRESS',
      score: input.score ?? null,
      feedback: input.feedback ?? null,
      certification_issued: input.certification_issued ?? false,
      certification_number: input.certification_number ?? null,
      certification_date: input.certification_date ? new Date(input.certification_date) : null,
      certification_expiry: input.certification_expiry ? new Date(input.certification_expiry) : null,
    },
    select: { attendance_id: true },
  });

  return row.attendance_id;
}

export async function deleteTrainingAttendance(attendance_id: number): Promise<void> {
  await prisma.training_attendance.delete({ where: { attendance_id } });
}

export async function getTrainingCalendarEvents(owner_id: number): Promise<TrainingCalendarEvent[]> {
  const rows = await prisma.training_attendance.findMany({
    where: {
      training_session_date: { not: null },
      training: { fk_owner_id: owner_id },
    },
    select: {
      attendance_id: true,
      training_session_date: true,
      completion_status: true,
      users: { select: { first_name: true, last_name: true } },
      training: { select: { training_id: true, training_name: true, fk_owner_id: true } },
    },
    orderBy: { training_session_date: 'asc' },
  });

  const STATUS_COLORS: Record<string, string> = {
    COMPLETED: '#2e7d32',
    IN_PROGRESS: '#1976d2',
    FAILED: '#c62828',
    ABSENT: '#ef6c00',
  };

  return rows.map((row) => {
    const userName = row.users
      ? `${row.users.first_name ?? ''} ${row.users.last_name ?? ''}`.trim() || 'Unknown'
      : 'Unknown';
    const trainingName = row.training?.training_name ?? 'Training';
    const status = row.completion_status ?? 'IN_PROGRESS';
    return {
      id: String(row.attendance_id),
      title: `${trainingName} – ${userName}`,
      start: row.training_session_date?.toISOString().slice(0, 10) ?? '',
      color: STATUS_COLORS[status] ?? '#6a1b9a',
      training_id: row.training?.training_id ?? 0,
      attendance_id: row.attendance_id,
      user_name: userName,
      training_name: trainingName,
      completion_status: row.completion_status ?? null,
    };
  });
}


export interface FlatTrainingRecord {
  attendance_id: number;
  fk_training_id: number;
  fk_user_id: number;
  user_name: string | null;
  user_role: string | null;
  training_name: string;
  training_type: string | null;
  certificate_type: string | null;
  session_code: string | null;
  session_date: string | null;
  completion_date: string | null;
  expiry_date: string | null;
  status: 'VALID' | 'EXPIRED' | null;
}

export interface AddFlatTrainingInput {
  owner_id: number;
  user_ids: number[];
  training_name: string;
  training_type?: string | null;
  certificate_type?: string | null;
  session_code?: string | null;
  session_date?: string | null;
  completion_date?: string | null;
  expiry_date?: string | null;
}

export interface UpdateFlatTrainingInput {
  attendance_id: number;
  fk_training_id: number;
  training_name: string;
  training_type?: string | null;
  certificate_type?: string | null;
  session_code?: string | null;
  session_date?: string | null;
  completion_date?: string | null;
  expiry_date?: string | null;
}

export interface TrainingCurriculumRecord {
  attendance_id: number;
  fk_training_id: number;
  training_name: string;
  training_type: string | null;
  certificate_type: string | null;
  session_code: string | null;
  completion_date: string | null;
  expiry_date: string | null;
  status: 'VALID' | 'EXPIRED' | null;
}

export async function getFlatTrainingList(owner_id: number): Promise<FlatTrainingRecord[]> {
  const today = new Date().toISOString().split('T')[0];

  const rows = await prisma.training_attendance.findMany({
    where: { training: { fk_owner_id: owner_id } },
    select: {
      attendance_id: true,
      fk_training_id: true,
      fk_user_id: true,
      training_session_date: true,
      certification_number: true,
      certification_date: true,
      certification_expiry: true,
      training: { select: { training_id: true, training_name: true, training_type: true, certificate_type: true, fk_owner_id: true } },
      users: { select: { first_name: true, last_name: true, user_role: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  return rows.map((row) => {
    const expiryDate = row.certification_expiry?.toISOString().slice(0, 10) ?? null;
    let status: 'VALID' | 'EXPIRED' | null = null;
    if (expiryDate) {
      status = expiryDate >= today ? 'VALID' : 'EXPIRED';
    }
    return {
      attendance_id: row.attendance_id,
      fk_training_id: row.fk_training_id,
      fk_user_id: row.fk_user_id,
      user_name: row.users
        ? `${row.users.first_name ?? ''} ${row.users.last_name ?? ''}`.trim() || null
        : null,
      user_role: row.users?.user_role ?? null,
      training_name: row.training?.training_name ?? '',
      training_type: row.training?.training_type ?? null,
      certificate_type: row.training?.certificate_type ?? null,
      session_code: row.certification_number ?? null,
      session_date: row.training_session_date?.toISOString().slice(0, 10) ?? null,
      completion_date: row.certification_date?.toISOString().slice(0, 10) ?? null,
      expiry_date: expiryDate,
      status,
    };
  });
}

export async function addFlatTraining(input: AddFlatTrainingInput): Promise<number[]> {
  const { owner_id, user_ids, training_name, training_type, certificate_type, session_code, session_date, completion_date, expiry_date } = input;

  // Each attendee gets their own training record so that editing one
  // person's course fields (name/type/certificate) never affects another
  // attendee's row, even if they were added together in the same batch.
  const inserted = await prisma.$transaction(async (tx) => {
    const rows = [];
    for (const uid of user_ids) {
      const created = await tx.training.create({
        data: {
          fk_owner_id: owner_id,
          training_name,
          training_type: training_type ?? null,
          certificate_type: certificate_type ?? null,
          training_active: 'Y',
        },
        select: { training_id: true },
      });

      const attendance = await tx.training_attendance.create({
        data: {
          fk_training_id: created.training_id,
          fk_user_id: uid,
          training_session_date: session_date ? new Date(session_date) : null,
          certification_number: session_code ?? null,
          certification_date: completion_date ? new Date(completion_date) : null,
          certification_expiry: expiry_date ? new Date(expiry_date) : null,
          certification_issued: !!completion_date,
          completion_status: completion_date ? 'COMPLETED' : 'IN_PROGRESS',
          attendance_status: 'PRESENT',
        },
        select: { attendance_id: true },
      });

      rows.push(attendance);
    }
    return rows;
  });

  return inserted.map((r) => r.attendance_id);
}

export async function updateFlatTraining(input: UpdateFlatTrainingInput): Promise<void> {
  const { attendance_id, fk_training_id, training_name, training_type, certificate_type, session_code, session_date, completion_date, expiry_date } = input;

  await prisma.$transaction([
    prisma.training.update({
      where: { training_id: fk_training_id },
      data: {
        training_name,
        training_type: training_type ?? null,
        certificate_type: certificate_type ?? null,
        updated_at: new Date(),
      },
    }),
    prisma.training_attendance.update({
      where: { attendance_id },
      data: {
        training_session_date: session_date ? new Date(session_date) : null,
        certification_number: session_code ?? null,
        certification_date: completion_date ? new Date(completion_date) : null,
        certification_expiry: expiry_date ? new Date(expiry_date) : null,
        certification_issued: !!completion_date,
        completion_status: completion_date ? 'COMPLETED' : 'IN_PROGRESS',
      },
    }),
  ]);
}

export async function deleteFlatTraining(attendance_id: number): Promise<void> {
  await prisma.training_attendance.delete({ where: { attendance_id } });
}


export interface MonthlyKpiResult {
  period_end: string;
  total: number;
  valid: number;
  expired: number;
  pending: number;
}

/**
 * Scans all training attendance records for the owner and counts how many
 * certifications are VALID, EXPIRED, or have no expiry (PENDING) as of the
 * last day of the given period month (period format: "YYYY-MM-01").
 */
export async function recomputeMonthlyKPI(
  owner_id: number,
  period: string,
): Promise<MonthlyKpiResult> {
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, '0');
  const dd = String(lastDay).padStart(2, '0');
  const period_end = `${year}-${mm}-${dd}`;

  const rows = await prisma.training_attendance.findMany({
    where: { training: { fk_owner_id: owner_id } },
    select: { attendance_id: true, certification_expiry: true },
  });

  let valid = 0;
  let expired = 0;
  let pending = 0;

  for (const row of rows) {
    const expiry = row.certification_expiry?.toISOString().slice(0, 10) ?? null;
    if (!expiry) {
      pending++;
    } else if (expiry >= period_end) {
      valid++;
    } else {
      expired++;
    }
  }

  return { period_end, total: rows.length, valid, expired, pending };
}


export async function getTrainingCurriculum(user_id: number, owner_id: number): Promise<TrainingCurriculumRecord[]> {
  const today = new Date().toISOString().split('T')[0];

  const rows = await prisma.training_attendance.findMany({
    where: {
      fk_user_id: user_id,
      training: { fk_owner_id: owner_id },
    },
    select: {
      attendance_id: true,
      fk_training_id: true,
      certification_number: true,
      certification_date: true,
      certification_expiry: true,
      training: { select: { training_id: true, training_name: true, training_type: true, certificate_type: true } },
    },
    orderBy: [{ certification_expiry: { sort: 'desc', nulls: 'last' } }],
  });

  return rows.map((row) => {
    const expiryDate = row.certification_expiry?.toISOString().slice(0, 10) ?? null;
    let status: 'VALID' | 'EXPIRED' | null = null;
    if (expiryDate) {
      status = expiryDate >= today ? 'VALID' : 'EXPIRED';
    }
    return {
      attendance_id: row.attendance_id,
      fk_training_id: row.fk_training_id,
      training_name: row.training?.training_name ?? '',
      training_type: row.training?.training_type ?? null,
      certificate_type: row.training?.certificate_type ?? null,
      session_code: row.certification_number ?? null,
      completion_date: row.certification_date?.toISOString().slice(0, 10) ?? null,
      expiry_date: expiryDate,
      status,
    };
  });
}

export async function getTrainingUsers(owner_id: number, q?: string): Promise<Array<{
  user_id: number;
  full_name: string;
  email: string;
}>> {
  const rows = await prisma.public_users.findMany({
    where: {
      user_active: 'Y',
      user_owner: { some: { fk_owner_id: owner_id, is_active: true } },
      ...(q && {
        OR: [
          { first_name: { contains: q, mode: 'insensitive' } },
          { last_name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      }),
    },
    select: { user_id: true, first_name: true, last_name: true, email: true },
    orderBy: { first_name: 'asc' },
    take: 100,
  });

  return rows.map((u) => ({
    user_id: u.user_id,
    full_name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
    email: u.email ?? '',
  }));
}
