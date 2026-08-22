'use client';

import { Badge } from '@/components/ui/badge';
import { EvaluationResult, EvaluationStatus } from '@/config/types/evaluation';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const STATUS_CLASS: Record<EvaluationStatus, string> = {
  NEW:       'bg-sky-100 text-sky-800 border-sky-200',
  PROGRESS:  'bg-amber-100 text-amber-800 border-amber-200',
  REVIEW:    'bg-violet-100 text-violet-800 border-violet-200',
  SUSPENDED: 'bg-slate-100 text-slate-600 border-slate-200',
  DONE:      'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const RESULT_CLASS: Record<EvaluationResult, string> = {
  PROCESSING:      'bg-blue-100 text-blue-800 border-blue-200',
  RESULT_POSITIVE: 'bg-green-100 text-green-800 border-green-200',
  RESULT_NEGATIVE: 'bg-red-100 text-red-800 border-red-200',
};

export function StatusBadge({
  status,
  className,
}: {
  status: EvaluationStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  const labelMap: Record<EvaluationStatus, string> = {
    NEW:       t('planning.status.newTask'),
    PROGRESS:  t('planning.status.inProgress'),
    REVIEW:    t('planning.status.feedback'),
    SUSPENDED: t('planning.status.suspended'),
    DONE:      t('planning.status.done'),
  };
  const label = labelMap[status] ?? status;
  const cls = STATUS_CLASS[status] ?? '';
  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium px-2 py-0.5', cls, className)}
    >
      {label}
    </Badge>
  );
}

export function ResultBadge({
  result,
  className,
}: {
  result: EvaluationResult;
  className?: string;
}) {
  const { t } = useTranslation();
  const labelMap: Record<EvaluationResult, string> = {
    PROCESSING:      t('planning.status.processing'),
    RESULT_POSITIVE: t('planning.status.positive'),
    RESULT_NEGATIVE: t('planning.status.refused'),
  };
  const label = labelMap[result] ?? result;
  const cls = RESULT_CLASS[result] ?? '';
  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium px-2 py-0.5', cls, className)}
    >
      {label}
    </Badge>
  );
}



const STATUS_MAP: Record<string, { light: string; dark: string; dot: string }> = {
  NEW: {
    light: "bg-slate-100 text-slate-700",
    dark: "bg-slate-700/40 text-slate-300",
    dot: "bg-slate-400",
  },
  PROCESSING: {
    light: "bg-amber-100 text-amber-700",
    dark: "bg-amber-500/20 text-amber-300",
    dot: "bg-amber-500",
  },
  REQ_FEEDBACK: {
    light: "bg-violet-100 text-violet-700",
    dark: "bg-violet-500/20 text-violet-300",
    dot: "bg-violet-500",
  },
  POSITIVE_RESULT: {
    light: "bg-emerald-100 text-emerald-700",
    dark: "bg-emerald-500/20 text-emerald-300",
    dot: "bg-emerald-500",
  },
  NEGATIVE_RESULT: {
    light: "bg-rose-100 text-rose-700",
    dark: "bg-rose-500/20 text-rose-300",
    dot: "bg-rose-500",
  },
  PROGRESS: {
    light: "bg-slate-100 text-slate-700",
    dark: "bg-slate-700/40 text-slate-300",
    dot: "bg-slate-400",
  },
};

interface PlanningStatusBadgeProps {
  status: string;
  isDark: boolean;
}

export default function PlanningStatusBadge({ status, isDark }: PlanningStatusBadgeProps) {
  const colors = STATUS_MAP[status] ?? STATUS_MAP.PROGRESS;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide",
        isDark ? colors.dark : colors.light
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
      {status.replace(/_/g, " ")}
    </span>
  );
}