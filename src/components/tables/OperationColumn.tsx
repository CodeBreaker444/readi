'use client';

import { Operation } from '@/app/operations/table/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import {
    CheckCircle2,
    Clock,
    Loader2,
    Paperclip,
    Pencil,
    Trash2,
    XCircle,
} from 'lucide-react';


const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PLANNED: {
    label: 'Planned',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Clock className="h-3 w-3" />,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: <Loader2 className="h-3 w-3" />,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-slate-100 text-slate-500 border-slate-200',
    icon: <XCircle className="h-3 w-3" />,
  },
  ABORTED: {
    label: 'Aborted',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="h-3 w-3" />,
  },
};

function StatusBadge({ status }: { status?: string | null }) {
  if (!status)
    return <span className="text-muted-foreground text-xs">—</span>;
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <Badge variant="outline">{status}</Badge>;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        cfg.color
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

 

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

 
export interface OperationTableMeta {
  onEdit: (op: Operation) => void;
  onAttach: (op: Operation) => void;
  onDelete: (op: Operation) => void;
}

 
export const operationColumns: ColumnDef<Operation>[] = [
  {
    accessorKey: 'mission_code',
    header: 'Code',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: 'mission_name',
    header: 'Mission',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.mission_name}</p>
        {row.original.mission_description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {row.original.mission_description}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'pilot_name',
    header: 'Pilot',
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">
        {getValue<string | null>() || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'tool_code',
    header: 'System',
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">
        {getValue<string | null>() || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'status_name',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue<string | null>()} />,
  },
  {
    accessorKey: 'scheduled_start',
    header: 'Scheduled',
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-sm text-muted-foreground">
        {formatDate(getValue<string | null>() ?? undefined)}
      </span>
    ),
  },
  {
    accessorKey: 'location',
    header: 'Location',
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">
        {getValue<string | null>() || '—'}
      </span>
    ),
  },
  {
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    size: 110,
    enableSorting: false,
    cell: ({ row, table }) => {
      const meta = table.options.meta as OperationTableMeta;
      const op = row.original;
      return (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => meta.onEdit(op)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => meta.onAttach(op)}
              >
                <Paperclip className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Attachments</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => meta.onDelete(op)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      );
    },
  },
];