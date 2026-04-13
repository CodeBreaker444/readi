'use client';

import {
    ColumnDef
} from '@tanstack/react-table';
import { format } from 'date-fns';

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

export const getAuditLogsColumns = (isSuperAdmin: boolean, owners: Owner[]): ColumnDef<AuditLog>[] => {
  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'created_at',
      header: 'Time',
      size: 160,
      cell: ({ getValue }) => {
        const date = new Date(getValue<string>());
        return {
          date: format(date, 'dd MMM yyyy'),
          time: format(date, 'HH:mm:ss'),
        };
      },
    },
    {
      accessorKey: 'event_type',
      header: 'Event',
      size: 96,
    },
    {
      accessorKey: 'entity_type',
      header: 'Section',
      size: 128,
      cell: ({ getValue }) => getValue<string>().replace(/_/g, ' '),
    },
    {
      accessorKey: 'description',
      header: 'Description',
    },
    {
      id: 'user',
      header: 'User',
      size: 160,
      accessorFn: (row) => row.user_name ?? 'System',
      cell: ({ row }) => ({
        name: row.original.user_name ?? 'System',
        email: row.original.user_email ?? '',
      }),
    },
    {
      accessorKey: 'user_role',
      header: 'Role',
      size: 96,
    },
  ];

  if (isSuperAdmin) {
    columns.push({
      id: 'company',
      header: 'Company',
      size: 112,
      accessorFn: (row) =>
        owners.find((o) => o.owner_id === row.owner_id)?.owner_name ?? String(row.owner_id),
    });
  }
  return columns;
};

 