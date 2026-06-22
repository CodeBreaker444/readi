import { prisma } from '@/lib/prisma';
import { getPresignedDownloadUrl } from '@/lib/s3Client';

export interface MissionTemplateRow {
  mission_planning_id: number;
  mission_planning_code: string;
  mission_planning_desc: string | null;
  mission_planning_active: string;
  mission_planning_ver: number;
  mission_planning_filename: string | null;
  mission_planning_filesize: number | null;
  mission_planning_s3_key: string | null;
  created_at: string;
  updated_at: string;
  planning_code: string | null;
  planning_name: string | null;
  planning_status: string | null;
  evaluation_code: string | null;
  client_name: string | null;
  pilot_fullname: string | null;
  tool_code: string | null;
  download_url: string | null;
}

export interface MissionTemplateFilters {
  client_id?: number;
  pilot_id?: number;
  evaluation_id?: number;
  planning_id?: number;
  date_start?: string;
  date_end?: string;
}

export async function getMissionTemplateLogbook(
  ownerId: number,
  filters: MissionTemplateFilters = {}
): Promise<MissionTemplateRow[]> {
  const data = await prisma.planning_logbook.findMany({
    where: {
      fk_owner_id: ownerId,
      mission_planning_active: 'Y',
      ...(filters.client_id && filters.client_id > 0 && { fk_client_id: filters.client_id }),
      ...(filters.pilot_id && filters.pilot_id > 0 && { fk_user_id: filters.pilot_id }),
      ...(filters.evaluation_id && filters.evaluation_id > 0 && { fk_evaluation_id: filters.evaluation_id }),
      ...(filters.planning_id && filters.planning_id > 0 && { fk_planning_id: filters.planning_id }),
      ...(filters.date_start && { updated_at: { gte: new Date(filters.date_start) } }),
      ...(filters.date_end && { updated_at: { lte: new Date(`${filters.date_end}T23:59:59`) } }),
    },
    orderBy: { updated_at: 'desc' },
    select: {
      mission_planning_id: true,
      mission_planning_code: true,
      mission_planning_desc: true,
      mission_planning_active: true,
      mission_planning_ver: true,
      mission_planning_filename: true,
      mission_planning_filesize: true,
      mission_planning_s3_key: true,
      created_at: true,
      updated_at: true,
      fk_tool_id: true,
      planning: {
        select: {
          planning_id: true,
          planning_code: true,
          planning_name: true,
          planning_status: true,
          client: { select: { client_id: true, client_name: true } },
          evaluation: { select: { evaluation_id: true, evaluation_code: true } },
        },
      },
      users: {
        select: { user_id: true, first_name: true, last_name: true },
      },
    },
  });

  if (!data || data.length === 0) return [];

  const toolIds = [...new Set(data.map((r) => r.fk_tool_id).filter((id): id is number => id !== null))];
  const toolMap: Record<number, string> = {};

  if (toolIds.length > 0) {
    const tools = await prisma.tool.findMany({
      where: { tool_id: { in: toolIds } },
      select: { tool_id: true, tool_code: true },
    });
    for (const t of tools) toolMap[t.tool_id] = t.tool_code ?? '';
  }

  const rows: MissionTemplateRow[] = [];

  for (const row of data) {
    const planning = row.planning;
    const pilot = row.users;

    let downloadUrl: string = '';
    try {
      downloadUrl = await getPresignedDownloadUrl(row.mission_planning_s3_key!, 3600);
    } catch { /* leave empty */ }

    rows.push({
      mission_planning_id: row.mission_planning_id,
      mission_planning_code: row.mission_planning_code ?? `MPL_${row.mission_planning_id}`,
      mission_planning_desc: row.mission_planning_desc ?? null,
      mission_planning_active: row.mission_planning_active ?? 'Y',
      mission_planning_ver: row.mission_planning_ver ?? 1,
      mission_planning_filename: row.mission_planning_filename ?? null,
      mission_planning_filesize: row.mission_planning_filesize ? Number(row.mission_planning_filesize) : null,
      mission_planning_s3_key: row.mission_planning_s3_key ?? null,
      created_at: row.created_at?.toISOString() ?? '',
      updated_at: row.updated_at?.toISOString() ?? '',
      planning_code: planning?.planning_code ?? null,
      planning_name: planning?.planning_name ?? null,
      planning_status: planning?.planning_status ?? null,
      evaluation_code: planning?.evaluation?.evaluation_code ?? null,
      client_name: planning?.client?.client_name ?? null,
      pilot_fullname: pilot ? `${pilot.first_name ?? ''} ${pilot.last_name ?? ''}`.trim() : null,
      tool_code: row.fk_tool_id ? (toolMap[row.fk_tool_id] ?? null) : null,
      download_url: downloadUrl,
    });
  }

  return rows;
}

export async function getMissionTemplateFilterOptions(ownerId: number) {
  const [clients, pilots, evaluations, plannings] = await Promise.all([
    prisma.client.findMany({
      where: { fk_owner_id: ownerId },
      orderBy: { client_name: 'asc' },
      select: { client_id: true, client_name: true, client_active: true },
    }),
    prisma.public_users.findMany({
      where: { fk_owner_id: ownerId , NOT: { user_role: 'CLIENT' }},
      orderBy: { first_name: 'asc' },
      select: { user_id: true, first_name: true, last_name: true, user_active: true },
    }),
    prisma.evaluation.findMany({
      where: { fk_owner_id: ownerId },
      orderBy: { evaluation_id: 'desc' },
      select: { evaluation_id: true, evaluation_code: true, evaluation_active: true },
    }),
    prisma.planning.findMany({
      where: { fk_owner_id: ownerId },
      orderBy: { planning_id: 'desc' },
      select: { planning_id: true, planning_code: true, planning_name: true, planning_active: true },
    }),
  ]);

  return {
    clients: clients.map((c) => ({
      id: c.client_id,
      name: c.client_name,
      active: c.client_active === 'Y',
    })),
    pilots: pilots.map((p) => ({
      id: p.user_id,
      name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
      active: p.user_active === 'Y',
    })),
    evaluations: evaluations.map((e) => ({
      id: e.evaluation_id,
      name: e.evaluation_code ?? `EVAL_${e.evaluation_id}`,
      active: e.evaluation_active === 'Y',
    })),
    plannings: plannings.map((p) => ({
      id: p.planning_id,
      name: p.planning_code ?? p.planning_name ?? `PLAN_${p.planning_id}`,
      active: p.planning_active === 'Y',
    })),
  };
}
