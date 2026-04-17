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
  Trash2,
  XCircle
} from 'lucide-react';

export interface OperationTableMeta {
  onEdit: (op: Operation) => void;
  onAttach: (op: Operation) => void;
  onDelete: (op: Operation) => void;
  onViewDetails: (op: Operation) => void;
}

function StatusBadge({ status, t }: { status?: string | null; t: TFunction }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PLANNED: {
      label: t('operations.table.status.planned'),
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Clock className="h-3 w-3" />,
    },
    IN_PROGRESS: {
      label: t('operations.table.status.inProgress'),
      color: 'bg-violet-50 text-violet-700 border-violet-200',
      icon: <Loader2 className="h-3 w-3" />,
    },
    COMPLETED: {
      label: t('operations.table.status.completed'),
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    CANCELLED: {
      label: t('operations.table.status.cancelled'),
      color: 'bg-slate-100 text-slate-500 border-slate-200',
      icon: <XCircle className="h-3 w-3" />,
    },
    ABORTED: {
      label: t('operations.table.status.aborted'),
      color: 'bg-red-50 text-red-700 border-red-200',
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const cfg = STATUS_CONFIG[status.toUpperCase()];
  if (!cfg) return <Badge variant="outline">{status}</Badge>;

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium', cfg.color)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export const getOperationColumns = (t: TFunction): ColumnDef<any>[] => [
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
    accessorKey: 'mission_name',
    header: t('operations.table.title'),
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm">{row.original.mission_name}</p>
        <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
            {row.original.mission_description}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'pilot_name',
    header: t('operations.table.detail.pilotInCommand'),
    cell: ({ getValue }) => <span className="text-xs">{getValue<string>() || '—'}</span>,
  },
  {
    accessorKey: 'status_name',
    header: t('planning.form.status'),
    cell: ({ getValue }) => <StatusBadge status={getValue<string>()} t={t} />,
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