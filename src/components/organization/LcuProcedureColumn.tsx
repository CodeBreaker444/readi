'use client';

import { Badge } from '@/components/ui/badge';
import { LucProcedure } from '@/config/types/lcuProcedures';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  EVALUATION: 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100',
  PLANNING:   'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100',
  MISSION:    'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-semibold tracking-wide ${STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}
    >
      {status}
    </Badge>
  );
}

function ActiveBadge({ active }: { active: 'Y' | 'N' }) {
  return active === 'Y' ? (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Active
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-100 gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Inactive
    </Badge>
  );
}

export function getLucProcedureColumns(
  onEdit: (row: LucProcedure) => void,
  onDelete: (row: LucProcedure) => void,
): ColumnDef<LucProcedure>[] {
  return [
    {
      accessorKey: 'procedure_id',
      header: '#ID',
      size: 60,
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-slate-400">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'procedure_name',
      header: 'Name',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{row.original.procedure_name}</p>
          {row.original.procedure_description && (
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
              {row.original.procedure_description}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'procedure_code',
      header: 'Code',
      size: 150,
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="font-mono text-sm text-slate-600">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'procedure_version',
      header: 'Version',
      size: 80,
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-sm text-slate-500">v{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'procedure_status',
      header: 'Status',
      size: 120,
      cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      filterFn: (row, columnId, filterValue) =>
        filterValue === 'ALL' || row.getValue(columnId) === filterValue,
    },
    {
      accessorKey: 'procedure_sector',
      header: 'Sector',
      size: 130,
      cell: ({ getValue }) => {
        const val = getValue();
        return val ? (
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
            {String(val)}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        );
      },
    },
    {
      accessorKey: 'procedure_active',
      header: 'Active',
      size: 100,
      cell: ({ getValue }) => <ActiveBadge active={getValue() as 'Y' | 'N'} />,
      filterFn: (row, columnId, filterValue) =>
        filterValue === 'ALL' || row.getValue(columnId) === filterValue,
    },
    {
      id: 'actions',
      size: 80,
      enableSorting: false,
      cell: ({ row }) => {
        const proc = row.original;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(proc)}
              className="cursor-pointer p-1.5 rounded-lg transition-colors text-blue-600 hover:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/15"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(proc)}
              className="cursor-pointer p-1.5 rounded-lg transition-colors text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/15"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
  ];
}