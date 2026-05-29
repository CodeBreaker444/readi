'use client';

type SystemCellSize = 'sm' | 'md' | 'lg';

interface SystemCellProps {
  code: string | null | undefined;
  name?: string | null;
  primaryDrone?: string | null;
  size?: SystemCellSize;
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

export function SystemCell({ code, name, primaryDrone, size = 'md' }: SystemCellProps) {
  if (!code) return <span className="text-slate-300 dark:text-slate-600">—</span>;

  const s = styles[size];
  return (
    <div className="flex flex-col gap-0.5">
      <span className={s.code}>{code}</span>
      {name && <span className={s.sub}>{name}</span>}
      {primaryDrone && <span className={s.sub}>↳ {primaryDrone}</span>}
    </div>
  );
}
