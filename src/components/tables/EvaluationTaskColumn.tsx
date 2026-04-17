'use client';

import { Button } from '@/components/ui/button';
import { EvaluationTask } from '@/config/types/evaluation';
import { ColumnDef } from '@tanstack/react-table';
import { TFunction } from 'i18next';
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

export const getEvaluationTaskColumns = (
  t: TFunction,
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
    header: () => <span className="text-xs font-semibold text-slate-500">{t("planning.form.description")}</span>,
    cell: ({ row }) => (
      <p className="text-sm font-medium text-slate-800 leading-snug">
        {row.original.task_name}
      </p>
    ),
  },
  {
    accessorKey: 'task_type',
    header: () => <span className="text-xs font-semibold text-slate-500">{t("planning.form.type")}</span>,
    cell: ({ getValue }) => {
      const type = getValue() as string;
      return (
        <div className="flex items-center gap-1.5">
          {taskTypeIcons[type] ?? null}
          <span className="text-xs font-medium text-slate-600">
            {t(`planning.tasks.${type}`)}
          </span>
        </div>
      );
    },
    size: 130,
  },
  {
    id: 'code',
    header: () => <span className="text-xs font-semibold text-slate-500">{t("planning.form.missionCode")}</span>,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-slate-400">
        {row.original.task_code ?? '—'}
      </span>
    ),
    size: 150,
  },
  {
    accessorKey: 'task_status',
    header: () => <span className="text-xs font-semibold text-slate-500">{t("planning.form.status")}</span>,
    cell: ({ row }) => {
      const status = row.original.task_status;
      
      const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
        pending: { label: t("planning.status.onHold"), icon: <Circle className="h-3 w-3" />, className: 'border border-slate-300 text-slate-500 bg-white' },
        in_progress: { label: t("planning.status.inProgress"), icon: <Clock className="h-3 w-3 text-amber-500" />, className: 'border border-amber-200 text-amber-700 bg-amber-50' },
        completed: { label: t("planning.status.done"), icon: <CheckCircle2 className="h-3 w-3 text-emerald-500" />, className: 'border border-emerald-200 text-emerald-700 bg-emerald-50' },
        skipped: { label: t("planning.status.suspended"), icon: <SkipForward className="h-3 w-3 text-slate-400" />, className: 'border border-slate-200 text-slate-400 bg-slate-50' },
      };

      const cfg = statusConfig[status] ?? statusConfig.pending;
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
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
            {t("planning.status.done")}
          </span>
        );
      }
      if (!onOpenAction) return null;

      const actionLabels: Record<string, string> = {
        checklist: t("planning.actions.edit"),
        assignment: t("planning.assignment.assign"),
        communication: t("planning.actions.send"),
      };

      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1 border border-slate-200 text-slate-600 hover:bg-slate-50"
          onClick={() => onOpenAction(task)}
        >
          <ExternalLink className="h-3 w-3" />
          {actionLabels[task.task_type] ?? t("planning.actions.edit")}
        </Button>
      );
    },
    size: 80,
  },
];