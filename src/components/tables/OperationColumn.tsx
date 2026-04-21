'use client';

import { Operation } from '@/app/operations/table/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { TFunction } from 'i18next';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react';

export interface OperationTableMeta {
  onEdit: (op: Operation) => void;
  onAttach: (op: Operation) => void;
  onDelete: (op: Operation) => void;
  onViewDetails: (op: Operation) => void;
}

const STATUS_CONFIG: Record<string, { label: string; light: string; dark: string; icon: React.ReactNode }> = {
  PLANNED: {
    label: 'Planned',
    light: 'bg-blue-100 text-blue-700 border-blue-300',
    dark: 'bg-blue-900/50 text-blue-300 border-blue-600',
    icon: <Clock className="h-3 w-3" />,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    light: 'bg-violet-100 text-violet-700 border-violet-300',
    dark: 'bg-violet-900/50 text-violet-300 border-violet-600',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  COMPLETED: {
    label: 'Completed',
    light: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    dark: 'bg-emerald-900/50 text-emerald-300 border-emerald-600',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    light: 'bg-slate-100 text-slate-600 border-slate-300',
    dark: 'bg-slate-700/60 text-slate-300 border-slate-500',
    icon: <XCircle className="h-3 w-3" />,
  },
  ABORTED: {
    label: 'Aborted',
    light: 'bg-red-100 text-red-700 border-red-300',
    dark: 'bg-red-900/50 text-red-300 border-red-600',
    icon: <XCircle className="h-3 w-3" />,
  },
};

function StatusBadge({ status, t, isDark }: { status?: string | null; t: TFunction; isDark: boolean }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const key = status.toUpperCase();
  const cfg = STATUS_CONFIG[key];
  if (!cfg) return <Badge variant="outline">{status}</Badge>;
  const label = key === 'IN_PROGRESS'
    ? t('operations.table.status.inProgress')
    : t(`operations.table.status.${key.toLowerCase()}`);
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium', isDark ? cfg.dark : cfg.light)}>
      {cfg.icon}
      {label}
    </span>
  );
}

function formatShortDate(val?: string | null): string {
  if (!val) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(val));
  } catch {
    return val;
  }
}

function getProcedureStatus(op: Operation): { assignmentDone: boolean; checklistDone: boolean; hasLuc: boolean } {
  const hasLuc = !!op.fk_luc_procedure_id;
  if (!hasLuc || !op.luc_procedure_progress) {
    return { hasLuc, assignmentDone: false, checklistDone: false };
  }
  const progress = op.luc_procedure_progress;
  const assignmentEntries = Object.values(progress.assignment ?? {});
  const checklistEntries = Object.values(progress.checklist ?? {});
  const assignmentDone = assignmentEntries.length === 0 || assignmentEntries.every(v => v === 'Y');
  const checklistDone = checklistEntries.length === 0 || checklistEntries.every(v => v === 'Y');
  return { hasLuc, assignmentDone, checklistDone };
}

function ProcedureBadge({ op, isDark }: { op: Operation; isDark: boolean }) {
  const { hasLuc, assignmentDone, checklistDone } = getProcedureStatus(op);

  if (!hasLuc) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium cursor-default',
            isDark ? 'bg-slate-800 text-slate-400 border-slate-600' : 'bg-slate-100 text-slate-400 border-slate-200')}>
            <AlertCircle className="h-3 w-3" />
            No LUC
          </span>
        </TooltipTrigger>
        <TooltipContent>No procedure assigned</TooltipContent>
      </Tooltip>
    );
  }

  const allDone = assignmentDone && checklistDone;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium cursor-default',
          allDone
            ? isDark ? 'bg-emerald-900/50 text-emerald-300 border-emerald-600' : 'bg-emerald-100 text-emerald-700 border-emerald-300'
            : isDark ? 'bg-amber-900/50 text-amber-300 border-amber-600' : 'bg-amber-100 text-amber-700 border-amber-300')}>
          {allDone ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {allDone ? 'Done' : 'Pending'}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-0.5">
          <p>Assignment: {assignmentDone ? '✓ Complete' : '✗ Incomplete'}</p>
          <p>Checklist: {checklistDone ? '✓ Complete' : '✗ Incomplete'}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export const getOperationColumns = (t: TFunction, isDark = false): ColumnDef<any>[] => [
  {
    id: 'select',
    size: 40,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
      />
    ),
  },
  {
    accessorKey: 'mission_code',
    header: t('operations.table.detail.missionId'),
    cell: ({ getValue, row, table }) => {
      const meta = table.options.meta as any;
      return (
        <button
          className="font-mono text-xs text-violet-600 hover:underline cursor-pointer"
          onClick={(e) => { e.stopPropagation(); meta.onViewDetails(row.original); }}
        >
          {getValue<string>()}
        </button>
      );
    },
  },
  {
    accessorKey: 'scheduled_start',
    header: t('planning.operationLogbook.columns.start'),
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatShortDate(getValue<string>())}
      </span>
    ),
  },
  {
    accessorKey: 'actual_end',
    header: t('planning.operationLogbook.columns.end'),
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatShortDate(getValue<string>())}
      </span>
    ),
  },
  {
    accessorKey: 'pilot_name',
    header: 'PIC',
    cell: ({ getValue }) => <span className="text-xs">{getValue<string>() || '—'}</span>,
  },
  {
    accessorKey: 'tool_code',
    header: t('operations.table.detail.droneSystem'),
    cell: ({ getValue }) => <span className="text-xs">{getValue<string>() || '—'}</span>,
  },
  {
    accessorKey: 'distance_flown',
    header: t('operations.table.detail.distance'),
    cell: ({ getValue }) => {
      const val = getValue<number | null>();
      return (
        <span className="text-xs tabular-nums text-muted-foreground">
          {val != null ? `${val.toLocaleString()} m` : '—'}
        </span>
      );
    },
  },
  {
    accessorKey: 'status_name',
    header: t('planning.form.status'),
    cell: ({ getValue }) => <StatusBadge status={getValue<string>()} t={t} isDark={isDark} />,
  },
  {
    id: 'procedure',
    header: 'Procedure',
    cell: ({ row }) => <ProcedureBadge op={row.original} isDark={isDark} />,
  },
  {
    id: 'actions',
    header: t('planning.table.actions'),
    cell: ({ row, table }) => {
      const meta = table.options.meta as any;
      return (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => meta.onViewDetails(row.original)}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('operations.actions.view')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => meta.onEdit(row.original)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('operations.actions.edit')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => meta.onDelete(row.original)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('operations.actions.delete')}</TooltipContent>
          </Tooltip>
        </div>
      );
    },
  },
];
