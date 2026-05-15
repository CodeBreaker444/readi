'use client';

import { useTheme } from '@/components/useTheme';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { ChevronLeft, ChevronRight, MapPin, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface ClientMission {
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

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  PLANNED:     { bg: 'bg-blue-500/10',    text: 'text-blue-500',    dot: 'bg-blue-500' },
  IN_PROGRESS: { bg: 'bg-amber-500/10',   text: 'text-amber-500',   dot: 'bg-amber-500' },
  COMPLETED:   { bg: 'bg-emerald-500/10', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  CANCELLED:   { bg: 'bg-red-500/10',     text: 'text-red-500',     dot: 'bg-red-500' },
  ABORTED:     { bg: 'bg-red-500/10',     text: 'text-red-500',     dot: 'bg-red-500' },
};

function StatusBadge({ status }: { status: string | null }) {
  const { t } = useTranslation();
  const key = (status ?? '').toUpperCase().replace(/\s+/g, '_');
  const style = STATUS_STYLES[key] ?? { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' };
  const labelKey = `clientPortal.status${key.charAt(0) + key.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', style.bg, style.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', style.dot)} />
      {t(labelKey, status ?? '')}
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

interface DetailSheetProps {
  mission: ClientMission;
  isDark: boolean;
  onClose: () => void;
}

function MissionDetailSheet({ mission, isDark, onClose }: DetailSheetProps) {
  const { t } = useTranslation();

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: t('clientPortal.fieldMissionCode'), value: <span className="font-mono">{mission.mission_code}</span> },
    { label: t('clientPortal.fieldStatus'),       value: <StatusBadge status={mission.status_name} /> },
    { label: t('clientPortal.fieldPilot'),        value: mission.pilot_name ?? '—' },
    { label: t('clientPortal.fieldDrone'),        value: mission.tool_code ? `${mission.tool_code}${mission.tool_name ? ` · ${mission.tool_name}` : ''}` : '—' },
    { label: t('clientPortal.fieldScheduledStart'), value: formatDate(mission.scheduled_start) },
    { label: t('clientPortal.fieldActualStart'),  value: formatDate(mission.actual_start) },
    { label: t('clientPortal.fieldActualEnd'),    value: formatDate(mission.actual_end) },
    { label: t('clientPortal.fieldDuration'),     value: formatDuration(mission.flight_duration) },
    { label: t('clientPortal.fieldLocation'),     value: mission.location ?? '—' },
    { label: t('clientPortal.fieldDistance'),     value: mission.distance_flown ? `${(mission.distance_flown / 1000).toFixed(2)} km` : '—' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full max-w-sm sm:max-w-md h-full overflow-y-auto shadow-2xl flex flex-col',
          isDark ? 'bg-[#1a1f2e]' : 'bg-white',
        )}
      >
        <div className={cn('flex items-start justify-between px-5 py-4 border-b', isDark ? 'border-white/10' : 'border-slate-200')}>
          <div className="min-w-0 flex-1">
            <p className={cn('text-xs font-semibold uppercase tracking-wider', isDark ? 'text-slate-400' : 'text-slate-500')}>
              {t('clientPortal.detailTitle')}
            </p>
            <h2 className={cn('text-base font-semibold mt-0.5 truncate', isDark ? 'text-white' : 'text-slate-900')}>
              {mission.mission_name ?? mission.mission_code}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={cn('p-1.5 rounded-lg transition-colors ml-2 shrink-0', isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 px-5 py-4 space-y-0">
          {rows.map(({ label, value }) => (
            <div key={label} className={cn('flex justify-between items-center py-2.5 border-b last:border-0', isDark ? 'border-white/5' : 'border-slate-100')}>
              <span className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>{label}</span>
              <span className={cn('text-xs font-medium text-right ml-4 max-w-[60%]', isDark ? 'text-white' : 'text-slate-900')}>
                {value}
              </span>
            </div>
          ))}

          {mission.notes && (
            <div className={cn('mt-3 rounded-lg p-3', isDark ? 'bg-white/5' : 'bg-slate-50')}>
              <p className={cn('text-xs font-semibold uppercase tracking-wider mb-1.5', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {t('clientPortal.fieldNotes')}
              </p>
              <p className={cn('text-xs leading-relaxed', isDark ? 'text-slate-300' : 'text-slate-700')}>{mission.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;
const STATUS_KEYS = ['ALL', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export default function ClientMissionsPage() {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const [missions, setMissions] = useState<ClientMission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [detail, setDetail] = useState<ClientMission | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);

    setLoading(true);
    axios
      .get(`/api/client-portal/missions?${params}`)
      .then((res) => {
        setMissions(res.data.data ?? []);
        setTotal(res.data.total ?? 0);
      })
      .catch((e) => toast.error(e.response?.data?.error ?? t('common.error', 'Error')))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const handleStatus = (val: string) => { setStatusFilter(val); setPage(1); };

  const statusLabel = (key: string) => {
    if (key === 'ALL') return t('clientPortal.statusAll');
    const labelKey = `clientPortal.status${key.charAt(0) + key.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`;
    return t(labelKey, key);
  };

  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textSub  = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderColor = isDark ? 'border-white/10' : 'border-slate-200';

  const tableHeaders = [
    t('clientPortal.colCode'),
    t('clientPortal.colMission'),
    t('clientPortal.colStatus'),
    t('clientPortal.colPilot'),
    t('clientPortal.colDrone'),
    t('clientPortal.colScheduled'),
    t('clientPortal.colDuration'),
    t('clientPortal.colLocation'),
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Page header — matches OperationsPageHeader style */}
      <div
        className={cn(
          'top-0 z-10 backdrop-blur-md transition-colors px-4 sm:px-6 py-4 mb-6',
          isDark
            ? 'bg-slate-900/80 border-b border-slate-800 text-white'
            : 'bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
        )}
      >
        <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600 shrink-0" />
            <div>
              <h1 className={cn('font-semibold text-base tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
                {t('clientPortal.missionsTitle')}
              </h1>
              <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
                {t('clientPortal.missionsSubtitle')}
              </p>
            </div>
          </div>
          <span className={cn('text-xs tabular-nums', textSub)}>
            {total} {total === 1 ? t('clientPortal.missionCount_one', { count: total }) : t('clientPortal.missionCount_other', { count: total })}
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-8 space-y-4 max-w-[1800px] mx-auto w-full">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 min-w-0',
            isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200',
          )}>
            <Search className={cn('h-4 w-4 shrink-0', textSub)} />
            <input
              className={cn('bg-transparent text-sm outline-none flex-1 min-w-0', textMain)}
              placeholder={t('clientPortal.searchPlaceholder')}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => handleSearch('')} className={cn('shrink-0', textSub)}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5 flex-wrap shrink-0">
            {STATUS_KEYS.map((s) => (
              <button
                key={s}
                onClick={() => handleStatus(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap',
                  statusFilter === s
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : isDark
                    ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                {statusLabel(s)}
              </button>
            ))}
          </div>
        </div>

        {/* Table card */}
        <div className={cn('rounded-xl border overflow-hidden', isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm')}>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-violet-500" />
            </div>
          ) : missions.length === 0 ? (
            <div className={cn('flex flex-col items-center justify-center h-40 gap-2', textSub)}>
              <svg className="h-8 w-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12zm0 0h7.5" />
              </svg>
              <p className="text-sm">{t('clientPortal.noMissions')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className={cn('border-b', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50')}>
                    {tableHeaders.map((h) => (
                      <th key={h} className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider', textSub)}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {missions.map((m) => (
                    <tr
                      key={m.pilot_mission_id}
                      onClick={() => setDetail(m)}
                      className={cn(
                        'border-b last:border-0 cursor-pointer transition-colors',
                        isDark ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-violet-50/50',
                      )}
                    >
                      <td className={cn('px-4 py-3 font-mono font-medium text-xs', textMain)}>
                        {m.mission_code}
                      </td>
                      <td className={cn('px-4 py-3 max-w-[160px]', textMain)}>
                        <span className="block truncate text-sm">{m.mission_name ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={m.status_name} />
                      </td>
                      <td className={cn('px-4 py-3 text-sm', textSub)}>{m.pilot_name ?? '—'}</td>
                      <td className={cn('px-4 py-3 font-mono text-xs', textSub)}>{m.tool_code ?? '—'}</td>
                      <td className={cn('px-4 py-3 text-xs whitespace-nowrap', textSub)}>
                        {formatDate(m.scheduled_start)}
                      </td>
                      <td className={cn('px-4 py-3 text-xs whitespace-nowrap', textSub)}>
                        {formatDuration(m.flight_duration)}
                      </td>
                      <td className={cn('px-4 py-3 max-w-[140px] text-xs', textSub)}>
                        {m.location ? (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {m.location}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <span className={cn('text-xs', textSub)}>
              {t('clientPortal.pageOf', { page, total: totalPages })}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={cn(
                  'p-1.5 rounded-lg border transition-colors disabled:opacity-40',
                  isDark ? 'border-white/10 hover:bg-white/10 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600',
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={cn(
                  'p-1.5 rounded-lg border transition-colors disabled:opacity-40',
                  isDark ? 'border-white/10 hover:bg-white/10 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600',
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {detail && <MissionDetailSheet mission={detail} isDark={isDark} onClose={() => setDetail(null)} />}
    </div>
  );
}
