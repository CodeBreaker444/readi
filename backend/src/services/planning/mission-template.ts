import { supabase } from "@/backend/database/database";
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
  filters: MissionTemplateFilters = {},
): Promise<MissionTemplateRow[]> {
  let query = supabase
    .from('planning_logbook')
    .select(
      `
      mission_planning_id,
      mission_planning_code,
      mission_planning_desc,
      mission_planning_active,
      mission_planning_ver,
      mission_planning_filename,
      mission_planning_filesize,
      mission_planning_s3_key,
      created_at,
      updated_at,
      fk_tool_id,
      planning:fk_planning_id (
        planning_id,
        planning_code,
        planning_name,
        planning_status,
        client:fk_client_id ( client_id, client_name ),
        evaluation:fk_evaluation_id ( evaluation_id, evaluation_code )
      ),
      pilot:fk_user_id ( user_id, first_name, last_name )
    `,
    )
    .eq('fk_owner_id', ownerId)
    .eq('mission_planning_active', 'Y')
    .order('updated_at', { ascending: false });

  if (filters.client_id && filters.client_id > 0) {
    query = query.eq('fk_client_id', filters.client_id);
  }
  if (filters.pilot_id && filters.pilot_id > 0) {
    query = query.eq('fk_user_id', filters.pilot_id);
  }
  if (filters.evaluation_id && filters.evaluation_id > 0) {
    query = query.eq('fk_evaluation_id', filters.evaluation_id);
  }
  if (filters.planning_id && filters.planning_id > 0) {
    query = query.eq('fk_planning_id', filters.planning_id);
  }
  if (filters.date_start) {
    query = query.gte('updated_at', filters.date_start);
  }
  if (filters.date_end) {
    query = query.lte('updated_at', `${filters.date_end}T23:59:59`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getMissionTemplateLogbook: ${error.message}`);
  if (!data || data.length === 0) return [];

  const toolIds = [...new Set((data as any[]).map((r) => r.fk_tool_id).filter(Boolean))];
  let toolMap: Record<number, string> = {};
  if (toolIds.length > 0) {
    const { data: tools } = await supabase
      .from('tool')
      .select('tool_id, tool_code')
      .in('tool_id', toolIds);
    if (tools) {
      for (const t of tools) toolMap[t.tool_id] = t.tool_code;
    }
  }

  const rows: MissionTemplateRow[] = [];

  for (const row of data as any[]) {
    const planning = row.planning;
    const pilot = row.pilot;

    let downloadUrl: string   = await getPresignedDownloadUrl(row.mission_planning_s3_key,3600);
    

    rows.push({
      mission_planning_id: row.mission_planning_id,
      mission_planning_code: row.mission_planning_code ?? `MPL_${row.mission_planning_id}`,
      mission_planning_desc: row.mission_planning_desc,
      mission_planning_active: row.mission_planning_active,
      mission_planning_ver: row.mission_planning_ver ?? 1,
      mission_planning_filename: row.mission_planning_filename,
      mission_planning_filesize: row.mission_planning_filesize,
      mission_planning_s3_key: row.mission_planning_s3_key,
      created_at: row.created_at,
      updated_at: row.updated_at,
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
  const [clientsRes, pilotsRes, evaluationsRes, planningsRes] = await Promise.all([
    supabase
      .from('client')
      .select('client_id, client_name')
      .eq('fk_owner_id', ownerId)
      .eq('client_active', 'Y')
      .order('client_name'),
    supabase
      .from('users')
      .select('user_id, first_name, last_name')
      .order('first_name'),
    supabase
      .from('evaluation')
      .select('evaluation_id, evaluation_code')
      .eq('fk_owner_id', ownerId)
      .eq('evaluation_active', 'Y')
      .order('evaluation_id', { ascending: false }),
    supabase
      .from('planning')
      .select('planning_id, planning_code, planning_name')
      .eq('fk_owner_id', ownerId)
      .eq('planning_active', 'Y')
      .order('planning_id', { ascending: false }),
  ]);

  return {
    clients: (clientsRes.data ?? []).map((c) => ({
      id: c.client_id,
      name: c.client_name,
    })),
    pilots: (pilotsRes.data ?? []).map((p) => ({
      id: p.user_id,
      name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
    })),
    evaluations: (evaluationsRes.data ?? []).map((e) => ({
      id: e.evaluation_id,
      name: e.evaluation_code ?? `EVAL_${e.evaluation_id}`,
    })),
    plannings: (planningsRes.data ?? []).map((p) => ({
      id: p.planning_id,
      name: p.planning_code ?? p.planning_name ?? `PLAN_${p.planning_id}`,
    })),
  };
}