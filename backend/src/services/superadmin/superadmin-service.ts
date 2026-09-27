import { prisma } from '@/lib/prisma';
import { TOKEN_LIMITS } from '@/lib/token-limits';

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Last `count` month-end boundaries, with the final one replaced by "now" so the current month reflects live totals. */
function monthBoundaries(count: number): Date[] {
  const now = new Date();
  const boundaries: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    boundaries.push(new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999));
  }
  boundaries[boundaries.length - 1] = now;
  return boundaries;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short' });
}

/** Cumulative count of `dates` at or before each boundary — a running total-over-time series. */
function cumulativeByMonth(dates: Array<Date | null>, boundaries: Date[]): Array<{ month: string; total: number }> {
  const valid = dates.filter((d): d is Date => d != null).map((d) => d.getTime());
  return boundaries.map((b) => ({
    month: monthLabel(b),
    total: valid.filter((t) => t <= b.getTime()).length,
  }));
}

export interface SuperAdminCompanyRow {
  owner_id: number;
  owner_code: string | null;
  owner_name: string;
  owner_active: string;
  created_at: string;
  user_count: number;
  ai_tokens_today: number;
  storage_bytes: number;
  drone_atc_enabled: boolean;
  d_flight_enabled: boolean;
}

export interface SuperAdminOverview {
  companies: {
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
    list: SuperAdminCompanyRow[];
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    byRole: Array<{ role: string; count: number }>;
  };
  fleet: {
    totalDrones: number;
    activeDrones: number;
  };
  operations: {
    totalFlightRequests: number;
    flightRequestsByStatus: Array<{ status: string; count: number }>;
    flightRequestsByCompany: Array<{ owner_id: number; owner_name: string; byStatus: Record<string, number>; total: number }>;
    totalMaintenanceTickets: number;
    openMaintenanceTickets: number;
  };
  aiUsage: {
    today: { used: number; limit: number; remaining: number; percent: number };
    allTime: number;
    dailyTrend: Array<{ date: string; tokens: number }>;
    byCompanyToday: Array<{ owner_id: number; owner_name: string; tokens: number }>;
  };
  storage: {
    totalBytes: number;
    totalFiles: number;
    byCompany: Array<{ owner_id: number; owner_name: string; bytes: number }>;
  };
  emailUsage: {
    companiesNearLimit: number;
    byCompany: Array<{ owner_id: number; owner_name: string; used: number; limit: number; percent: number }>;
  };
  growth: {
    companies: Array<{ month: string; total: number }>;
    users: Array<{ month: string; total: number }>;
    lastActive: Array<{ date: string; users: number }>;
  };
}

export async function getSuperAdminOverview(): Promise<SuperAdminOverview> {
  const today = todayStart();
  const monthStart = startOfMonth();
  const trendStart = new Date(today);
  trendStart.setDate(trendStart.getDate() - 13);
  const monthBounds = monthBoundaries(6);

  const [
    owners,
    companiesTotal,
    companiesActive,
    companiesNewThisMonth,
    usersTotal,
    usersActive,
    usersByRoleRaw,
    usersByOwnerRaw,
    usersCreatedAtRows,
    usersLastLoginRows,
    totalDrones,
    activeDrones,
    totalFlightRequests,
    flightRequestsByStatusRaw,
    flightRequestsByCompanyRaw,
    totalMaintenanceTickets,
    openMaintenanceTickets,
    aiTodayRows,
    aiAllTimeAgg,
    aiTrendRows,
    repoFileRows,
    evalFileRows,
    maintAttachmentRows,
    lucRevRows,
  ] = await Promise.all([
    prisma.owner.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        owner_id: true,
        owner_code: true,
        owner_name: true,
        owner_active: true,
        created_at: true,
        drone_atc_enabled: true,
        d_flight_enabled: true,
        daily_email_limit: true,
        daily_email_count: true,
      },
    }),
    prisma.owner.count(),
    prisma.owner.count({ where: { owner_active: 'Y' } }),
    prisma.owner.count({ where: { created_at: { gte: monthStart } } }),
    prisma.public_users.count(),
    prisma.public_users.count({ where: { user_active: 'Y' } }),
    prisma.public_users.groupBy({ by: ['user_role'], _count: { _all: true } }),
    prisma.public_users.groupBy({ by: ['fk_owner_id'], _count: { _all: true } }),
    prisma.public_users.findMany({ select: { created_at: true } }),
    prisma.public_users.findMany({
      where: { last_login: { gte: trendStart } },
      select: { last_login: true },
    }),
    prisma.tool.count(),
    prisma.tool.count({ where: { tool_active: 'Y' } }),
    prisma.flight_requests.count(),
    prisma.flight_requests.groupBy({ by: ['dcc_status'], _count: { _all: true } }),
    prisma.flight_requests.groupBy({ by: ['fk_owner_id', 'dcc_status'], _count: { _all: true } }),
    prisma.maintenance_ticket.count(),
    prisma.maintenance_ticket.count({ where: { NOT: { ticket_status: 'CLOSED' } } }),
    prisma.ai_token_usage.findMany({
      where: { created_at: { gte: today } },
      select: { owner_id: true, total_tokens: true },
    }),
    prisma.ai_token_usage.aggregate({ _sum: { total_tokens: true } }),
    prisma.ai_token_usage.findMany({
      where: { created_at: { gte: trendStart } },
      select: { created_at: true, total_tokens: true },
    }),
    prisma.repository_file.findMany({ select: { fk_owner_id: true, file_size: true } }),
    prisma.evaluation_file.findMany({ select: { file_size: true, evaluation: { select: { fk_owner_id: true } } } }),
    prisma.maintenance_ticket_attachment.findMany({
      select: { file_size: true, maintenance_ticket: { select: { fk_owner_id: true } } },
    }),
    prisma.luc_document_rev.findMany({
      where: { luc_document: { document_active: 'Y' } },
      select: { file_size: true, luc_document: { select: { fk_owner_id: true } } },
    }),
  ]);

  const ownerNameById = new Map<number, string>();
  for (const o of owners) ownerNameById.set(o.owner_id, o.owner_name);

  const userCountByOwner = new Map<number, number>();
  for (const row of usersByOwnerRaw) {
    if (row.fk_owner_id != null) userCountByOwner.set(row.fk_owner_id, row._count._all);
  }

  const aiTokensByOwnerToday = new Map<number, number>();
  for (const row of aiTodayRows) {
    aiTokensByOwnerToday.set(row.owner_id, (aiTokensByOwnerToday.get(row.owner_id) ?? 0) + row.total_tokens);
  }

  // Per-company storage — file_size lives on four tables, three of which only
  // reach an owner through a relation, so each is walked and reduced in JS
  // rather than aggregated in SQL (Prisma can't group by a related column).
  const storageByOwner = new Map<number, number>();
  const addStorage = (ownerId: number | null | undefined, size: bigint | null) => {
    if (ownerId == null) return;
    storageByOwner.set(ownerId, (storageByOwner.get(ownerId) ?? 0) + Number(size ?? 0));
  };
  for (const r of repoFileRows) addStorage(r.fk_owner_id, r.file_size);
  for (const r of evalFileRows) addStorage(r.evaluation?.fk_owner_id, r.file_size);
  for (const r of maintAttachmentRows) addStorage(r.maintenance_ticket?.fk_owner_id, r.file_size);
  for (const r of lucRevRows) addStorage(r.luc_document?.fk_owner_id, r.file_size);

  const storageTotalBytes = Array.from(storageByOwner.values()).reduce((s, v) => s + v, 0);
  const storageTotalFiles = repoFileRows.length + evalFileRows.length + maintAttachmentRows.length + lucRevRows.length;
  const storageByCompany = Array.from(storageByOwner.entries())
    .map(([owner_id, bytes]) => ({ owner_id, owner_name: ownerNameById.get(owner_id) ?? `Company ${owner_id}`, bytes }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 8);

  const companyList: SuperAdminCompanyRow[] = owners.map((o) => ({
    owner_id: o.owner_id,
    owner_code: o.owner_code,
    owner_name: o.owner_name,
    owner_active: o.owner_active ?? 'N',
    created_at: o.created_at?.toISOString() ?? '',
    user_count: userCountByOwner.get(o.owner_id) ?? 0,
    ai_tokens_today: aiTokensByOwnerToday.get(o.owner_id) ?? 0,
    storage_bytes: storageByOwner.get(o.owner_id) ?? 0,
    drone_atc_enabled: o.drone_atc_enabled,
    d_flight_enabled: o.d_flight_enabled,
  }));

  const platformTokensToday = aiTodayRows.reduce((s, r) => s + r.total_tokens, 0);

  const trendBuckets = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(trendStart);
    d.setDate(d.getDate() + i);
    trendBuckets.set(dateKey(d), 0);
  }
  for (const row of aiTrendRows) {
    const key = dateKey(row.created_at);
    trendBuckets.set(key, (trendBuckets.get(key) ?? 0) + row.total_tokens);
  }
  const dailyTrend = Array.from(trendBuckets.entries()).map(([date, tokens]) => ({ date, tokens }));

  const byCompanyToday = Array.from(aiTokensByOwnerToday.entries())
    .map(([owner_id, tokens]) => ({ owner_id, owner_name: ownerNameById.get(owner_id) ?? `Company ${owner_id}`, tokens }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 8);

  // Flight requests per company, broken down by status.
  const flightRequestsByOwner = new Map<number, Record<string, number>>();
  for (const row of flightRequestsByCompanyRaw) {
    const byStatus = flightRequestsByOwner.get(row.fk_owner_id) ?? {};
    byStatus[row.dcc_status] = row._count._all;
    flightRequestsByOwner.set(row.fk_owner_id, byStatus);
  }
  const flightRequestsByCompany = Array.from(flightRequestsByOwner.entries())
    .map(([owner_id, byStatus]) => ({
      owner_id,
      owner_name: ownerNameById.get(owner_id) ?? `Company ${owner_id}`,
      byStatus,
      total: Object.values(byStatus).reduce((s, n) => s + n, 0),
    }))
    .sort((a, b) => b.total - a.total);

  // Email usage — daily_email_count resets each day via cron, so this reads as "today's usage so far".
  const emailCompanies = owners
    .filter((o) => (o.daily_email_limit ?? 0) > 0)
    .map((o) => {
      const used = o.daily_email_count ?? 0;
      const limit = o.daily_email_limit ?? 0;
      return {
        owner_id: o.owner_id,
        owner_name: o.owner_name,
        used,
        limit,
        percent: Math.min(100, Math.round((used / limit) * 100)),
      };
    })
    .sort((a, b) => b.percent - a.percent);
  const companiesNearEmailLimit = emailCompanies.filter((c) => c.percent >= 80).length;

  // Growth — cumulative totals by month-end for the last 6 months.
  const companyGrowth = cumulativeByMonth(owners.map((o) => o.created_at), monthBounds);
  const userGrowth = cumulativeByMonth(usersCreatedAtRows.map((u) => u.created_at), monthBounds);

  // "Last active" — count of users whose most recent login falls on each of the last 14 days.
  // Note: last_login only stores the single most-recent login per user, so this reads as a
  // last-seen distribution rather than a true historical daily-active-user count.
  const lastActiveBuckets = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(trendStart);
    d.setDate(d.getDate() + i);
    lastActiveBuckets.set(dateKey(d), 0);
  }
  for (const row of usersLastLoginRows) {
    if (!row.last_login) continue;
    const key = dateKey(row.last_login);
    if (lastActiveBuckets.has(key)) lastActiveBuckets.set(key, (lastActiveBuckets.get(key) ?? 0) + 1);
  }
  const lastActive = Array.from(lastActiveBuckets.entries()).map(([date, users]) => ({ date, users }));

  return {
    companies: {
      total: companiesTotal,
      active: companiesActive,
      inactive: companiesTotal - companiesActive,
      newThisMonth: companiesNewThisMonth,
      list: companyList,
    },
    users: {
      total: usersTotal,
      active: usersActive,
      inactive: usersTotal - usersActive,
      byRole: usersByRoleRaw
        .map((r) => ({ role: r.user_role ?? 'UNKNOWN', count: r._count._all }))
        .sort((a, b) => b.count - a.count),
    },
    fleet: {
      totalDrones: totalDrones,
      activeDrones: activeDrones,
    },
    operations: {
      totalFlightRequests,
      flightRequestsByStatus: flightRequestsByStatusRaw.map((r) => ({ status: r.dcc_status, count: r._count._all })),
      flightRequestsByCompany,
      totalMaintenanceTickets,
      openMaintenanceTickets,
    },
    aiUsage: {
      today: {
        used: platformTokensToday,
        limit: TOKEN_LIMITS.PLATFORM_DAILY,
        remaining: Math.max(0, TOKEN_LIMITS.PLATFORM_DAILY - platformTokensToday),
        percent: Math.min(100, Math.round((platformTokensToday / TOKEN_LIMITS.PLATFORM_DAILY) * 100)),
      },
      allTime: aiAllTimeAgg._sum.total_tokens ?? 0,
      dailyTrend,
      byCompanyToday,
    },
    storage: {
      totalBytes: storageTotalBytes,
      totalFiles: storageTotalFiles,
      byCompany: storageByCompany,
    },
    emailUsage: {
      companiesNearLimit: companiesNearEmailLimit,
      byCompany: emailCompanies.slice(0, 8),
    },
    growth: {
      companies: companyGrowth,
      users: userGrowth,
      lastActive,
    },
  };
}
