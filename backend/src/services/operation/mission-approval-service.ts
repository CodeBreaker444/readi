import { env } from '@/backend/config/env';
import { authorizeMissionWithDFlight, isReportableDFlightFailure } from '@/backend/services/integrations/dflight-mission-authorization-service';
import type { SessionUser } from '@/lib/auth/server-session';
import { prisma } from '@/lib/prisma';
import { sendNotificationEmail } from '../../../../lib/resend/mail';

export type OpmApprovalStatus = 'PENDING' | 'APPROVED' | 'DENIED';

const DECIDER_ROLES = ['OPM'];
// Fallback so a department with no OPM does not leave missions stuck forever.
const ADMIN_ROLES = ['ADMIN', 'SUPERADMIN'];
const APPROVAL_NOTIFICATION_TYPE = 'mission_approval';
const REQUESTS_URL = '/operations/flight-requests';

type Requester = Pick<SessionUser, 'userId' | 'ownerId' | 'role' | 'isManager' | 'fullname'>;

/** Only pilots need approval — OPMs and managers create missions freely. */
export function missionNeedsOpmApproval(user: Pick<SessionUser, 'role' | 'isManager'>): boolean {
  return user.role === 'PIC' && !user.isManager;
}

async function getUserDepartment(userId: number): Promise<string | null> {
  const row = await prisma.public_users.findUnique({
    where: { user_id: userId },
    select: { department: true },
  });
  return row?.department?.trim() || null;
}

async function listDepartmentOpms(ownerId: number, department: string | null) {
  if (!department) return [];
  return prisma.public_users.findMany({
    where: { fk_owner_id: ownerId, user_active: 'Y', user_role: { in: DECIDER_ROLES }, department },
    select: { user_id: true, email: true },
  });
}

export interface ApprovalEligibility {
  required: boolean;
  department: string | null;
  opmCount: number;
}

/** Drives the warning shown at the end of the mission creation modal. */
export async function getApprovalEligibility(user: Requester): Promise<ApprovalEligibility> {
  if (!missionNeedsOpmApproval(user)) return { required: false, department: null, opmCount: 0 };
  const department = await getUserDepartment(user.userId);
  const opms = await listDepartmentOpms(user.ownerId, department);
  return { required: true, department, opmCount: opms.length };
}

/** Values to persist on a mission row at creation time. */
export async function buildInitialApproval(user: Requester) {
  if (!missionNeedsOpmApproval(user)) return null;
  const department = await getUserDepartment(user.userId);
  return {
    opm_approval_status: 'PENDING' as const,
    opm_approval_department: department,
    opm_approval_requested_by_user_id: user.userId,
    opm_approval_requested_at: new Date(),
  };
}

async function notifyUsers(
  ownerId: number,
  users: { user_id: number; email: string | null }[],
  title: string,
  message: string,
  data: Record<string, unknown>,
) {
  if (!users.length) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      fk_user_id: u.user_id,
      notification_type: APPROVAL_NOTIFICATION_TYPE,
      notification_title: title,
      notification_message: message,
      notification_data: data as object,
      priority: 'normal',
      is_read: false,
      action_url: REQUESTS_URL,
      created_at: new Date(),
    })),
  });

  const owner = await prisma.owner.findUnique({
    where: { owner_id: ownerId },
    select: { email_notifications_enabled: true },
  });
  if (owner?.email_notifications_enabled !== true) return;

  const emails = users.map((u) => u.email).filter((e): e is string => !!e);
  const emailUrl = env.APP_URL ? `${env.APP_URL.replace(/\/$/, '')}${REQUESTS_URL}` : REQUESTS_URL;
  await sendNotificationEmail(emails, title, message, APPROVAL_NOTIFICATION_TYPE, emailUrl);
}

/** Notify the department's OPMs and managers that a pilot submitted a mission. */
export async function notifyApprovalRequested(
  user: Requester,
  missions: { pilot_mission_id: number; mission_code: string | null }[],
) {
  if (!missions.length) return;
  const department = await getUserDepartment(user.userId);
  const first = missions[0];
  const label = missions.length > 1
    ? `${first.mission_code} (+${missions.length - 1} recurring)`
    : first.mission_code ?? `#${first.pilot_mission_id}`;

  let recipients = department
    ? await prisma.public_users.findMany({
        where: {
          fk_owner_id: user.ownerId,
          user_active: 'Y',
          department,
          OR: [{ user_role: { in: DECIDER_ROLES } }, { is_manager: 'Y' }],
          NOT: { user_id: user.userId },
        },
        select: { user_id: true, email: true },
      })
    : [];

  // No one in the department can decide → alert the admins so it is not silently stuck.
  const hasOpm = department ? (await listDepartmentOpms(user.ownerId, department)).length > 0 : false;
  if (!hasOpm) {
    const admins = await prisma.public_users.findMany({
      where: { fk_owner_id: user.ownerId, user_active: 'Y', user_role: { in: ADMIN_ROLES } },
      select: { user_id: true, email: true },
    });
    const seen = new Set(recipients.map((r) => r.user_id));
    recipients = [...recipients, ...admins.filter((a) => !seen.has(a.user_id))];
  }

  await notifyUsers(
    user.ownerId,
    recipients,
    'Mission approval requested',
    `${user.fullname} submitted mission ${label} for approval${department ? ` (${department})` : ' — no department/OPM is set for this pilot'}.`,
    { mission_id: first.pilot_mission_id, task_code: first.mission_code, from_user_id: user.userId, department },
  );
}

export function canDecideApproval(user: Pick<SessionUser, 'role'>): boolean {
  return DECIDER_ROLES.includes(user.role) || ADMIN_ROLES.includes(user.role);
}

async function getDeciderDepartment(user: Pick<SessionUser, 'userId' | 'role'>) {
  if (ADMIN_ROLES.includes(user.role)) return undefined; // sees every department
  return (await getUserDepartment(user.userId)) ?? null;
}

export interface InternalFlightRequest {
  request_id: number; // representative pilot_mission_id (first of the recurring group)
  mission_ids: number[];
  mission_code: string | null;
  mission_name: string | null;
  mission_type: string | null;
  op_type: string | null;
  location: string | null;
  scheduled_start: string | null;
  occurrences: number;
  pilot_name: string | null;
  requested_by_name: string | null;
  department: string | null;
  tool_code: string | null;
  notes: string | null;
  approval_status: OpmApprovalStatus;
  requested_at: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  decision_note: string | null;
}

export async function listInternalRequests(
  user: Pick<SessionUser, 'userId' | 'ownerId' | 'role'>,
  status?: string,
): Promise<InternalFlightRequest[]> {
  const department = await getDeciderDepartment(user);
  if (department === null) return []; // OPM without a department has no scope

  const rows = await prisma.pilot_mission.findMany({
    where: {
      fk_owner_id: user.ownerId,
      opm_approval_status: status && status !== 'ALL' ? status : { not: null },
      ...(department !== undefined && { opm_approval_department: department }),
    },
    orderBy: { opm_approval_requested_at: 'desc' },
    take: 500,
    select: {
      pilot_mission_id: true,
      mission_code: true,
      mission_name: true,
      mission_metadata: true,
      location: true,
      scheduled_start: true,
      notes: true,
      recurring_group_id: true,
      opm_approval_status: true,
      opm_approval_department: true,
      opm_approval_requested_by_user_id: true,
      opm_approval_requested_at: true,
      opm_approval_decided_by_user_id: true,
      opm_approval_decided_at: true,
      opm_approval_note: true,
      users: { select: { first_name: true, last_name: true } },
      tool: { select: { tool_code: true } },
      pilot_mission_type: { select: { type_name: true } },
    },
  });

  const userIds = [...new Set(rows.flatMap((r) => [r.opm_approval_requested_by_user_id, r.opm_approval_decided_by_user_id]).filter((x): x is number => !!x))];
  const people = userIds.length
    ? await prisma.public_users.findMany({ where: { user_id: { in: userIds } }, select: { user_id: true, first_name: true, last_name: true } })
    : [];
  const nameOf = (id: number | null) => {
    const p = people.find((x) => x.user_id === id);
    return p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : null;
  };

  // Recurring series are one request — collapse them into a single row.
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const gid = (r.mission_metadata as { recurring_group_id?: string } | null)?.recurring_group_id ?? r.recurring_group_id;
    const key = gid ? `g:${gid}:${r.opm_approval_status}` : `m:${r.pilot_mission_id}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return [...groups.values()].map((g) => {
    const sorted = [...g].sort((a, b) => (a.scheduled_start?.getTime() ?? 0) - (b.scheduled_start?.getTime() ?? 0));
    const r = sorted[0];
    const meta = (r.mission_metadata ?? {}) as { op_type?: string };
    return {
      request_id: r.pilot_mission_id,
      mission_ids: sorted.map((m) => m.pilot_mission_id),
      mission_code: r.mission_code,
      mission_name: r.mission_name,
      mission_type: r.pilot_mission_type?.type_name ?? null,
      op_type: meta.op_type ?? null,
      location: r.location,
      scheduled_start: r.scheduled_start?.toISOString() ?? null,
      occurrences: sorted.length,
      pilot_name: r.users ? `${r.users.first_name ?? ''} ${r.users.last_name ?? ''}`.trim() : null,
      requested_by_name: nameOf(r.opm_approval_requested_by_user_id),
      department: r.opm_approval_department,
      tool_code: r.tool?.tool_code ?? null,
      notes: r.notes,
      approval_status: r.opm_approval_status as OpmApprovalStatus,
      requested_at: r.opm_approval_requested_at?.toISOString() ?? null,
      decided_at: r.opm_approval_decided_at?.toISOString() ?? null,
      decided_by_name: nameOf(r.opm_approval_decided_by_user_id),
      decision_note: r.opm_approval_note,
    };
  });
}

export class ApprovalError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function decideMissionApproval(
  user: Pick<SessionUser, 'userId' | 'ownerId' | 'role' | 'fullname'>,
  missionId: number,
  decision: 'APPROVED' | 'DENIED',
  note?: string,
): Promise<{ missionIds: number[]; dflightErrors: { missionCode: string; message: string }[] }> {
  if (!canDecideApproval(user)) throw new ApprovalError('Only an OPM can decide on mission approvals.', 403);

  const mission = await prisma.pilot_mission.findFirst({
    where: { pilot_mission_id: missionId, fk_owner_id: user.ownerId },
    select: {
      pilot_mission_id: true,
      mission_code: true,
      mission_metadata: true,
      recurring_group_id: true,
      opm_approval_status: true,
      opm_approval_department: true,
      opm_approval_requested_by_user_id: true,
    },
  });
  if (!mission || !mission.opm_approval_status) throw new ApprovalError('Approval request not found.', 404);
  if (mission.opm_approval_status !== 'PENDING') throw new ApprovalError('This request has already been decided.', 409);

  const department = await getDeciderDepartment(user);
  if (department === null || (department !== undefined && department !== mission.opm_approval_department)) {
    throw new ApprovalError('You can only decide on requests from your own department.', 403);
  }

  const gid = (mission.mission_metadata as { recurring_group_id?: string } | null)?.recurring_group_id ?? mission.recurring_group_id;
  const siblings = gid
    ? await prisma.pilot_mission.findMany({
        where: {
          fk_owner_id: user.ownerId,
          opm_approval_status: 'PENDING',
          OR: [{ recurring_group_id: gid }, { mission_metadata: { path: ['recurring_group_id'], equals: gid } }],
        },
        select: { pilot_mission_id: true, mission_code: true },
      })
    : [];
  const targets = siblings.length ? siblings : [{ pilot_mission_id: mission.pilot_mission_id, mission_code: mission.mission_code }];
  const ids = targets.map((t) => t.pilot_mission_id);

  // Atomic first-come-wins: if another OPM decided in the meantime, nothing is updated.
  const updated = await prisma.pilot_mission.updateMany({
    where: { pilot_mission_id: { in: ids }, fk_owner_id: user.ownerId, opm_approval_status: 'PENDING' },
    data: {
      opm_approval_status: decision,
      opm_approval_decided_by_user_id: user.userId,
      opm_approval_decided_at: new Date(),
      opm_approval_note: note?.trim() || null,
      updated_at: new Date(),
    },
  });
  if (updated.count === 0) throw new ApprovalError('This request has already been decided.', 409);

  const dflightErrors: { missionCode: string; message: string }[] = [];
  if (decision === 'APPROVED') {
    // D-Flight authorization is only requested once the mission is approved.
    for (const t of targets) {
      try {
        const { create } = await authorizeMissionWithDFlight(t.pilot_mission_id, user.ownerId);
        if (isReportableDFlightFailure(create)) dflightErrors.push({ missionCode: t.mission_code ?? String(t.pilot_mission_id), message: create.message });
      } catch (err) {
        console.warn('[decideMissionApproval] D-Flight authorization failed (non-fatal):', err);
      }
    }
  }

  if (mission.opm_approval_requested_by_user_id) {
    const requester = await prisma.public_users.findUnique({
      where: { user_id: mission.opm_approval_requested_by_user_id },
      select: { user_id: true, email: true },
    });
    if (requester) {
      const approved = decision === 'APPROVED';
      await notifyUsers(
        user.ownerId,
        [requester],
        approved ? 'Mission approved' : 'Mission denied',
        `${user.fullname} ${approved ? 'approved' : 'denied'} mission ${mission.mission_code}${note?.trim() ? `: ${note.trim()}` : '.'}`,
        { mission_id: mission.pilot_mission_id, task_code: mission.mission_code, from_user_id: user.userId, decision },
      ).catch((err) => console.error('[decideMissionApproval] requester notification failed:', err));
    }
  }

  return { missionIds: ids, dflightErrors };
}
