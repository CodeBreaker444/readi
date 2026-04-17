'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface OperationsStatsProps {
  isDark: boolean;
  loading: boolean;
  total: number;
  planned: number;
  inProgress: number;
  completed: number;
}

export function OperationsStats({
  isDark,
  loading,
  total,
  planned,
  inProgress,
  completed,
}: OperationsStatsProps) {
  const { t } = useTranslation();

  const stats = [
    { labelKey: 'operations.table.stats.total', value: total, color: 'text-foreground' },
    { labelKey: 'operations.table.stats.planned', value: planned, color: 'text-blue-600' },
    { labelKey: 'operations.table.stats.inProgress', value: inProgress, color: 'text-violet-600' },
    { labelKey: 'operations.table.stats.completed', value: completed, color: 'text-emerald-600' },
  ];

  return (
    <div className="mt-4 grid grid-cols-4 p-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.labelKey}
          className={`rounded-lg border px-4 py-2.5 ${
            isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-muted/30 border-slate-200'
          }`}
        >
          <p className="text-xs text-muted-foreground">{t(s.labelKey)}</p>
          {loading ? (
            <Skeleton className="mt-1 h-8 w-12" />
          ) : (
            <p className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.value}</p>
          )}
        </div>
      ))}
    </div>
  );
}
