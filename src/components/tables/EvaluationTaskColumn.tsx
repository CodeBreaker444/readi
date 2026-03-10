'use client';

import { Button } from '@/components/ui/button';
import { EvaluationTask } from '@/config/types/evaluation';
import { ColumnDef } from '@tanstack/react-table';
import {
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  FileCheck,
  MessageSquare,
  SkipForward,
  Users,
} from 'lucide-react';

const taskTypeIcons: Record<string, React.ReactNode> = {
  assignment: <Users className="h-3.5 w-3.5 text-blue-500" />,
  checklist: <FileCheck className="h-3.5 w-3.5 text-emerald-500" />,
  communication: <MessageSquare className="h-3.5 w-3.5 text-amber-500" />,
};

const taskTypeLabels: Record<string, string> = {
  assignment: 'Assignment',
  checklist: 'Checklist',
  communication: 'Communication',
};

const statusConfig: Record<
  string,
  { label: string; icon: React.ReactNode; className: string }
> = {
  pending: {
    label: 'Pending',
    icon: <Circle className="h-3 w-3" />,
    className: 'border border-slate-300 text-slate-500 bg-white',
  },
  in_progress: {
    label: 'In Progress',
    icon: <Clock className="h-3 w-3 text-amber-500" />,
    className: 'border border-amber-200 text-amber-700 bg-amber-50',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle2 className="h-3 w-3 text-emerald-500" />,
    className: 'border border-emerald-200 text-emerald-700 bg-emerald-50',
  },
  skipped: {
    label: 'Skipped',
    icon: <SkipForward className="h-3 w-3 text-slate-400" />,
    className: 'border border-slate-200 text-slate-400 bg-slate-50',
  },
};

const openButtonConfig: Record<
  string,
  { label: string; className: string }
> = {
  checklist: {
    label: 'Fill',
    className:
      'h-6 text-xs gap-1 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100',
  },
  assignment: {
    label: 'Assign',
    className:
      'h-6 text-xs gap-1 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100',
  },
  communication: {
    label: 'Send',
    className:
      'h-6 text-xs gap-1 border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100',
  },
};

export const getEvaluationTaskColumns = (
  onOpenAction?: (task: EvaluationTask) => void,
): ColumnDef<EvaluationTask>[] => [
  {
    id: 'rowNumber',
    header: () => <span className="text-xs font-semibold text-slate-400">#</span>,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-slate-400">{row.index + 1}</span>
    ),
    size: 40,
  },
  {
    accessorKey: 'task_name',
    header: () => <span className="text-xs font-semibold text-slate-500">Task</span>,
    cell: ({ row }) => (
      <p className="text-sm font-medium text-slate-800 leading-snug">
        {row.original.task_name}
      </p>
    ),
  },
   {
    accessorKey: 'task_type',
    header: () => <span className="text-xs font-semibold text-slate-500">Type</span>,
    cell: ({ getValue }) => {
      const type = getValue() as string;
      return (
        <div className="flex items-center gap-1.5">
          {taskTypeIcons[type] ?? null}
          <span className="text-xs font-medium text-slate-600">
            {taskTypeLabels[type] ?? type}
          </span>
        </div>
      );
    },
    size: 130,
  },
  {
    id: 'code',
    header: () => <span className="text-xs font-semibold text-slate-500">Code</span>,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-slate-400">
        {row.original.task_code ?? '—'}
      </span>
    ),
    size: 150,
  },
  {
    accessorKey: 'task_status',
    header: () => <span className="text-xs font-semibold text-slate-500">Status</span>,
    cell: ({ row }) => {
      const status = row.original.task_status;
      const cfg = statusConfig[status] ?? statusConfig.pending;
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}
        >
          {cfg.icon}
          {cfg.label}
        </span>
      );
    },
    size: 130,
  },
  {
    id: 'actions',
    header: () => null,
    cell: ({ row }) => {
      const task = row.original;
      if (task.task_status === 'completed' || task.task_status === 'skipped') {
        return (
          <span className="inline-flex items-center gap-1 text-xs text-slate-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Done
          </span>
        );
      }
      if (!onOpenAction) return null;
      const cfg = openButtonConfig[task.task_type] ?? {
        label: 'Open',
        className: 'h-6 text-xs border border-slate-200 text-slate-600 hover:bg-slate-50',
      };
      return (
        <Button
          variant="ghost"
          size="sm"
          className={cfg.className}
          onClick={() => onOpenAction(task)}
        >
          <ExternalLink className="h-3 w-3" />
          {cfg.label}
        </Button>
      );
    },
    size: 80,
  },
];