'use client';

import { FlatTrainingRecord } from '@/backend/services/training/training-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';

const TYPE_STYLES: Record<string, string> = {
  INITIAL:   'bg-blue-500/10 text-blue-500 border-blue-500/20',
  RECURRENT: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  EMERGENCY: 'bg-red-500/10 text-red-500 border-red-500/20',
  SIMULATOR: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  OTHER:     'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

const CERT_TYPE_STYLES: Record<string, string> = {
  PARTICIPATION: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  QUALIFICATION: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

const CERT_TYPE_LABELS: Record<string, string> = {
  PARTICIPATION: 'Participation',
  QUALIFICATION: 'Qualification',
};

function fmtDate(val: string | null) {
  if (!val) return '—';
  const [y, m, d] = val.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[Number(m) - 1]} ${y}`;
}

export function getTrainingCoursesColumns(
  isDark: boolean,
  onEdit: (record: FlatTrainingRecord) => void,
  onDelete: (record: FlatTrainingRecord) => void
): ColumnDef<FlatTrainingRecord>[] {
  const muted = isDark ? 'text-gray-400' : 'text-gray-600';
  const dimmed = isDark ? 'text-gray-600' : 'text-gray-300';

  return [
    {
      accessorKey: 'user_name',
      header: 'User',
      cell: ({ row }) => (
        <div className="min-w-30">
          <p className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {row.original.user_name ?? '—'}
          </p>
          {row.original.user_role && (
            <p className={`text-[10px] mt-0.5 ${dimmed}`}>{row.original.user_role}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'training_name',
      header: 'Course',
      cell: ({ getValue }) => (
        <span className={`text-xs font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          {(getValue() as string) || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'training_type',
      header: 'Type',
      size: 110,
      cell: ({ getValue }) => {
        const type = getValue() as string | null;
        if (!type) return <span className={`text-[11px] ${dimmed}`}>—</span>;
        return (
          <Badge variant="outline" className={`text-[10px] font-bold tracking-tight ${TYPE_STYLES[type] ?? TYPE_STYLES.OTHER}`}>
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'certificate_type',
      header: 'Certificate',
      size: 140,
      cell: ({ getValue }) => {
        const ct = getValue() as string | null;
        if (!ct) return <span className={`text-[11px] ${dimmed}`}>—</span>;
        return (
          <Badge variant="outline" className={`text-[10px] font-bold tracking-tight ${CERT_TYPE_STYLES[ct] ?? 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
            {CERT_TYPE_LABELS[ct] ?? ct}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'session_code',
      header: 'Session',
      cell: ({ getValue }) => (
        <span className={`text-xs font-mono ${muted}`}>
          {(getValue() as string | null) ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'completion_date',
      header: 'Completion Date',
      size: 130,
      cell: ({ getValue }) => (
        <span className={`text-xs ${muted}`}>{fmtDate(getValue() as string | null)}</span>
      ),
    },
    {
      accessorKey: 'expiry_date',
      header: 'Expiry Date',
      size: 115,
      cell: ({ getValue }) => (
        <span className={`text-xs ${muted}`}>{fmtDate(getValue() as string | null)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 85,
      cell: ({ getValue }) => {
        const s = getValue() as 'VALID' | 'EXPIRED' | null;
        if (!s) return <span className={`text-[11px] ${dimmed}`}>—</span>;
        return (
          <Badge
            variant="outline"
            className={
              s === 'VALID'
                ? 'text-[10px] font-bold bg-green-500/10 text-green-500 border-green-500/20'
                : 'text-[10px] font-bold bg-red-500/10 text-red-500 border-red-500/20'
            }
          >
            {s}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      size: 72,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(row.original)}
            className={`h-7 w-7 ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/8' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
          >
            <Pencil size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(row.original)}
            className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-500/10"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];
}
