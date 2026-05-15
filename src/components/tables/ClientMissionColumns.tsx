'use client';

import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { TFunction } from 'i18next';
import { MapPin } from 'lucide-react';

export interface ClientMission {
  pilot_mission_id: number;
  mission_code: string;
  mission_name: string | null;
  status_name: string | null;
  scheduled_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  flight_duration: number | null;
  location: string | null;
  distance_flown: number | null;
  notes: string | null;
  pilot_name: string | null;
  tool_code: string | null;
  tool_name: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  PLANNED:     { bg: 'bg-blue-500/10',    text: 'text-blue-500',    dot: 'bg-blue-500' },
  IN_PROGRESS: { bg: 'bg-amber-500/10',   text: 'text-amber-500',   dot: 'bg-amber-500' },
  COMPLETED:   { bg: 'bg-emerald-500/10', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  CANCELLED:   { bg: 'bg-red-500/10',     text: 'text-red-500',     dot: 'bg-red-500' },
  ABORTED:     { bg: 'bg-red-500/10',     text: 'text-red-500',     dot: 'bg-red-500' },
};

function StatusBadge({ status }: { status: string | null }) {
  const key = (status ?? '').toUpperCase().replace(/\s+/g, '_');
  const style = STATUS_CONFIG[key] ?? { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' };
  const label = status ?? '—';
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', style.bg, style.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', style.dot)} />
      {label}
    </span>
  );
}

function formatDate(dt: string | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export const getClientMissionColumns = (
  t: TFunction,
  isDark: boolean,
  onRowClick: (mission: ClientMission) => void,
): ColumnDef<ClientMission>[] => {
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textSub  = isDark ? 'text-slate-400' : 'text-slate-500';

  return [
    {
      accessorKey: 'mission_code',
      header: t('clientPortal.colCode'),
      cell: ({ getValue }) => (
        <span className={cn('font-mono font-medium text-xs', textMain)}>
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'mission_name',
      header: t('clientPortal.colMission'),
      cell: ({ getValue }) => (
        <span className={cn('block truncate text-sm max-w-[160px]', textMain)}>
          {getValue<string | null>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status_name',
      header: t('clientPortal.colStatus'),
      cell: ({ getValue }) => <StatusBadge status={getValue<string | null>()} />,
    },
    {
      accessorKey: 'pilot_name',
      header: t('clientPortal.colPilot'),
      cell: ({ getValue }) => (
        <span className={cn('text-sm', textSub)}>{getValue<string | null>() ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'tool_code',
      header: t('clientPortal.colDrone'),
      cell: ({ getValue }) => (
        <span className={cn('font-mono text-xs', textSub)}>{getValue<string | null>() ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'scheduled_start',
      header: t('clientPortal.colScheduled'),
      cell: ({ getValue }) => (
        <span className={cn('text-xs whitespace-nowrap', textSub)}>
          {formatDate(getValue<string | null>())}
        </span>
      ),
    },
    {
      accessorKey: 'flight_duration',
      header: t('clientPortal.colDuration'),
      cell: ({ getValue }) => (
        <span className={cn('text-xs whitespace-nowrap', textSub)}>
          {formatDuration(getValue<number | null>())}
        </span>
      ),
    },
    {
      accessorKey: 'location',
      header: t('clientPortal.colLocation'),
      cell: ({ getValue }) => {
        const loc = getValue<string | null>();
        return loc ? (
          <span className={cn('flex items-center gap-1 truncate text-xs max-w-[140px]', textSub)}>
            <MapPin className="h-3 w-3 shrink-0" />
            {loc}
          </span>
        ) : (
          <span className={cn('text-xs', textSub)}>—</span>
        );
      },
    },
  ];
};
