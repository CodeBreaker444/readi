'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DayPreview, DayPreviewRow } from '@/config/types/slot-booking';
import { addDaysIso, localTodayIso, oldestLiveDate, slotLabel } from '@/lib/slot-booking-utils';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Building2, CalendarDays, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Clock, Layers, Search, TriangleAlert, UserPlus, Users, UserRoundCog } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AssignPicker } from './AssignPicker';
import { apiMsg, Btn, card, dialogSurface, EmptyBlock, ErrorBlock, heading, inputCls, muted, useSlotI18n, WeatherBadge } from './ui';
import { DayPreviewSkeleton } from './skeletons';

const BASE = '/api/operation/slot-booking';

type StatusFilter = 'all' | 'unassigned' | 'assigned';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/**
 * Operations day sheet: every slot of one day with its client and assigned pilot.
 * Slots without a pilot are red, and can be assigned from here.
 */
export function DayPreviewView({ isDark }: { isDark: boolean }) {
  const s = useSlotI18n();
  const { t } = useTranslation();
  const today = localTodayIso();
  const [date, setDate] = useState(today);
  const [data, setData] = useState<DayPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignRow, setAssignRow] = useState<DayPreviewRow | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE}/day-preview`, { params: { date } });
      setData(res.data.data);
      setError(null);
    } catch (e) {
      setError(apiMsg(e, t('slotBooking.dayPreview.errors.load')));
    }
  }, [date, t]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const shift = (days: number) => setDate((d) => addDaysIso(d, days));
  // Slot dates are site dates: only a date that is over everywhere is "past"; the server rejects the rest per slot.
  const past = date < oldestLiveDate();
  const pct = data && data.total ? Math.round((data.assigned / data.total) * 100) : 0;
  const allDone = !!data && data.total > 0 && data.unassigned === 0;
  const requests = useMemo(() => (data?.rows ?? []).reduce((n, r) => n + (r.pilotId === null ? r.pending : 0), 0), [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.rows ?? []).filter((r) => {
      if (status === 'unassigned' && r.pilotId !== null) return false;
      if (status === 'assigned' && r.pilotId === null) return false;
      if (!q) return true;
      return [r.groupName, r.clientName ?? '', r.pilotName ?? '', slotLabel(r)].some((v) => v.toLowerCase().includes(q));
    });
  }, [data, query, status]);
  const filtering = status !== 'all' || query.trim() !== '';

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
  const frame = isDark ? 'border-white/[0.1]' : 'border-gray-200';

  const renderRow = (r: DayPreviewRow) => {
    const open = r.pilotId === null;
    return (
      <div
        key={r.slotId}
        className={cn(
          'relative rounded-xl border p-3 pl-4 flex flex-col gap-2.5 transition-shadow hover:shadow-md overflow-hidden',
          card(isDark),
          open ? (isDark ? 'border-violet-500/30' : 'border-violet-200') : isDark ? 'border-emerald-500/25' : 'border-emerald-200',
        )}
      >
        <span className={cn('absolute left-0 top-0 h-full w-1', open ? 'bg-violet-600' : 'bg-emerald-500')} />

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className={cn('inline-flex items-center gap-1.5 text-base font-semibold tabular-nums', open ? 'text-violet-600' : heading(isDark))}>
              <Clock size={14} className="text-violet-500" /> {slotLabel(r)}
            </div>
            <div className={cn('mt-1 flex items-center gap-1.5 text-xs', isDark ? 'text-gray-300' : 'text-gray-600')}>
              <Layers size={12} className="shrink-0" /> <span className="truncate">{r.groupName}</span>
            </div>
            <div className={cn('mt-0.5 flex items-center gap-1.5 text-xs', muted(isDark))}>
              <Building2 size={12} className="shrink-0" /> <span className="truncate">{r.clientName ?? '—'}</span>
            </div>
          </div>
          {r.weather && <WeatherBadge weather={r.weather} isDark={isDark} />}
        </div>

        <div
          className={cn(
            'rounded-lg px-3 py-2 flex items-center gap-2.5 min-h-[44px]',
            open
              ? cn('border', isDark ? 'bg-white/[0.04] border-violet-500/30' : 'bg-white border-violet-200')
              : isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
          )}
        >
          {open ? (
            <>
              <span className="h-7 w-7 rounded-full bg-violet-500/15 text-violet-600 flex items-center justify-center shrink-0">
                <TriangleAlert size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-violet-600">{t('slotBooking.dayPreview.unassigned')}</span>
                {r.pending > 0 && (
                  <span className={cn('inline-flex items-center gap-1 text-[11px]', muted(isDark))}>
                    <Users size={11} /> {t('slotBooking.dayPreview.requests', { count: r.pending })}
                  </span>
                )}
              </span>
            </>
          ) : (
            <>
              <span className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-600 text-[11px] font-semibold flex items-center justify-center shrink-0">
                {initials(r.pilotName ?? '') || <CircleCheck size={15} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-xs font-semibold truncate', heading(isDark))}>{r.pilotName}</span>
                <span className={cn('block text-[11px]', muted(isDark))}>{t('slotBooking.calendar.legendAssigned')}</span>
              </span>
            </>
          )}
        </div>

        <Btn isDark={isDark} variant={open ? 'primary' : 'ghost'} disabled={past} onClick={() => setAssignRow(r)} className="w-full">
          {open ? <UserPlus size={13} /> : <UserRoundCog size={13} />}
          {open ? t('slotBooking.dayPreview.assign') : t('slotBooking.dayPreview.change')}
        </Btn>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn('inline-flex items-center rounded-lg border overflow-hidden', frame)}>
            <button type="button" className={cn(seg(false), 'px-2')} onClick={() => shift(-1)} aria-label="-1"><ChevronLeft size={15} /></button>
            <button type="button" className={cn(seg(false), 'border-x', frame)} onClick={() => setDate(today)} disabled={date === today}>
              {t('slotBooking.today')}
            </button>
            <button type="button" className={cn(seg(false), 'px-2')} onClick={() => shift(1)} aria-label="+1"><ChevronRight size={15} /></button>
          </div>
          <input type="date" className={cn(inputCls(isDark), 'w-40')} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label={t('slotBooking.dayPreview.date')} />
          <span className={cn('text-sm font-semibold', heading(isDark))}>{s.date(date)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className={cn('absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none', muted(isDark))} />
            <input className={cn(inputCls(isDark), 'pl-8 w-52')} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('slotBooking.calendar.search')} />
          </div>
          <div className={cn('inline-flex rounded-lg border overflow-hidden', frame)}>
            {(['all', 'unassigned', 'assigned'] as const).map((k) => (
              <button key={k} type="button" className={seg(status === k)} onClick={() => setStatus(k)}>
                {k === 'all' ? t('slotBooking.calendar.filterAll') : k === 'unassigned' ? t('slotBooking.dayPreview.unassigned') : t('slotBooking.calendar.legendAssigned')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <ErrorBlock isDark={isDark} message={error} onRetry={load} />
      ) : !data ? (
        <DayPreviewSkeleton isDark={isDark} controls={false} />
      ) : data.total === 0 ? (
        <EmptyBlock isDark={isDark}>
          <CalendarDays size={22} className="mx-auto mb-2" />
          {t('slotBooking.dayPreview.empty')}
        </EmptyBlock>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpi(<CalendarDays size={17} />, t('slotBooking.calendar.kpiSlots'), data.total, 'bg-violet-500/15 text-violet-500')}
            {kpi(<CircleCheck size={17} />, t('slotBooking.calendar.legendAssigned'), data.assigned, 'bg-emerald-500/15 text-emerald-500')}
            {kpi(<CircleAlert size={17} />, t('slotBooking.dayPreview.unassigned'), data.unassigned, data.unassigned ? 'bg-red-500/15 text-red-500' : 'bg-gray-500/15 text-gray-500')}
            {kpi(<Users size={17} />, t('slotBooking.calendar.kpiRequests'), requests, 'bg-amber-500/15 text-amber-500')}
          </div>

          <div
            className={cn(
              'rounded-xl border p-4 flex flex-wrap items-center gap-4',
              allDone
                ? isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white border-emerald-200'
                : isDark ? 'bg-white/[0.04] border-violet-500/30' : 'bg-white border-violet-200',
            )}
          >
            <span
              className={cn(
                'h-11 w-11 rounded-full flex items-center justify-center shrink-0',
                allDone ? 'bg-emerald-500/15 text-emerald-500' : isDark ? 'bg-yellow-400/15 text-yellow-300' : 'bg-yellow-100 text-yellow-500',
              )}
            >
              {allDone ? <CircleCheck size={22} /> : <TriangleAlert size={22} />}
            </span>
            <div className="flex-1 min-w-[220px]">
              <div className={cn('text-sm font-semibold', heading(isDark))}>
                {allDone ? t('slotBooking.dayPreview.allAssigned') : t('slotBooking.dayPreview.someUnassigned', { count: data.unassigned })}
              </div>
              <div className={cn('text-xs', muted(isDark))}>{t('slotBooking.dayPreview.summary', { assigned: data.assigned, total: data.total })}</div>
              <div className={cn('mt-2.5 h-2 rounded-full overflow-hidden', isDark ? 'bg-white/[0.08]' : 'bg-violet-100')}>
                <div className={cn('h-full rounded-full transition-all', allDone ? 'bg-emerald-500' : 'bg-violet-600')} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn('text-2xl font-semibold tabular-nums mr-1', allDone ? 'text-emerald-500' : 'text-violet-600')}>{pct}%</span>
              {!allDone && (
                <Btn isDark={isDark} variant="primary" onClick={() => setStatus(status === 'unassigned' ? 'all' : 'unassigned')}>
                  <TriangleAlert size={13} /> {t('slotBooking.dayPreview.unassigned')} ({data.unassigned})
                </Btn>
              )}
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyBlock isDark={isDark}>{t('slotBooking.calendar.noMatch')}</EmptyBlock>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">{rows.map(renderRow)}</div>
          )}
          {filtering && <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.calendar.filtered')}</p>}

          {data.weatherNote === 'no_location' && <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.weather.noLocation')}</p>}
          {data.weatherNote === 'unavailable' && <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.weather.unavailable')}</p>}
          {data.weatherNote === 'out_of_range' && <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.weather.outOfRange')}</p>}
          {data.weatherFetchedAt && <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.weather.updatedAt', { when: s.dateTime(data.weatherFetchedAt) })}</p>}
        </>
      )}

      <Dialog open={!!assignRow} onOpenChange={(o) => !o && setAssignRow(null)}>
        <DialogContent className={cn('sm:max-w-lg max-h-[92vh] overflow-y-auto', dialogSurface(isDark))}>
          <DialogHeader>
            <DialogTitle>{t('slotBooking.assign.title')}</DialogTitle>
            <DialogDescription>
              {assignRow && `${s.date(date)} · ${slotLabel(assignRow)} — ${assignRow.groupName}${assignRow.clientName ? ` · ${assignRow.clientName}` : ''}`}
            </DialogDescription>
          </DialogHeader>
          {assignRow && <AssignPicker slotId={assignRow.slotId} isDark={isDark} onChanged={load} />}
          <DialogFooter>
            <Btn isDark={isDark} onClick={() => setAssignRow(null)}>{t('slotBooking.common.close')}</Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
