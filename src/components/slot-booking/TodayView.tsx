'use client';

import type { TodayBoard, TodayMission, TodaySlot } from '@/config/types/slot-booking';
import {
  slotElapsed,
  slotPhase,
  TODAY_ALERT_STATES,
  todaySlotState,
  type MissionProgress,
  type SlotPhase,
  type TodaySlotState,
} from '@/lib/slot-booking-logic';
import { slotLabel } from '@/lib/slot-booking-utils';
import { cn } from '@/lib/utils';
import axios from 'axios';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Clock,
  Link2,
  Loader2,
  Moon,
  Plane,
  Plus,
  RefreshCw,
  Timer,
  X,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { toast } from 'sonner';
import { LinkMissionsDialog } from './LinkMissionsDialog';
import { fmtCountdown, fmtDuration, PROGRESS_TONE, STATE_TONE, toneCls, useSiteTime, type Tone } from './today-helpers';
import { apiMsg, Btn, card, EmptyBlock, ErrorBlock, heading, muted, Pill, useSlotI18n, WeatherBadge } from './ui';
import { TodaySkeleton } from './skeletons';

const BASE = '/api/operation/slot-booking';
const POLL_MS = 20_000;

/** Ticks every second. */
function useNow(offset: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now + offset;
}

interface SlotRow {
  slot: TodaySlot;
  from: number;
  to: number;
  phase: SlotPhase;
  elapsed: number;
  state: TodaySlotState;
  alert: boolean;
}
 
export function TodayView({ isDark }: { isDark: boolean }) {
  const s = useSlotI18n();
  const { t } = s;
  const [board, setBoard] = useState<TodayBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [linkSlot, setLinkSlot] = useState<TodaySlot | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(
    async (manual = false) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (manual) setRefreshing(true);
      try {
        const res = await axios.get(`${BASE}/today`);
        const data: TodayBoard = res.data.data;
        setBoard(data);
        setOffset(Date.parse(data.serverNow) - Date.now());
        setFetchedAt(Date.now());
        setError(null);
      } catch (e) {
        // Keep showing the last data on a failed background refresh; only an empty screen shows the error.
        setError(apiMsg(e, t('slotBooking.todayTab.errors.load')));
      } finally {
        inFlight.current = false;
        setRefreshing(false);
      }
    },
    [t],
  );

  // Poll so missions started or finished on the Daily Board show up here, and refresh when the tab comes back.
  useEffect(() => {
    load();
    const id = window.setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [load]);

  const now = useNow(offset);

  const rows = useMemo<SlotRow[]>(
    () =>
      (board?.slots ?? []).map((slot) => {
        const from = Date.parse(slot.startAt);
        const to = Date.parse(slot.endAt);
        const phase = slotPhase(now, from, to);
        const state = todaySlotState(phase, slot.missions.map((m) => m.progress));
        return { slot, from, to, phase, elapsed: slotElapsed(now, from, to), state, alert: TODAY_ALERT_STATES.includes(state) };
      }),
    [board, now],
  );

  const unlink = async (slotId: number, missionId: number) => {
    const key = `${slotId}:${missionId}`;
    setUnlinking(key);
    try {
      await axios.delete(`${BASE}/slots/${slotId}/missions`, { params: { missionId } });
      toast.success(t('slotBooking.todayTab.unlinked'));
      await load();
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.todayTab.errors.unlink')));
    } finally {
      setUnlinking(null);
    }
  };

  if (!board) {
    return error ? <ErrorBlock isDark={isDark} message={error} onRetry={() => load(true)} /> : <TodaySkeleton isDark={isDark} />;
  }

  const missions = board.slots.flatMap((x) => x.missions);
  const activeMissions = missions.filter((m) => m.progress !== 'aborted');
  const summary = {
    slots: rows.length,
    dutyMs: rows.reduce((sum, r) => sum + (r.to - r.from), 0),
    done: activeMissions.filter((m) => m.progress === 'completed').length,
    total: activeMissions.length,
    inProgress: missions.filter((m) => m.progress === 'in_progress').length,
    attention: rows.filter((r) => r.alert).length,
  };
  // The header shows the site's date and time, the same clock the slot times are in, whatever zone the pilot is in.
  const headerZone = (rows.find((r) => r.phase === 'live') ?? rows.find((r) => r.phase === 'upcoming') ?? rows[0])?.slot.timezone;
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const abroad = !!headerZone && headerZone !== browserZone;
  const fmt = (opts: Intl.DateTimeFormatOptions) => new Date(now).toLocaleString(s.locale, { ...opts, ...(headerZone ? { timeZone: headerZone } : {}) });
  const anyLive = rows.some((r) => r.phase === 'live');
  const nowIndex = anyLive ? -1 : rows.findIndex((r) => r.from > now);
  const markerAt = anyLive ? -1 : nowIndex === -1 ? rows.length : nowIndex;
  const secondsAgo = fetchedAt ? Math.max(0, Math.round((Date.now() - fetchedAt) / 1000)) : null;

  return (
    <div className="space-y-5">
      {/* Day header */}
      <div className={cn('rounded-xl border px-4 py-3', card(isDark))}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'w-11 h-11 rounded-lg border flex flex-col items-center justify-center leading-none shrink-0',
                isDark ? 'border-white/[0.1] bg-white/[0.03]' : 'border-gray-200 bg-gray-50',
              )}
            >
              <span className={cn('text-[9px] font-semibold uppercase tracking-wider', muted(isDark))}>
                {fmt({ month: 'short' })}
              </span>
              <span className={cn('text-base font-semibold mt-0.5', heading(isDark))}>{fmt({ day: 'numeric' })}</span>
            </div>
            <div className="min-w-0">
              <div className={cn('text-sm font-semibold', heading(isDark))}>
                {fmt({ weekday: 'long', day: 'numeric', month: 'long' })}
                <span className={cn('ml-2 font-normal tabular-nums', muted(isDark))}>
                  {fmt({ hour: '2-digit', minute: '2-digit' })}
                  {headerZone && ' · ' + headerZone}
                </span>
              </div>
              <div className={cn('text-[11px] mt-0.5 inline-flex items-center gap-1.5', muted(isDark))}>
                <span className={cn('h-1.5 w-1.5 rounded-full', isDark ? 'bg-gray-500' : 'bg-gray-400')} />
                {t('slotBooking.todayTab.live')}
                {secondsAgo !== null && ` · ${secondsAgo < 5 ? t('slotBooking.todayTab.justNow') : t('slotBooking.todayTab.secondsAgo', { count: secondsAgo })}`}
                {abroad && ` · ${t('slotBooking.todayTab.yourTime', { time: new Date(now).toLocaleTimeString(s.locale, { hour: '2-digit', minute: '2-digit' }) })}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Btn isDark={isDark} onClick={() => load(true)} loading={refreshing}>
              {!refreshing && <RefreshCw size={12} />} {t('slotBooking.todayTab.refresh')}
            </Btn>
            <Link
              href="/operations/daily-board"
              className="h-8 inline-flex items-center gap-1.5 px-3.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              <Plane size={13} /> {t('slotBooking.todayTab.openBoard')}
            </Link>
          </div>
        </div>
        {error && <p className="mt-2 text-[11px] text-amber-500">{error}</p>}
      </div>

      {rows.length === 0 ? (
        <EmptyBlock isDark={isDark}>
          <CalendarClock size={26} className="mx-auto mb-2 text-violet-500" />
          <div className={cn('text-sm font-medium', heading(isDark))}>{t('slotBooking.todayTab.empty')}</div>
          <div className="mt-1">{t('slotBooking.todayTab.emptyHint')}</div>
        </EmptyBlock>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Tile isDark={isDark} icon={<CalendarClock size={15} />} label={t('slotBooking.todayTab.tiles.slots')} value={String(summary.slots)} />
            <Tile isDark={isDark} icon={<Timer size={15} />} label={t('slotBooking.todayTab.tiles.duty')} value={fmtDuration(summary.dutyMs)} />
            <Tile
              isDark={isDark}
              icon={<CheckCircle2 size={15} />}
              label={t('slotBooking.todayTab.tiles.missions')}
              value={`${summary.done}/${summary.total}`}
              tone={summary.total > 0 && summary.done === summary.total ? 'green' : undefined}
              progress={summary.total ? summary.done / summary.total : 0}
            />
            <Tile isDark={isDark} icon={<Plane size={15} />} label={t('slotBooking.todayTab.tiles.inProgress')} value={String(summary.inProgress)} tone={summary.inProgress ? 'blue' : undefined} pulse={summary.inProgress > 0} />
            <Tile isDark={isDark} icon={<CircleAlert size={15} />} label={t('slotBooking.todayTab.tiles.attention')} value={String(summary.attention)} tone={summary.attention ? 'red' : 'green'} />
          </div>

          {/* Attention banner */}
          {summary.attention > 0 || board.unlinkedMissions > 0 ? (
            <div className={cn('rounded-xl border p-4 flex items-start gap-3', isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200')}>
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <div className="text-xs space-y-0.5">
                {summary.attention > 0 && (
                  <div className={cn('text-sm font-semibold', heading(isDark))}>{t('slotBooking.todayTab.attentionBanner', { count: summary.attention })}</div>
                )}
                {summary.attention > 0 && <div className={muted(isDark)}>{t('slotBooking.todayTab.attentionHint')}</div>}
                {board.unlinkedMissions > 0 && (
                  <div className={cn(summary.attention ? muted(isDark) : cn('text-sm font-semibold', heading(isDark)))}>
                    {t('slotBooking.todayTab.unlinkedHint', { count: board.unlinkedMissions })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={cn('rounded-xl border p-4 flex items-center gap-3', isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200')}>
              <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
              <div className={cn('text-sm font-semibold', heading(isDark))}>{t('slotBooking.todayTab.allGood')}</div>
            </div>
          )}

          {/* Timeline */}
          <div className="relative">
            {rows.map((r, i) => (
              <div key={r.slot.slotId}>
                {markerAt === i && <NowMarker isDark={isDark} now={now} locale={s.locale} />}
                <TimelineItem
                  isDark={isDark}
                  row={r}
                  now={now}
                  last={i === rows.length - 1}
                  onLink={() => setLinkSlot(r.slot)}
                  onUnlink={(missionId) => unlink(r.slot.slotId, missionId)}
                  unlinking={unlinking}
                />
              </div>
            ))}
            {markerAt === rows.length && <NowMarker isDark={isDark} now={now} locale={s.locale} />}
          </div>

          <Legend isDark={isDark} />
        </>
      )}

      <LinkMissionsDialog
        isDark={isDark}
        slot={linkSlot}
        onClose={() => setLinkSlot(null)}
        onLinked={async () => {
          setLinkSlot(null);
          await load();
        }}
      />
    </div>
  );
}

// ───────────────────────── Pieces ─────────────────────────

function Tile({
  isDark,
  icon,
  label,
  value,
  tone,
  progress,
  pulse,
}: {
  isDark: boolean;
  icon: ReactNode;
  label: string;
  value: string;
  tone?: Tone;
  progress?: number;
  pulse?: boolean;
}) {
  const c = tone ? toneCls(tone, isDark) : null;
  return (
    <div className={cn('rounded-xl border p-3.5', card(isDark))}>
      <div className={cn('flex items-center gap-1.5 text-[11px] font-medium', c ? c.text : muted(isDark))}>
        <span className={cn(pulse && 'animate-pulse')}>{icon}</span>
        {label}
      </div>
      <div className={cn('mt-1.5 text-xl font-semibold tabular-nums', c && tone !== 'gray' ? c.text : heading(isDark))}>{value}</div>
      {progress !== undefined && (
        <div className={cn('mt-2 h-1 rounded-full overflow-hidden', isDark ? 'bg-white/[0.08]' : 'bg-black/[0.06]')}>
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function NowMarker({ isDark, now, locale }: { isDark: boolean; now: number; locale: string }) {
  return (
    <div className="flex items-center gap-3 py-2 pl-[86px]">
      <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 tabular-nums">
        {new Date(now).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
      </span>
      <div className={cn('flex-1 h-px', isDark ? 'bg-red-500/50' : 'bg-red-400')} />
    </div>
  );
}

function TimelineItem({
  isDark,
  row,
  now,
  last,
  onLink,
  onUnlink,
  unlinking,
}: {
  isDark: boolean;
  row: SlotRow;
  now: number;
  last: boolean;
  onLink: () => void;
  onUnlink: (missionId: number) => void;
  unlinking: string | null;
}) {
  const s = useSlotI18n();
  const { t } = s;
  const { slot, phase, elapsed, state, alert, from, to } = row;
  const tone = STATE_TONE[state];
  const c = toneCls(tone, isDark);
  const live = phase === 'live';
  const overnight = slot.end <= slot.start;
  const pct = Math.round(elapsed * 100);
  const timeText =
    phase === 'upcoming'
      ? t('slotBooking.todayTab.phase.startsIn', { time: fmtCountdown(from - now) })
      : phase === 'live'
        ? t('slotBooking.todayTab.phase.left', { time: fmtCountdown(to - now) })
        : t('slotBooking.todayTab.phase.ended');

  return (
    <div className="flex gap-4">
      {/* Time rail */}
      <div className="w-[70px] shrink-0 text-right pt-4">
        <div className={cn('text-sm font-semibold tabular-nums', live ? c.text : heading(isDark))}>{slot.start}</div>
        <div className={cn('text-[11px] tabular-nums', muted(isDark))}>{slot.end}</div>
      </div>
      <div className="relative flex flex-col items-center">
        <span className={cn('relative mt-5 flex h-3 w-3 shrink-0')}>
          {(live || state === 'in_progress') && <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-60', c.dot)} />}
          <span className={cn('relative inline-flex rounded-full h-3 w-3 ring-4', c.dot, isDark ? 'ring-[#0a0e1a]' : 'ring-[#f4f6f9]')} />
        </span>
        {!last && <div className={cn('w-px flex-1 mt-1', isDark ? 'bg-white/[0.08]' : 'bg-gray-200')} />}
      </div>

      {/* Card */}
      <div
        className={cn(
          'relative flex-1 min-w-0 mb-4 rounded-xl border overflow-hidden transition-shadow',
          isDark ? 'bg-[#0f1320]' : 'bg-white shadow-sm',
          alert ? c.border : live ? (isDark ? 'border-sky-500/30' : 'border-sky-200') : isDark ? 'border-white/[0.06]' : 'border-gray-200',
          live && 'shadow-md',
        )}
      >
        {/* Timer fill: grows with the time passed in the slot */}
        <div className={cn('absolute inset-y-0 left-0 transition-[width] duration-1000 ease-linear pointer-events-none', phase === 'ended' && !alert ? (isDark ? 'bg-white/[0.02]' : 'bg-gray-500/[0.03]') : c.fill)} style={{ width: `${pct}%` }}>
          {live && <div className={cn('absolute right-0 inset-y-0 w-0.5', c.bar)} />}
        </div>
        {live && (
          <div className="absolute inset-y-0 pointer-events-none overflow-hidden" style={{ width: `${pct}%` }}>
            <div className="absolute inset-0 -translate-x-full animate-[slotShimmer_2.4s_linear_infinite] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
          </div>
        )}

        <div className="relative p-4 space-y-3">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-[15px] font-semibold tabular-nums', heading(isDark))}>{slotLabel(slot)}</span>
                <Pill isDark={isDark}>{fmtDuration(to - from)}</Pill>
                {overnight && (
                  <Pill isDark={isDark} tone="violet">
                    <Moon size={10} /> {t('slotBooking.todayTab.overnight')}
                  </Pill>
                )}
              </div>
              <div className={cn('text-xs mt-1 flex flex-wrap items-center gap-x-2 gap-y-1', muted(isDark))}>
                <span className={cn('font-medium', isDark ? 'text-gray-200' : 'text-gray-700')}>{slot.groupName}</span>
                {slot.clientName && <span>· {slot.clientName}</span>}
                {slot.systemName && <span>· {slot.systemName}</span>}
                <span title={t('slotBooking.todayTab.siteTime')}>· {slot.timezone}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {slot.weather && <WeatherBadge weather={slot.weather} isDark={isDark} />}
              <StatePill isDark={isDark} state={state} />
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-3">
            <div className={cn('flex-1 h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/[0.08]' : 'bg-black/[0.06]')}>
              <div className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', phase === 'ended' && !alert ? 'bg-gray-400' : c.bar)} style={{ width: `${pct}%` }} />
            </div>
            <span className={cn('text-[11px] font-medium tabular-nums inline-flex items-center gap-1 min-w-[110px] justify-end', live ? c.text : muted(isDark))}>
              <Clock size={11} /> {timeText}
            </span>
          </div>

          {/* Missions */}
          {slot.missions.length === 0 ? (
            <div className={cn('rounded-lg border border-dashed p-3 flex flex-wrap items-center justify-between gap-2', isDark ? 'border-red-500/40 bg-red-500/[0.06]' : 'border-red-300 bg-red-50/70')}>
              <div className="flex items-center gap-2 text-xs">
                <CircleAlert size={14} className="text-red-500 shrink-0" />
                <span className={isDark ? 'text-red-200' : 'text-red-800'}>{t('slotBooking.todayTab.noMissionHint')}</span>
              </div>
              <Btn isDark={isDark} variant="primary" onClick={onLink}>
                <Link2 size={12} /> {t('slotBooking.todayTab.linkMissions')}
              </Btn>
            </div>
          ) : (
            <div className="space-y-1.5">
              {slot.missions.map((m) => (
                <MissionLine
                  key={m.id}
                  isDark={isDark}
                  mission={m}
                  timezone={slot.timezone}
                  now={now}
                  busy={unlinking === `${slot.slotId}:${m.id}`}
                  onUnlink={() => onUnlink(m.id)}
                />
              ))}
              {alert && <p className="text-[11px] text-red-500 pt-0.5">{t(`slotBooking.todayTab.stateHint.${state}`)}</p>}
              <button
                type="button"
                onClick={onLink}
                className={cn('cursor-pointer mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-violet-500 hover:text-violet-400')}
              >
                <Plus size={12} /> {t('slotBooking.todayTab.addMission')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STATE_ICON: Record<TodaySlotState, ComponentType<{ size?: number; className?: string }>> = {
  no_mission: CircleAlert,
  no_progress: CircleAlert,
  incomplete: AlertTriangle,
  in_progress: Plane,
  partial: CircleDashed,
  waiting: Clock,
  completed: CheckCircle2,
};

function StatePill({ isDark, state }: { isDark: boolean; state: TodaySlotState }) {
  const { t } = useSlotI18n();
  const tone = STATE_TONE[state];
  const Icon = STATE_ICON[state];
  return (
    <Pill isDark={isDark} tone={tone}>
      <Icon size={11} className={state === 'in_progress' ? 'animate-pulse' : undefined} />
      {t(`slotBooking.todayTab.state.${state}`)}
    </Pill>
  );
}

const PROGRESS_ICON: Record<MissionProgress, ComponentType<{ size?: number; className?: string }>> = {
  planned: Clock,
  in_progress: Plane,
  completed: CheckCircle2,
  aborted: XCircle,
};

function MissionLine({
  isDark,
  mission: m,
  timezone,
  now,
  busy,
  onUnlink,
}: {
  isDark: boolean;
  mission: TodayMission;
  timezone: string;
  now: number;
  busy: boolean;
  onUnlink: () => void;
}) {
  const { t } = useSlotI18n();
  const siteTime = useSiteTime();
  const tone = PROGRESS_TONE[m.progress];
  const c = toneCls(tone, isDark);
  const Icon = PROGRESS_ICON[m.progress];
  const info =
    m.progress === 'in_progress' && m.actualStart
      ? t('slotBooking.todayTab.inFlight', { time: fmtCountdown(now - Date.parse(m.actualStart)), at: siteTime(m.actualStart, timezone) })
      : m.progress === 'completed' && m.actualStart && m.actualEnd
        ? t('slotBooking.todayTab.flew', { from: siteTime(m.actualStart, timezone), to: siteTime(m.actualEnd, timezone) })
        : m.scheduledStart
          ? t('slotBooking.todayTab.plannedAt', { time: siteTime(m.scheduledStart, timezone) })
          : t('slotBooking.todayTab.noTime');

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2',
        m.progress === 'in_progress'
          ? isDark ? 'border-sky-500/30 bg-sky-500/[0.08]' : 'border-sky-200 bg-sky-50/80'
          : isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-100 bg-white/70',
      )}
    >
      <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', c.fill, c.text)}>
        <Icon size={14} className={m.progress === 'in_progress' ? 'animate-pulse' : undefined} />
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn('text-xs font-semibold truncate', heading(isDark))}>
          {m.code && <span className="font-mono">{m.code}</span>}
          {m.code && m.name && <span className={muted(isDark)}> · </span>}
          {m.name ?? (!m.code && `#${m.id}`)}
        </div>
        <div className={cn('text-[11px] truncate', muted(isDark))}>
          <span className={m.progress === 'in_progress' ? c.text : undefined}>{info}</span>
          {m.droneName && ` · ${m.droneName}`}
          {m.planCode && ` · ${t('slotBooking.todayTab.fields.plan')} ${m.planCode}`}
        </div>
      </div>
      <Pill isDark={isDark} tone={tone}>{t(`slotBooking.todayTab.progress.${m.progress}`)}</Pill>
      <button
        type="button"
        onClick={onUnlink}
        disabled={busy}
        title={t('slotBooking.todayTab.unlink')}
        aria-label={t('slotBooking.todayTab.unlink')}
        className={cn(
          'cursor-pointer w-6 h-6 rounded-md flex items-center justify-center opacity-60 hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-100',
          isDark ? 'hover:bg-white/[0.08] text-gray-400' : 'hover:bg-gray-100 text-gray-500',
        )}
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <X size={13} />}
      </button>
    </div>
  );
}

function Legend({ isDark }: { isDark: boolean }) {
  const { t } = useSlotI18n();
  const items: TodaySlotState[] = ['waiting', 'in_progress', 'partial', 'completed', 'no_mission', 'no_progress'];
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]', muted(isDark))}>
      {items.map((st) => (
        <span key={st} className="inline-flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full', toneCls(STATE_TONE[st], isDark).dot)} />
          {t(`slotBooking.todayTab.state.${st}`)}
        </span>
      ))}
      <span>· {t('slotBooking.todayTab.legendNote')}</span>
    </div>
  );
}
