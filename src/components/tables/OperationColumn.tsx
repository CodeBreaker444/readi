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
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Pencil,
  Trash2,
  XCircle
} from 'lucide-react';

export interface OperationTableMeta {
  onEdit: (op: Operation) => void;
  onAttach: (op: Operation) => void;
  onDelete: (op: Operation) => void;
  onViewDetails: (op: Operation) => void;
}

function StatusBadge({ status, t, isDark }: { status?: string | null; t: TFunction; isDark: boolean }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;

  const STATUS_CONFIG: Record<string, { label: string; light: string; dark: string; icon: React.ReactNode }> = {
    PLANNED: {
      label: t('operations.table.status.planned'),
      light: 'bg-blue-100 text-blue-700 border-blue-300',
      dark:  'bg-blue-900/50 text-blue-300 border-blue-600',
      icon: <Clock className="h-3 w-3" />,
    },
    IN_PROGRESS: {
      label: t('operations.table.status.inProgress'),
      light: 'bg-violet-100 text-violet-700 border-violet-300',
      dark:  'bg-violet-900/50 text-violet-300 border-violet-600',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    COMPLETED: {
      label: t('operations.table.status.completed'),
      light: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      dark:  'bg-emerald-900/50 text-emerald-300 border-emerald-600',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    CANCELLED: {
      label: t('operations.table.status.cancelled'),
      light: 'bg-slate-100 text-slate-600 border-slate-300',
      dark:  'bg-slate-700/60 text-slate-300 border-slate-500',
      icon: <XCircle className="h-3 w-3" />,
    },
    ABORTED: {
      label: t('operations.table.status.aborted'),
      light: 'bg-red-100 text-red-700 border-red-300',
      dark:  'bg-red-900/50 text-red-300 border-red-600',
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const cfg = STATUS_CONFIG[status.toUpperCase()];
  if (!cfg) return <Badge variant="outline">{status}</Badge>;

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium', isDark ? cfg.dark : cfg.light)}>
      {cfg.icon}
      {cfg.label}
    </span>
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
  // {
  //   accessorKey: 'mission_name',
  //   header: t('operations.table.title'),
  //   cell: ({ row }) => (
  //     <div>
  //       <p className="font-medium text-sm">{row.original.mission_name}</p>
  //       <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
  //           {row.original.mission_description}
  //       </p>
  //     </div>
  //   ),
  // },
  {
    accessorKey: 'pilot_name',
    header: t('operations.table.detail.pilotInCommand'),
    cell: ({ getValue }) => <span className="text-xs">{getValue<string>() || '—'}</span>,
  },
  {
    accessorKey: 'status_name',
    header: t('planning.form.status'),
    cell: ({ getValue }) => <StatusBadge status={getValue<string>()} t={t} isDark={isDark} />,
  },
  {
    accessorKey: 'scheduled_start',
    header: t('operations.table.detail.scheduled'),
    cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue<string>()}</span>,
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