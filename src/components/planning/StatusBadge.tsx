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