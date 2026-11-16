'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { CalendarAlert, CalendarDay, CalendarSlot, SlotWeather, WeekCalendar } from '@/config/types/slot-booking';
import { addDaysIso, slotLabel, todayIso, weekdayOf } from '@/lib/slot-booking-utils';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { AlertTriangle, Building2, Check, ChevronDown, CalendarDays, Layers, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Clock, Cloud, CloudLightning, Mail, Search, Sun, UserRound, Users, Wind } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AssignPicker } from './AssignPicker';
import { Avatar } from './Avatar';
import { apiMsg, Btn, card, FlightChip, FlightWarning, dialogSurface, EmptyBlock, ErrorBlock, heading, inputCls, LoadingBlock, muted, Pill, useSlotI18n, WeatherBadge, WeatherDot } from './ui';

const BASE = '/api/operation/slot-booking';
const GROUP_TONES = ['bg-violet-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500'] as const;
const LEVEL_RANK = { calm: 0, moderate: 1, tough: 2 } as const;

/** The worst forecast of a day's slots, for the day header. */
function worstWeather(slots: CalendarSlot[]): SlotWeather | null {
  return slots.reduce<SlotWeather | null>((worst, s) => (s.weather && (!worst || LEVEL_RANK[s.weather.level] > LEVEL_RANK[worst.level]) ? s.weather : worst), null);
}

/** Compact forecast chip for a slot card: level icon, temperature and wind. */
function WeatherChip({ weather, isDark }: { weather: SlotWeather; isDark: boolean }) {
  const Icon = weather.level === 'calm' ? Sun : weather.level === 'moderate' ? Cloud : CloudLightning;
  const tone = weather.level === 'calm' ? 'text-emerald-500' : weather.level === 'moderate' ? 'text-amber-500' : 'text-red-500';
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] tabular-nums shrink-0', isDark ? 'text-gray-400' : 'text-gray-500')}>
      <Icon size={12} className={tone} />
      {weather.tempC != null && <span>{weather.tempC}°</span>}
      <span>· {weather.avgWindMs} m/s</span>
    </span>
  );
}

/** Compact dropdown (popover list) used for the client and slot group filters. */
function FilterSelect({
  isDark,
  icon,
  label,
  value,
  options,
  onChange,
}: {
  isDark: boolean;
  icon: React.ReactNode;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'cursor-pointer h-9 min-w-44 max-w-64 rounded-lg border px-3 text-xs font-medium inline-flex items-center justify-between gap-2 transition-colors',
            value ? 'border-violet-500 text-violet-600 bg-violet-500/10' : isDark ? 'border-white/[0.1] text-gray-200 hover:bg-white/[0.05]' : 'border-gray-300 text-gray-700 hover:bg-gray-50',
          )}
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            {icon}
            <span className="truncate">{current && value ? current.label : label}</span>
          </span>
          <ChevronDown size={13} className={cn('shrink-0 opacity-60 transition-transform', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn('w-64 p-1.5', isDark && 'bg-[#0f1320] border-white/[0.1] text-white')}>
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {[{ value: '', label }, ...options].map((o) => (
            <button
              key={o.value || 'all'}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn(
                'cursor-pointer w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs text-left transition-colors',
                o.value === value ? 'bg-violet-600 text-white' : isDark ? 'text-gray-200 hover:bg-white/[0.08]' : 'text-gray-700 hover:bg-violet-50',
              )}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check size={12} className="shrink-0" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Fact({ isDark, label, children }: { isDark: boolean; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={cn('text-[10px] font-semibold uppercase tracking-wider', muted(isDark))}>{label}</div>
      <div className={cn('text-[13px] mt-0.5', heading(isDark))}>{children}</div>
    </div>
  );
}

function Section({ isDark, title, children }: { isDark: boolean; title: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-lg border p-3 space-y-2', isDark ? 'border-white/[0.08]' : 'border-gray-200')}>
      <h4 className={cn('text-xs font-semibold', heading(isDark))}>{title}</h4>
      {children}
    </div>
  );
}

 
export function CalendarView({ isDark }: { isDark: boolean }) {
  const s = useSlotI18n();
  const { t } = useTranslation();
  const [start, setStart] = useState(todayIso());
  const [data, setData] = useState<WeekCalendar | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [dayDate, setDayDate] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [clientFilter, setClientFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE}/calendar`, { params: { start } });
      setData(res.data.data);
      setError(null);
    } catch (e) {
      setError(apiMsg(e, t('slotBooking.calendar.errors.load')));
    }
  }, [start, t]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const all = useMemo(() => data?.days.flatMap((d) => d.slots) ?? [], [data]);
  const NO_CLIENT = '__none__';
  const clientOptions = useMemo(() => {
    const names = [...new Set(all.map((x) => x.clientName).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
    return [...names.map((n) => ({ value: n, label: n })), ...(all.some((x) => !x.clientName) ? [{ value: NO_CLIENT, label: t('slotBooking.create.noClient') }] : [])];
  }, [all, t]);
  const groupOptions = useMemo(
    () => [...new Map(all.map((x) => [x.groupId, x.groupName])).entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => ({ value: String(id), label: name })),
    [all],
  );
  // Client and slot group filters scope the whole view (tiles, day counts, cards, collisions).
  const view = useMemo(() => {
    if (!data) return null;
    const keep = (x: CalendarSlot) =>
      (!clientFilter || (clientFilter === NO_CLIENT ? !x.clientName : x.clientName === clientFilter)) && (!groupFilter || String(x.groupId) === groupFilter);
    const days = data.days.map((d) => ({ ...d, slots: d.slots.filter(keep) }));
    const flat = days.flatMap((d) => d.slots);
    const assigned = flat.filter((x) => x.pilot).length;
    return { days, flat, total: flat.length, assigned, unassigned: flat.length - assigned };
  }, [data, clientFilter, groupFilter]);

  // One entry per pilot and pair of overlapping slots, with the worst severity.
  const collisions = useMemo(() => {
    const seen = new Map<string, { alert: CalendarAlert; slot: CalendarSlot }>();
    for (const x of view?.flat ?? []) {
      for (const a of x.alerts) {
        const key = `${a.pilotId}:${Math.min(x.slotId, a.other.slotId)}-${Math.max(x.slotId, a.other.slotId)}`;
        const prev = seen.get(key);
        if (!prev || (a.severity === 'conflict' && prev.alert.severity !== 'conflict')) seen.set(key, { alert: a, slot: x });
      }
    }
    return [...seen.values()].sort((a, b) => (a.alert.severity === b.alert.severity ? a.slot.date.localeCompare(b.slot.date) : a.alert.severity === 'conflict' ? -1 : 1));
  }, [view]);
  const conflicts = collisions.filter((c) => c.alert.severity === 'conflict').length;
  const [showAllCollisions, setShowAllCollisions] = useState(false);
  const slot = all.find((x) => x.slotId === slotId) ?? null;
  const day = data?.days.find((d) => d.date === dayDate) ?? null;
  const today = todayIso();

  const q = query.trim().toLowerCase();
  const matches = (x: CalendarSlot) => {
    if (status === 'unassigned' && x.pilot) return false;
    if (status === 'assigned' && !x.pilot) return false;
    if (!q) return true;
    return [x.groupName, x.clientName, x.pilot?.name, ...x.pending.map((p) => p.name)].some((v) => v?.toLowerCase().includes(q));
  };
  const filtering = status !== 'all' || q !== '';
  const requests = (view?.flat ?? []).reduce((n, x) => n + x.pending.length, 0);
  const tough = (view?.flat ?? []).filter((x) => x.weather?.level === 'tough').length;

  const renderSlotCard = (x: CalendarSlot) => {
    const open = !x.pilot;
    return (
      <button
        key={x.slotId}
        type="button"
        onClick={() => setSlotId(x.slotId)}
        className={cn(
          'group cursor-pointer w-full text-left rounded-lg border overflow-hidden flex transition-all hover:shadow-md hover:-translate-y-px',
          open ? (isDark ? 'bg-red-500/[0.08] border-red-500/25' : 'bg-red-50/70 border-red-200') : isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-gray-200',
          x.alerts.some((a) => a.severity === 'conflict') ? 'ring-2 ring-red-500/70' : x.alerts.length > 0 && 'ring-1 ring-amber-500/70',
        )}
      >
        <span className={cn('w-1 shrink-0', GROUP_TONES[x.groupId % GROUP_TONES.length])} />
        <span className="flex-1 min-w-0 p-2 space-y-1.5">
          <span className="flex items-center justify-between gap-1">
            <span className={cn('inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums', heading(isDark))}>
              <Clock size={11} className={muted(isDark)} /> {slotLabel(x)}
            </span>
            {x.alerts.length > 0 && (
              <span
                className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-semibold', x.alerts.some((a) => a.severity === 'conflict') ? 'bg-red-500/15 text-red-600' : 'bg-amber-500/15 text-amber-600')}
                title={t('slotBooking.calendar.collisionTitle')}
              >
                <AlertTriangle size={10} /> {x.alerts.length}
              </span>
            )}
            {x.pending.length > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 text-amber-600 px-1.5 py-px text-[10px] font-semibold" title={t('slotBooking.dayPreview.requests', { count: x.pending.length })}>
                <Users size={10} /> {x.pending.length}
              </span>
            )}
          </span>
          <span className="flex items-center justify-between gap-1.5">
            <span className={cn('min-w-0 text-[11px] font-medium truncate', isDark ? 'text-gray-200' : 'text-gray-700')}>{x.groupName}</span>
            {x.weather && <WeatherChip weather={x.weather} isDark={isDark} />}
          </span>
          {x.clientName && <span className={cn('block text-[10px] truncate -mt-1', muted(isDark))}>{x.clientName}</span>}
          {x.pilot ? (
            <span className="block space-y-1">
              <span className="flex items-center gap-1.5">
                <Avatar person={x.pilot} size={18} />
                <span className={cn('text-[11px] font-medium truncate', heading(isDark))}>{x.pilot.name}</span>
              </span>
              <FlightChip flight={x.pilot.flight} isDark={isDark} />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 text-red-600 px-2 py-0.5 text-[10px] font-semibold">
              <CircleAlert size={10} /> {t('slotBooking.calendar.needsPilot')}
            </span>
          )}
        </span>
      </button>
    );
  };

  const renderDay = (d: CalendarDay) => {
    const worst = worstWeather(d.slots);
    const assigned = d.slots.filter((x) => x.pilot).length;
    const shown = d.slots.filter(matches);
    const isToday = d.date === today;
    const weekend = weekdayOf(d.date) === 0 || weekdayOf(d.date) === 6;
    const full = d.slots.length > 0 && assigned === d.slots.length;
    return (
      <div
        key={d.date}
        className={cn(
          'rounded-xl border flex flex-col min-w-0 overflow-hidden',
          card(isDark),
          weekend && (isDark ? 'bg-white/[0.015]' : 'bg-gray-50/60'),
          isToday && 'ring-2 ring-violet-500/60',
        )}
      >
        <button
          type="button"
          onClick={() => setDayDate(d.date)}
          className={cn('cursor-pointer text-left px-3 py-2.5 border-b transition-colors', isDark ? 'border-white/[0.06] hover:bg-white/[0.04]' : 'border-gray-100 hover:bg-gray-50')}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="flex items-baseline gap-2">
              <span className={cn('text-xl font-semibold tabular-nums leading-none', isToday ? 'text-violet-500' : heading(isDark))}>{d.date.slice(8)}</span>
              <span className={cn('text-[11px] uppercase tracking-wider font-medium', muted(isDark))}>{s.weekdayShort(weekdayOf(d.date))}</span>
            </span>
            <span className="flex items-center gap-1.5">
              {isToday && <span className="rounded-full bg-violet-600 text-white text-[9px] font-semibold uppercase px-1.5 py-0.5">{t('slotBooking.today')}</span>}
              {worst && <WeatherDot weather={worst} />}
            </span>
          </span>
          {d.slots.length > 0 ? (
            <span className="block mt-2">
              <span className={cn('flex justify-between text-[10px]', full ? 'text-emerald-500' : muted(isDark))}>
                <span>{t('slotBooking.calendar.dayCount', { assigned, total: d.slots.length })}</span>
              </span>
              <span className={cn('block mt-1 h-1 rounded-full overflow-hidden', isDark ? 'bg-white/[0.08]' : 'bg-black/[0.07]')}>
                <span className={cn('block h-full rounded-full', full ? 'bg-emerald-500' : 'bg-violet-500')} style={{ width: `${(assigned / d.slots.length) * 100}%` }} />
              </span>
            </span>
          ) : (
            <span className={cn('block mt-2 text-[10px]', muted(isDark))}>{t('slotBooking.calendar.noSlots')}</span>
          )}
        </button>
        <div className="p-2 space-y-1.5 flex-1 max-h-[65vh] overflow-y-auto">
          {shown.map(renderSlotCard)}
          {d.slots.length === 0 && <div className={cn('rounded-lg border border-dashed py-6 text-center text-[11px]', isDark ? 'border-white/[0.08]' : 'border-gray-200', muted(isDark))}>—</div>}
          {d.slots.length > 0 && shown.length === 0 && <div className={cn('py-4 text-center text-[11px]', muted(isDark))}>{t('slotBooking.calendar.noMatch')}</div>}
        </div>
      </div>
    );
  };

  const kpi = (icon: React.ReactNode, label: string, value: number | string, tone: string) => (
    <div className={cn('rounded-xl border p-3 flex items-center gap-3', card(isDark))}>
      <span className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', tone)}>{icon}</span>
      <span className="min-w-0">
        <span className={cn('block text-lg font-semibold leading-tight tabular-nums', heading(isDark))}>{value}</span>
        <span className={cn('block text-[11px] truncate', muted(isDark))}>{label}</span>
      </span>
    </div>
  );

  const seg = (on: boolean) =>
    cn(
      'cursor-pointer h-8 px-3 text-xs font-medium transition-colors',
      on ? 'bg-violet-600 text-white' : isDark ? 'text-gray-300 hover:bg-white/[0.06]' : 'text-gray-600 hover:bg-gray-100',
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn('inline-flex items-center rounded-lg border overflow-hidden', isDark ? 'border-white/[0.1]' : 'border-gray-200')}>
            <button type="button" className={cn(seg(false), 'px-2')} onClick={() => setStart((d) => addDaysIso(d, -7))} aria-label="-7"><ChevronLeft size={15} /></button>
            <button type="button" className={cn(seg(false), 'border-x', isDark ? 'border-white/[0.1]' : 'border-gray-200')} onClick={() => setStart(todayIso())} disabled={start === today}>
              {t('slotBooking.today')}
            </button>
            <button type="button" className={cn(seg(false), 'px-2')} onClick={() => setStart((d) => addDaysIso(d, 7))} aria-label="+7"><ChevronRight size={15} /></button>
          </div>
          <input type="date" className={cn(inputCls(isDark), 'w-40')} value={start} onChange={(e) => e.target.value && setStart(e.target.value)} aria-label={t('slotBooking.dayPreview.date')} />
          <span className={cn('text-sm font-semibold', heading(isDark))}>{s.date(start)} → {s.date(addDaysIso(start, 6))}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className={cn('absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none', muted(isDark))} />
            <input className={cn(inputCls(isDark), 'pl-8 w-52')} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('slotBooking.calendar.search')} />
          </div>
          <div className={cn('inline-flex rounded-lg border overflow-hidden', isDark ? 'border-white/[0.1]' : 'border-gray-200')}>
            {(['all', 'unassigned', 'assigned'] as const).map((k) => (
              <button key={k} type="button" className={seg(status === k)} onClick={() => setStatus(k)}>
                {k === 'all' ? t('slotBooking.calendar.filterAll') : k === 'unassigned' ? t('slotBooking.dayPreview.unassigned') : t('slotBooking.calendar.legendAssigned')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect isDark={isDark} icon={<Building2 size={13} />} label={t('slotBooking.calendar.allClients')} value={clientFilter} options={clientOptions} onChange={setClientFilter} />
          <FilterSelect isDark={isDark} icon={<Layers size={13} />} label={t('slotBooking.calendar.allGroups')} value={groupFilter} options={groupOptions} onChange={setGroupFilter} />
          {(clientFilter || groupFilter) && (
            <button type="button" className="cursor-pointer text-xs text-violet-500 hover:underline" onClick={() => { setClientFilter(''); setGroupFilter(''); }}>
              {t('slotBooking.calendar.clearFilters')}
            </button>
          )}
        </div>
      )}

      {error ? (
        <ErrorBlock isDark={isDark} message={error} onRetry={load} />
      ) : !data ? (
        <LoadingBlock isDark={isDark} rows={1} />
      ) : data.total === 0 ? (
        <EmptyBlock isDark={isDark}>
          <CalendarDays size={22} className="mx-auto mb-2" />
          {t('slotBooking.calendar.empty')}
        </EmptyBlock>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {kpi(<CalendarDays size={17} />, t('slotBooking.calendar.kpiSlots'), view?.total ?? 0, 'bg-violet-500/15 text-violet-500')}
            {kpi(<CircleCheck size={17} />, t('slotBooking.calendar.legendAssigned'), view?.assigned ?? 0, 'bg-emerald-500/15 text-emerald-500')}
            {kpi(<CircleAlert size={17} />, t('slotBooking.dayPreview.unassigned'), view?.unassigned ?? 0, view?.unassigned ? 'bg-red-500/15 text-red-500' : 'bg-gray-500/15 text-gray-500')}
            {kpi(<AlertTriangle size={17} />, t('slotBooking.calendar.kpiCollisions'), collisions.length, conflicts ? 'bg-red-500/15 text-red-500' : collisions.length ? 'bg-amber-500/15 text-amber-500' : 'bg-gray-500/15 text-gray-500')}
            {kpi(<Users size={17} />, t('slotBooking.calendar.kpiRequests'), requests, 'bg-amber-500/15 text-amber-500')}
            {kpi(<Wind size={17} />, t('slotBooking.calendar.kpiTough'), tough, tough ? 'bg-red-500/15 text-red-500' : 'bg-sky-500/15 text-sky-500')}
          </div>

          {collisions.length > 0 && (
            <div className={cn('rounded-xl border p-3 space-y-2', conflicts ? (isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200') : isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200')}>
              <div className="flex items-center justify-between gap-2">
                <div className={cn('text-sm font-semibold inline-flex items-center gap-2', conflicts ? 'text-red-600' : 'text-amber-600')}>
                  <AlertTriangle size={15} /> {t('slotBooking.calendar.collisionsTitle', { count: collisions.length })}
                </div>
                {collisions.length > 3 && (
                  <button type="button" className="cursor-pointer text-xs text-violet-500 hover:underline" onClick={() => setShowAllCollisions((v) => !v)}>
                    {showAllCollisions ? t('slotBooking.calendar.showLess') : t('slotBooking.calendar.showAll', { count: collisions.length })}
                  </button>
                )}
              </div>
              <ul className={cn('space-y-1', showAllCollisions && 'max-h-60 overflow-y-auto pr-1')}>
                {(showAllCollisions ? collisions : collisions.slice(0, 3)).map(({ alert, slot: x }) => (
                  <li key={`${alert.pilotId}-${x.slotId}-${alert.other.slotId}`}>
                    <button
                      type="button"
                      onClick={() => setSlotId(x.slotId)}
                      className={cn('cursor-pointer w-full text-left rounded-lg px-2.5 py-1.5 text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5 transition-colors', isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-white/70')}
                    >
                      <Pill isDark={isDark} tone={alert.severity === 'conflict' ? 'red' : 'amber'}>
                        {t(alert.severity === 'conflict' ? 'slotBooking.calendar.conflictBadge' : 'slotBooking.calendar.riskBadge')}
                      </Pill>
                      <span className={cn('font-semibold', heading(isDark))}>{alert.pilotName}</span>
                      <span className={muted(isDark)}>
                        {s.date(x.date)} {slotLabel(x)} · {x.groupName}{x.clientName ? ` (${x.clientName})` : ''}
                        {'  ↔  '}
                        {s.date(alert.other.date)} {slotLabel(alert.other)} · {alert.other.groupName}{alert.other.clientName ? ` (${alert.other.clientName})` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7 gap-3 items-start">{(view?.days ?? []).map(renderDay)}</div>
          {filtering && <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.calendar.filtered')}</p>}

          {data.weatherNote === 'no_location' && <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.weather.noLocation')}</p>}
          {data.weatherNote === 'unavailable' && <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.weather.unavailable')}</p>}
          {data.weatherNote === 'out_of_range' && <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.weather.outOfRange')}</p>}
          {data.weatherFetchedAt && <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.weather.updatedAt', { when: s.dateTime(data.weatherFetchedAt) })}</p>}
        </>
      )}

      {/* Slot detail */}
      <Dialog open={!!slot} onOpenChange={(o) => !o && setSlotId(null)}>
        <DialogContent className={cn('sm:max-w-xl max-h-[92vh] overflow-y-auto', dialogSurface(isDark))}>
          {slot && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock size={16} className="text-violet-500" /> {slotLabel(slot)} · {s.date(slot.date)}
                </DialogTitle>
                <DialogDescription>{slot.groupName}{slot.clientName ? ` · ${slot.clientName}` : ''}</DialogDescription>
              </DialogHeader>

              <Section isDark={isDark} title={t('slotBooking.calendar.pilotSection')}>
                {slot.pilot ? (
                  <div className="flex items-center gap-3">
                    <Avatar person={slot.pilot} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-sm font-semibold truncate', heading(isDark))}>{slot.pilot.name}</div>
                      <div className={cn('text-[11px] flex flex-wrap items-center gap-x-3 gap-y-0.5', muted(isDark))}>
                        {slot.pilot.role && <span className="inline-flex items-center gap-1"><UserRound size={11} /> {slot.pilot.role}</span>}
                        {slot.pilot.email && <span className="inline-flex items-center gap-1"><Mail size={11} /> {slot.pilot.email}</span>}
                      </div>
                      <div className="mt-1"><FlightChip flight={slot.pilot.flight} isDark={isDark} /></div>
                      {slot.pilot.approvedAt && <div className={cn('text-[11px] mt-0.5', muted(isDark))}>{t('slotBooking.calendar.approvedAt', { when: s.dateTime(slot.pilot.approvedAt) })}</div>}
                    </div>
                    {slot.pilot.assignedByOpm && <Pill isDark={isDark} tone="violet">{t('slotBooking.slotDialog.assignedByOpm')}</Pill>}
                  </div>
                ) : (
                  <Pill isDark={isDark} tone="red">{t('slotBooking.dayPreview.unassigned')}</Pill>
                )}
              </Section>

              {slot.pilot && <FlightWarning flight={slot.pilot.flight} name={slot.pilot.name} isDark={isDark} />}

              {slot.alerts.length > 0 && (
                <Section isDark={isDark} title={t('slotBooking.calendar.collisionTitle')}>
                  <ul className="space-y-1.5">
                    {slot.alerts.map((a) => (
                      <li key={`${a.pilotId}-${a.other.slotId}`} className="flex items-start gap-2 text-xs">
                        <AlertTriangle size={13} className={cn('mt-0.5 shrink-0', a.severity === 'conflict' ? 'text-red-500' : 'text-amber-500')} />
                        <span className={heading(isDark)}>
                          {t(a.severity === 'conflict' ? 'slotBooking.calendar.alertConflict' : 'slotBooking.calendar.alertRisk', {
                            pilot: a.pilotName,
                            when: `${s.date(a.other.date)} ${slotLabel(a.other)}`,
                            where: `${a.other.groupName}${a.other.clientName ? ` (${a.other.clientName})` : ''}`,
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section isDark={isDark} title={t('slotBooking.calendar.waiting', { count: slot.pending.length })}>
                {slot.pending.length === 0 ? (
                  <p className={cn('text-xs', muted(isDark))}>{t('slotBooking.calendar.noWaiting')}</p>
                ) : (
                  <ul className="space-y-1">
                    {slot.pending.map((p) => (
                      <li key={p.userId} className="flex items-center justify-between gap-2 text-xs">
                        <span className={cn('inline-flex items-center gap-1.5 font-medium', heading(isDark))}><Users size={12} /> {p.name} <FlightChip flight={p.flight} isDark={isDark} /></span>
                        <span className={muted(isDark)}>{t('slotBooking.slotDialog.requestedAt', { when: s.dateTime(p.requestedAt) })}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section isDark={isDark} title={t('slotBooking.calendar.weatherSection')}>
                {slot.weather ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Fact isDark={isDark} label={t('slotBooking.dayPreview.weather')}><WeatherBadge weather={slot.weather} isDark={isDark} /></Fact>
                    <Fact isDark={isDark} label={t('slotBooking.calendar.avgWind')}>{slot.weather.avgWindMs} m/s</Fact>
                    <Fact isDark={isDark} label={t('slotBooking.calendar.gusts')}>{slot.weather.maxGustMs} m/s</Fact>
                    <Fact isDark={isDark} label={t('slotBooking.calendar.rain')}>{slot.weather.rainMm} mm</Fact>
                    {slot.weather.tempC != null && <Fact isDark={isDark} label={t('slotBooking.calendar.temp')}>{slot.weather.tempC} °C</Fact>}
                    {slot.weather.limiting && (
                      <Fact isDark={isDark} label={t('slotBooking.calendar.limiting')}>
                        <span className="inline-flex items-center gap-1"><Wind size={12} /> {slot.weather.limiting}</span>
                      </Fact>
                    )}
                  </div>
                ) : (
                  <p className={cn('text-xs', muted(isDark))}>{t('slotBooking.calendar.noWeather')}</p>
                )}
              </Section>

              <Section isDark={isDark} title={t('slotBooking.calendar.groupSection')}>
                {slot.groupDescription && <p className={cn('text-xs', muted(isDark))}>{slot.groupDescription}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <Fact isDark={isDark} label={t('slotBooking.dayPreview.group')}>{slot.groupName}</Fact>
                  <Fact isDark={isDark} label={t('slotBooking.dayPreview.client')}>{slot.clientName ?? '—'}</Fact>
                  <Fact isDark={isDark} label={t('slotBooking.create.slotHours')}>{s.mode(slot.mode)}</Fact>
                  <Fact isDark={isDark} label={t('slotBooking.create.blocking')}>{slot.blocked ? t('slotBooking.pic.singlePilot') : t('slotBooking.pic.multiPilot')}</Fact>
                  <Fact isDark={isDark} label={t('slotBooking.create.approvalDays')}>{s.daysLabel(slot.approvalDays)}</Fact>
                </div>
              </Section>

              {slot.date >= today && !(slot.pilot && !slot.pilot.assignedByOpm) && (
                <Section isDark={isDark} title={t('slotBooking.assign.title')}>
                  <AssignPicker slotId={slot.slotId} isDark={isDark} onChanged={load} />
                </Section>
              )}

              <DialogFooter>
                <Btn isDark={isDark} onClick={() => setSlotId(null)}>{t('slotBooking.common.close')}</Btn>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Day detail */}
      <Dialog open={!!day} onOpenChange={(o) => !o && setDayDate(null)}>
        <DialogContent className={cn('sm:max-w-lg max-h-[92vh] overflow-y-auto', dialogSurface(isDark))}>
          {day && (
            <>
              <DialogHeader>
                <DialogTitle>{s.date(day.date)}</DialogTitle>
                <DialogDescription>
                  {t('slotBooking.dayPreview.summary', { assigned: day.slots.filter((x) => x.pilot).length, total: day.slots.length })}
                </DialogDescription>
              </DialogHeader>
              {day.slots.length === 0 ? (
                <p className={cn('text-xs', muted(isDark))}>{t('slotBooking.calendar.noSlots')}</p>
              ) : (
                <ul className="space-y-1.5">
                  {day.slots.map((x) => (
                    <li key={x.slotId}>
                      <button
                        type="button"
                        onClick={() => { setDayDate(null); setSlotId(x.slotId); }}
                        className={cn('cursor-pointer w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors', isDark ? 'border-white/[0.08] hover:bg-white/[0.05]' : 'border-gray-200 hover:bg-gray-50')}
                      >
                        <span className={cn('text-xs font-semibold w-24 shrink-0', heading(isDark))}>{slotLabel(x)}</span>
                        <span className={cn('flex-1 min-w-0 text-xs truncate', isDark ? 'text-gray-300' : 'text-gray-600')}>{x.groupName}</span>
                        {x.pilot ? <Pill isDark={isDark} tone="green">{x.pilot.name}</Pill> : <Pill isDark={isDark} tone="red">{t('slotBooking.dayPreview.unassigned')}</Pill>}
                        {x.weather && <WeatherDot weather={x.weather} />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <DialogFooter>
                <Btn isDark={isDark} onClick={() => setDayDate(null)}>{t('slotBooking.common.close')}</Btn>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
