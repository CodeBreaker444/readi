'use client';

import { Avatar } from '@/components/slot-booking/Avatar';
import { PROGRESS_TONE, toneCls } from '@/components/slot-booking/today-helpers';
import { EmptyBlock, ErrorBlock, WeatherBadge, useSlotI18n } from '@/components/slot-booking/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import type { ClientScheduledFlight, ClientScheduledFlights } from '@/config/types/slot-booking';
import { slotPhase, type SlotPhase } from '@/lib/slot-booking-logic';
import { addDaysIso, localTodayIso, slotLabel } from '@/lib/slot-booking-utils';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Mail, Phone, Plane, PlaneTakeoff, Timer } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const POLL_MS = 60_000;

const PHASE_STYLE: Record<SlotPhase, { dot: string; text: string; bar: string }> = {
  upcoming: { dot: 'bg-violet-500', text: 'text-violet-500', bar: 'bg-violet-500' },
  live: { dot: 'bg-sky-500 animate-pulse', text: 'text-sky-500', bar: 'bg-sky-500' },
  ended: { dot: 'bg-emerald-500', text: 'text-emerald-500', bar: 'bg-emerald-500' },
};

/** Ticks every 30 s, so a flight moves from upcoming to in progress without a reload. */
function useNow(offset: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now + offset;
}

export default function ClientScheduledFlightsPage() {
  const { isDark } = useTheme();
  const s = useSlotI18n();
  const { t } = s;
  const today = localTodayIso();
  const [date, setDate] = useState(today);
  const [data, setData] = useState<ClientScheduledFlights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const inFlight = useRef(false);
  // The day on screen right now, so a late answer for a day the user already left is dropped.
  const shownDate = useRef(date);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await axios.get('/api/client-portal/scheduled-flights', { params: { date } });
      if (shownDate.current !== date) return;
      const body: ClientScheduledFlights = res.data.data;
      setData(body);
      setOffset(Date.parse(body.serverNow) - Date.now());
      setError(null);
    } catch (e: any) {
      if (shownDate.current !== date) return;
      setError(e?.response?.data?.error ?? t('clientPortal.scheduledFlights.loadError'));
    } finally {
      // Only the request of the shown day holds the lock; a stale one must not release the new day's.
      if (shownDate.current === date) inFlight.current = false;
    }
  }, [date, t]);

  useEffect(() => {
    shownDate.current = date;
    setData(null);
    setError(null);
    inFlight.current = false;
    load();
    const id = window.setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const now = useNow(offset);
  const rows = useMemo(
    () => (data?.flights ?? []).map((f) => ({ f, phase: slotPhase(now, Date.parse(f.startAt), Date.parse(f.endAt)) })),
    [data, now],
  );
  const count = (p: SlotPhase) => rows.filter((r) => r.phase === p).length;

  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardCls = cn('rounded-2xl border', isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200 shadow-sm');
  const frame = isDark ? 'border-white/10' : 'border-slate-200';
  const navBtn = cn(
    'cursor-pointer h-8 px-3 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-default',
    isDark ? 'text-slate-300 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-100',
  );
  const phaseLabel = (p: SlotPhase) => t(`clientPortal.scheduledFlights.phase.${p}`);
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const kpi = (icon: React.ReactNode, label: string, value: number, tone: string) => (
    <div className={cn(cardCls, 'p-3 flex items-center gap-3')}>
      <span className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', tone)}>{icon}</span>
      <span className="min-w-0">
        <span className={cn('block text-lg font-semibold leading-tight tabular-nums', textMain)}>{value}</span>
        <span className={cn('block text-[11px] truncate', textSub)}>{label}</span>
      </span>
    </div>
  );

  const renderFlight = ({ f, phase }: { f: ClientScheduledFlight; phase: SlotPhase }) => {
    const st = PHASE_STYLE[phase];
    return (
      <div key={f.slotId} className={cn(cardCls, 'relative p-4 pl-5 flex flex-col gap-3 overflow-hidden')}>
        <span className={cn('absolute left-0 top-0 h-full w-1', st.bar)} />

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className={cn('inline-flex items-center gap-1.5 text-base font-semibold tabular-nums', textMain)}>
              <Clock size={14} className="text-violet-500" /> {slotLabel(f)}
            </div>
            {f.timezone !== browserZone && (
              <div className={cn('text-[11px] mt-0.5', textSub)}>
                {t('clientPortal.scheduledFlights.siteTime', { zone: f.timezone })}
              </div>
            )}
            <div className={cn('mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium', st.text)}>
              <span className={cn('h-2 w-2 rounded-full', st.dot)} /> {phaseLabel(phase)}
            </div>
          </div>
          {f.weather && <WeatherBadge weather={f.weather} isDark={isDark} />}
        </div>

        <div className={cn('rounded-xl p-3 flex items-center gap-3', isDark ? 'bg-white/[0.04]' : 'bg-slate-50')}>
          <Avatar person={f.pilot} size={36} />
          <div className="min-w-0 flex-1">
            <div className={cn('text-[11px] uppercase tracking-wide', textSub)}>{t('clientPortal.scheduledFlights.pilot')}</div>
            <div className={cn('text-sm font-semibold truncate', textMain)}>{f.pilot.name}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              {f.pilot.email && (
                <a href={`mailto:${f.pilot.email}`} className={cn('inline-flex items-center gap-1 text-[11px] hover:underline min-w-0', textSub)}>
                  <Mail size={11} className="shrink-0" /> <span className="truncate">{f.pilot.email}</span>
                </a>
              )}
              {f.pilot.phone && (
                <a href={`tel:${f.pilot.phone}`} className={cn('inline-flex items-center gap-1 text-[11px] hover:underline', textSub)}>
                  <Phone size={11} className="shrink-0" /> {f.pilot.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {f.systemName && (
          <div className={cn('flex items-center gap-1.5 text-xs', textSub)}>
            <Plane size={12} className="shrink-0" /> {t('clientPortal.scheduledFlights.system')}:{' '}
            <span className={cn('truncate font-medium', textMain)}>{f.systemName}</span>
          </div>
        )}

        {f.missions.length > 0 && (
          <div className="space-y-1">
            <div className={cn('text-[11px] uppercase tracking-wide', textSub)}>{t('clientPortal.scheduledFlights.missions')}</div>
            {f.missions.map((m) => {
              const tone = toneCls(PROGRESS_TONE[m.progress], isDark);
              return (
                <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className={cn('truncate', textMain)}>
                    {m.code && <span className="font-mono mr-1.5">{m.code}</span>}
                    {m.name}
                  </span>
                  <span className={cn('inline-flex items-center gap-1 shrink-0', tone.text)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} /> {t(`slotBooking.todayTab.progress.${m.progress}`)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div
        className={cn(
          'top-0 z-10 backdrop-blur-md transition-colors px-4 sm:px-6 py-4 mb-6',
          isDark
            ? 'bg-slate-900/80 border-b border-slate-800 text-white'
            : 'bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
        )}
      >
        <div className="mx-auto max-w-[1800px] flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-violet-600 shrink-0" />
          <div>
            <h1 className={cn('font-semibold text-base tracking-tight', textMain)}>{t('clientPortal.scheduledFlights.title')}</h1>
            <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>{t('clientPortal.scheduledFlights.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 pb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn('inline-flex items-center rounded-lg border overflow-hidden', frame)}>
            <button type="button" className={cn(navBtn, 'px-2')} onClick={() => setDate((d) => addDaysIso(d, -1))} aria-label={t('clientPortal.scheduledFlights.prevDay')}>
              <ChevronLeft size={15} />
            </button>
            <button type="button" className={cn(navBtn, 'border-x', frame)} onClick={() => setDate(today)} disabled={date === today}>
              {t('slotBooking.today')}
            </button>
            <button type="button" className={cn(navBtn, 'px-2')} onClick={() => setDate((d) => addDaysIso(d, 1))} aria-label={t('clientPortal.scheduledFlights.nextDay')}>
              <ChevronRight size={15} />
            </button>
          </div>
          <input
            type="date"
            className={cn(
              'h-8 w-40 rounded-lg border px-2 text-xs outline-none',
              isDark ? 'bg-white/[0.04] border-white/10 text-white [color-scheme:dark]' : 'bg-white border-slate-200 text-slate-900',
            )}
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label={t('clientPortal.scheduledFlights.date')}
          />
          <span className={cn('text-sm font-semibold', textMain)}>{s.date(date)}</span>
        </div>

        {error && !data ? (
          <ErrorBlock isDark={isDark} message={error} onRetry={load} />
        ) : !data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className={cn('h-[62px] rounded-2xl', isDark && 'bg-white/5')} />)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className={cn('h-48 rounded-2xl', isDark && 'bg-white/5')} />)}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <EmptyBlock isDark={isDark}>
            <CalendarDays size={22} className="mx-auto mb-2" />
            {date === today ? t('clientPortal.scheduledFlights.emptyToday') : t('clientPortal.scheduledFlights.empty')}
          </EmptyBlock>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpi(<CalendarDays size={17} />, t('clientPortal.scheduledFlights.kpiTotal'), rows.length, 'bg-violet-500/15 text-violet-500')}
              {kpi(<Timer size={17} />, phaseLabel('upcoming'), count('upcoming'), 'bg-violet-500/15 text-violet-500')}
              {kpi(<PlaneTakeoff size={17} />, phaseLabel('live'), count('live'), 'bg-sky-500/15 text-sky-500')}
              {kpi(<CheckCircle2 size={17} />, phaseLabel('ended'), count('ended'), 'bg-emerald-500/15 text-emerald-500')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">{rows.map(renderFlight)}</div>
          </>
        )}
      </div>
    </div>
  );
}
