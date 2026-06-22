'use client';

type SystemCellSize = 'sm' | 'md' | 'lg';

interface SystemCellProps {
  code: string | null | undefined;
  name?: string | null;
  primaryDrone?: string | null;
  size?: SystemCellSize;
  toolStatus?: string | null;
}

const styles: Record<SystemCellSize, { code: string; sub: string }> = {
  sm: {
    code: 'text-xs font-medium text-slate-800 dark:text-slate-100',
    sub:  'text-[10px] text-muted-foreground truncate max-w-40',
  },
  md: {
    code: 'text-sm font-semibold text-slate-800 dark:text-slate-100',
    sub:  'text-xs text-muted-foreground truncate max-w-40',
  },
  lg: {
    code: 'text-md font-semibold text-slate-900 dark:text-white',
    sub:  'text-sm text-muted-foreground truncate max-w-48',
  },
};

export function SystemCell({ code, name, primaryDrone, size = 'md', toolStatus }: SystemCellProps) {
  if (!code) return <span className="text-slate-300 dark:text-slate-600">—</span>;

  const isNonOp = toolStatus === 'NOT_OPERATIONAL';
  const s = styles[size];
  return (
    <div className={`flex flex-col gap-0.5 ${isNonOp ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-1.5">
        <span className={s.code}>{code}</span>
        {isNonOp && (
          <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 rounded px-1 py-0.5 leading-none dark:bg-red-950 dark:text-red-400 dark:border-red-800">
            Not Operational
          </span>
        )}
      </div>
      {name && <span className={s.sub}>{name}</span>}
      {primaryDrone && <span className={s.sub}>↳ {primaryDrone}</span>}
    </div>
  );
}
