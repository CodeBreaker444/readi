import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

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
      await prisma.audit_logs.create({
        data: {
          event_type:  params.eventType,
          entity_type: params.entityType,
          entity_id:   params.entityId != null ? String(params.entityId) : null,
          description: params.description,
          user_id:     params.userId ?? null,
          user_name:   params.userName ?? null,
          user_email:  params.userEmail ?? null,
          user_role:   params.userRole ?? null,
          owner_id:    params.ownerId,
          metadata:    params.metadata != null ? (params.metadata as Prisma.InputJsonValue) : undefined,
          ip_address:  params.ipAddress ?? null,
        },
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
  const skip     = (page - 1) * pageSize;

  const where: Prisma.audit_logsWhereInput = {};

  if (filters.ownerId != null)    where.owner_id   = filters.ownerId;
  if (filters.userId != null)     where.user_id    = filters.userId;
  if (filters.eventType != null)  where.event_type = filters.eventType;
  if (filters.entityType != null) where.entity_type = filters.entityType;
  if (filters.entityId != null)   where.entity_id  = String(filters.entityId);
  if (filters.dateFrom || filters.dateTo) {
    where.created_at = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo   ? { lte: new Date(filters.dateTo)   } : {}),
    };
  }

  const [rows, total] = await prisma.$transaction([
    prisma.audit_logs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.audit_logs.count({ where }),
  ]);

  return {
    data:     rows.map(r => ({
      ...r,
      id:         Number(r.id),
      created_at: r.created_at.toISOString(),
      metadata:   r.metadata as Record<string, unknown> | null,
    })),
    total,
    page,
    pageSize,
  };
}
