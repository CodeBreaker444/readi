'use client';

import {
    ColumnDef
} from '@tanstack/react-table';
import { formatDateInTz, formatTimeInTz } from '@/lib/utils';

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

export interface Owner {
  owner_id: number;
  owner_name: string;
  owner_code: string;
}

export interface UserOption {
  user_id: number;
  fullname: string;
  email: string;
}

export const EVENT_TYPE_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  UPDATE: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
  LOGIN: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  LOGOUT: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

export const EVENT_TYPES = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];

export const ENTITY_TYPES = [
  'user', 'mission_type', 'mission_category', 'mission_status', 'mission_result',
  'operation', 'document', 'system', 'maintenance_ticket', 'client',
  'shift', 'organization_procedure', 'checklist', 'assignment', 'communication',
  'spi_kpi', 'company', 'dcc_bug_report',
];

type TFunction = (key: string) => string;

export const getAuditLogsColumns = (isSuperAdmin: boolean, owners: Owner[], timezone?: string, t?: TFunction): ColumnDef<AuditLog>[] => {
  const tr = (key: string, fallback: string) => t ? t(`auditLogs.columns.${key}`) : fallback;
  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'created_at',
      header: () => tr('time', 'Time'),
      size: 160,
      cell: ({ getValue }) => {
        const date = getValue<string>();
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium">{formatDateInTz(date, timezone)}</span>
            <span className="text-[10px] text-muted-foreground">{formatTimeInTz(date, timezone)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'event_type',
      header: () => tr('event', 'Event'),
      size: 96,
    },
    {
      accessorKey: 'entity_type',
      header: () => tr('section', 'Section'),
      size: 128,
      cell: ({ getValue }) => getValue<string>().replace(/_/g, ' '),
    },
    {
      accessorKey: 'description',
      header: () => tr('description', 'Description'),
    },
    {
      id: 'user',
      header: () => tr('user', 'User'),
      size: 160,
      accessorFn: (row) => row.user_name ?? (t ? t('auditLogs.system') : 'System'),
      cell: ({ row }) => ({
        name: row.original.user_name ?? (t ? t('auditLogs.system') : 'System'),
        email: row.original.user_email ?? '',
      }),
    },
    {
      accessorKey: 'user_role',
      header: () => tr('role', 'Role'),
      size: 96,
    },
  ];

  if (isSuperAdmin) {
    columns.push({
      id: 'company',
      header: () => tr('company', 'Company'),
      size: 112,
      accessorFn: (row) =>
        owners.find((o) => o.owner_id === row.owner_id)?.owner_name ?? String(row.owner_id),
    });
  }
  return columns;
};

 