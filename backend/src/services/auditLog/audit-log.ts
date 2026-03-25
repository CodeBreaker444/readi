import { supabase } from '@/backend/database/database';

export type AuditEventType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';

export interface LogEventParams {
  eventType: AuditEventType;
  entityType: string;
  entityId?: string | number;
  description: string;
  userId?: number;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  ownerId: number;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditLogFilters {
  ownerId?: number;
  userId?: number;
  eventType?: AuditEventType;
  entityType?: string;
  entityId?: string | number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Fire-and-forget audit event logger.
 * Never throws — errors are swallowed so they never block the caller.
 */
export function logEvent(params: LogEventParams): void {
  // Intentionally not awaited — runs asynchronously in the background
  (async () => {
    try {
      await supabase.from('audit_logs').insert({
        event_type:  params.eventType,
        entity_type: params.entityType,
        entity_id:   params.entityId != null ? String(params.entityId) : null,
        description: params.description,
        user_id:     params.userId ?? null,
        user_name:   params.userName ?? null,
        user_email:  params.userEmail ?? null,
        user_role:   params.userRole ?? null,
        owner_id:    params.ownerId,
        metadata:    params.metadata ?? null,
        ip_address:  params.ipAddress ?? null,
      });
    } catch {
      // Silently swallow — audit logging must never break business logic
    }
  })();
}

export interface AuditLog {
  id: number;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  owner_id: number;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface GetAuditLogsResult {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getAuditLogs(filters: AuditLogFilters): Promise<GetAuditLogsResult> {
  const page     = filters.page     ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const from     = (page - 1) * pageSize;
  const to       = from + pageSize - 1;

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.ownerId != null) query = query.eq('owner_id', filters.ownerId);

  if (filters.userId)     query = query.eq('user_id', filters.userId);
  if (filters.eventType)  query = query.eq('event_type', filters.eventType);
  if (filters.entityType) query = query.eq('entity_type', filters.entityType);
  if (filters.entityId != null) query = query.eq('entity_id', String(filters.entityId));
  if (filters.dateFrom)   query = query.gte('created_at', filters.dateFrom);
  if (filters.dateTo)     query = query.lte('created_at', filters.dateTo);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data:     (data ?? []) as AuditLog[],
    total:    count ?? 0,
    page,
    pageSize,
  };
}
