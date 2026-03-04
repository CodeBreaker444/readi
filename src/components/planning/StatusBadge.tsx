import { Badge } from '@/components/ui/badge';
import { EvaluationResult, EvaluationStatus } from '@/config/types/evaluation';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<EvaluationStatus, { label: string; className: string }> = {
  NEW:       { label: 'New Task',     className: 'bg-sky-100 text-sky-800 border-sky-200' },
  PROGRESS:  { label: 'In Progress',  className: 'bg-amber-100 text-amber-800 border-amber-200' },
  REVIEW:    { label: 'Feedback',     className: 'bg-violet-100 text-violet-800 border-violet-200' },
  SUSPENDED: { label: 'Suspended',    className: 'bg-slate-100 text-slate-600 border-slate-200' },
  DONE:      { label: 'Done',         className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

const RESULT_CONFIG: Record<EvaluationResult, { label: string; className: string }> = {
  PROCESSING:        { label: 'Processing',  className: 'bg-blue-100 text-blue-800 border-blue-200' },
  RESULT_POSITIVE:   { label: '✓ Positive',  className: 'bg-green-100 text-green-800 border-green-200' },
  RESULT_NEGATIVE:   { label: '✗ Refused',   className: 'bg-red-100 text-red-800 border-red-200' },
};

export function StatusBadge({
  status,
  className,
}: {
  status: EvaluationStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: '' };
  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium px-2 py-0.5', config.className, className)}
    >
      {config.label}
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
  const config = RESULT_CONFIG[result] ?? { label: result, className: '' };
  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium px-2 py-0.5', config.className, className)}
    >
      {config.label}
    </Badge>
  );
}



const STATUS_MAP: Record<string, { light: string; dark: string; dot: string }> = {
  NEW: {
    light: "bg-blue-50 text-blue-700 border-blue-200",
    dark: "bg-blue-900/30 text-blue-300 border-blue-700/50",
    dot: "bg-blue-500",
  },
  PROCESSING: {
    light: "bg-amber-50 text-amber-700 border-amber-200",
    dark: "bg-amber-900/30 text-amber-300 border-amber-700/50",
    dot: "bg-amber-500",
  },
  REQ_FEEDBACK: {
    light: "bg-purple-50 text-purple-700 border-purple-200",
    dark: "bg-purple-900/30 text-purple-300 border-purple-700/50",
    dot: "bg-purple-500",
  },
  POSITIVE_RESULT: {
    light: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dark: "bg-emerald-900/30 text-emerald-300 border-emerald-700/50",
    dot: "bg-emerald-500",
  },
  NEGATIVE_RESULT: {
    light: "bg-red-50 text-red-700 border-red-200",
    dark: "bg-red-900/30 text-red-300 border-red-700/50",
    dot: "bg-red-500",
  },
  PROGRESS: {
    light: "bg-slate-50 text-slate-600 border-slate-200",
    dark: "bg-slate-800 text-slate-400 border-slate-700",
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
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide",
        isDark ? colors.dark : colors.light
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
      {status.replace(/_/g, " ")}
    </span>
  );
}