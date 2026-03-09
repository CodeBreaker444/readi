'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EvaluationTask } from '@/config/types/evaluation';
import { ColumnDef } from '@tanstack/react-table';
import {
  CheckCircle2,
  Circle,
  Clock,
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

const statusConfig: Record<
  string,
  { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  pending: {
    label: 'Pending',
    icon: <Circle className="h-3 w-3" />,
    variant: 'outline',
  },
  in_progress: {
    label: 'In Progress',
    icon: <Clock className="h-3 w-3" />,
    variant: 'secondary',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle2 className="h-3 w-3" />,
    variant: 'default',
  },
  skipped: {
    label: 'Skipped',
    icon: <SkipForward className="h-3 w-3" />,
    variant: 'outline',
  },
};

export const getEvaluationTaskColumns = (
  onStatusChange?: (taskId: number, status: string) => void,
  onOpenAction?: (task: EvaluationTask) => void,
): ColumnDef<EvaluationTask>[] => [
  {
    accessorKey: 'task_id',
    header: () => <span className="text-xs font-semibold text-slate-500">#</span>,
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-slate-400">{getValue() as number}</span>
    ),
    size: 48,
  },
  {
    accessorKey: 'task_type',
    header: () => <span className="text-xs font-semibold text-slate-500">Type</span>,
    cell: ({ getValue }) => {
      const type = getValue() as string;
      return (
        <div className="flex items-center gap-1.5">
          {taskTypeIcons[type] ?? null}
          <span className="text-xs font-medium capitalize">{type}</span>
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: 'task_name',
    header: () => <span className="text-xs font-semibold text-slate-500">Task</span>,
    cell: ({ row }) => (
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-slate-800">{row.original.task_name}</p>
        {row.original.task_description && (
          <p className="text-xs text-slate-400 truncate max-w-[300px]">
            {row.original.task_description}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'task_status',
    header: () => <span className="text-xs font-semibold text-slate-500">Status</span>,
    cell: ({ row }) => {
      const task = row.original;
      const config = statusConfig[task.task_status] ?? statusConfig.pending;

      if (onStatusChange) {
        return (
          <Select
            value={task.task_status}
            onValueChange={(val) => onStatusChange(task.task_id, val)}
          >
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending" className="text-xs">Pending</SelectItem>
              <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
              <SelectItem value="completed" className="text-xs">Completed</SelectItem>
              <SelectItem value="skipped" className="text-xs">Skipped</SelectItem>
            </SelectContent>
          </Select>
        );
      }

      return (
        <Badge variant={config.variant} className="gap-1 text-xs">
          {config.icon}
          {config.label}
        </Badge>
      );
    },
    size: 150,
  },
  {
    id: 'code',
    header: () => <span className="text-xs font-semibold text-slate-500">Code</span>,
    cell: ({ row }) => {
      const task = row.original;
      const code =
        task.assignment_code ?? task.checklist_code ?? task.communication_code ?? '—';
      return <span className="font-mono text-xs text-slate-500">{code}</span>;
    },
    size: 120,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const task = row.original;
      if (!onOpenAction) return null;
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => onOpenAction(task)}
        >
          Open
        </Button>
      );
    },
    size: 60,
  },
];