'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CalendarDay, CalendarSlot, SlotWeather, WeekCalendar } from '@/config/types/slot-booking';
import { addDaysIso, slotLabel, todayIso } from '@/lib/slot-booking-utils';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Clock, Mail, UserRound, Users, Wind } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AssignPicker } from './AssignPicker';
import { Avatar } from './Avatar';
import { apiMsg, Btn, card, dialogSurface, EmptyBlock, ErrorBlock, heading, inputCls, LoadingBlock, muted, Pill, useSlotI18n, WeatherBadge, WeatherDot } from './ui';

const BASE = '/api/operation/slot-booking';
const LEVEL_RANK = { calm: 0, moderate: 1, tough: 2 } as const;

/** The worst forecast of a day's slots, for the day header. */
function worstWeather(slots: CalendarSlot[]): SlotWeather | null {
  return slots.reduce<SlotWeather | null>((worst, s) => (s.weather && (!worst || LEVEL_RANK[s.weather.level] > LEVEL_RANK[worst.level]) ? s.weather : worst), null);
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
  const slot = all.find((x) => x.slotId === slotId) ?? null;
  const day = data?.days.find((d) => d.date === dayDate) ?? null;
  const today = todayIso();
  const pct = data && data.total ? Math.round((data.assigned / data.total) * 100) : 0;
  const allDone = !!data && data.total > 0 && data.unassigned === 0;

  const renderSlotCard = (x: CalendarSlot) => {
    const open = !x.pilot;
    return (
      <button
        key={x.slotId}
        type="button"
        onClick={() => setSlotId(x.slotId)}
        className={cn(
          'cursor-pointer w-full text-left rounded-lg border border-l-4 p-2 space-y-1 transition-shadow hover:shadow-md',
          open
            ? cn('border-l-red-500', isDark ? 'bg-red-500/10 border-white/[0.06]' : 'bg-red-50 border-red-100')
            : cn('border-l-emerald-500', isDark ? 'bg-emerald-500/10 border-white/[0.06]' : 'bg-emerald-50 border-emerald-100'),
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <span className={cn('text-[12px] font-semibold', heading(isDark))}>{slotLabel(x)}</span>
          {x.weather && <WeatherDot weather={x.weather} />}
        </div>
        <div className={cn('text-[11px] truncate', isDark ? 'text-gray-300' : 'text-gray-600')}>{x.groupName}</div>
        {x.clientName && <div className={cn('text-[10px] truncate', muted(isDark))}>{x.clientName}</div>}
        {x.pilot ? (
          <div className="flex items-center gap-1.5 pt-0.5">
            <Avatar person={x.pilot} size={16} />
            <span className={cn('text-[11px] font-medium truncate', heading(isDark))}>{x.pilot.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[11px] font-semibold text-red-500">{t('slotBooking.dayPreview.unassigned')}</span>
            {x.pending.length > 0 && <span className={cn('text-[10px]', muted(isDark))}>{t('slotBooking.dayPreview.requests', { count: x.pending.length })}</span>}
          </div>
        )}
      </button>
    );
  };

  const renderDay = (d: CalendarDay) => {
    const worst = worstWeather(d.slots);
    const unassigned = d.slots.filter((x) => !x.pilot).length;
    return (
      <div key={d.date} className={cn('rounded-xl border flex flex-col min-w-0', card(isDark), d.date === today && 'ring-2 ring-violet-500/50')}>
        <button
          type="button"
          onClick={() => setDayDate(d.date)}
          className={cn('cursor-pointer text-left px-3 py-2 border-b rounded-t-xl', isDark ? 'border-white/[0.06] hover:bg-white/[0.04]' : 'border-gray-100 hover:bg-gray-50')}
        >
          <div className="flex items-center justify-between gap-1">
            <span className={cn('text-xs font-semibold', d.date === today ? 'text-violet-500' : heading(isDark))}>{s.date(d.date)}</span>
            {worst && <WeatherDot weather={worst} />}
          </div>
          <div className={cn('text-[10px] mt-0.5', unassigned ? 'text-red-500' : muted(isDark))}>
            {d.slots.length ? t('slotBooking.calendar.dayCount', { assigned: d.slots.length - unassigned, total: d.slots.length }) : t('slotBooking.calendar.noSlots')}
          </div>
        </button>
        <div className="p-2 space-y-1.5 max-h-[60vh] overflow-y-auto">{d.slots.map(renderSlotCard)}</div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Btn isDark={isDark} onClick={() => setStart((d) => addDaysIso(d, -7))}><ChevronLeft size={14} /></Btn>
        <input type="date" className={cn(inputCls(isDark), 'w-44')} value={start} onChange={(e) => e.target.value && setStart(e.target.value)} aria-label={t('slotBooking.dayPreview.date')} />
        <Btn isDark={isDark} onClick={() => setStart((d) => addDaysIso(d, 7))}><ChevronRight size={14} /></Btn>
        <Btn isDark={isDark} onClick={() => setStart(todayIso())} disabled={start === today}>{t('slotBooking.today')}</Btn>
        <span className={cn('text-sm font-medium ml-2', heading(isDark))}>{s.date(start)} → {s.date(addDaysIso(start, 6))}</span>
      </div>

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
          <div
            className={cn(
              'rounded-xl border p-4 flex items-center gap-4',
              allDone ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200') : isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200',
            )}
          >
            {allDone ? <CircleCheck className="text-emerald-500 shrink-0" size={22} /> : <CircleAlert className="text-red-500 shrink-0" size={22} />}
            <div className="flex-1 min-w-0">
              <div className={cn('text-sm font-semibold', heading(isDark))}>
                {allDone ? t('slotBooking.dayPreview.allAssigned') : t('slotBooking.dayPreview.someUnassigned', { count: data.unassigned })}
              </div>
              <div className={cn('text-xs', muted(isDark))}>{t('slotBooking.dayPreview.summary', { assigned: data.assigned, total: data.total })}</div>
              <div className={cn('mt-2 h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/[0.08]' : 'bg-black/[0.08]')}>
                <div className={cn('h-full rounded-full', allDone ? 'bg-emerald-500' : 'bg-red-500')} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className={cn('hidden md:flex flex-col gap-1 text-[11px]', muted(isDark))}>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> {t('slotBooking.calendar.legendAssigned')}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> {t('slotBooking.dayPreview.unassigned')}</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="grid grid-cols-7 gap-3 min-w-[1100px]">{data.days.map(renderDay)}</div>
          </div>

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
                      {slot.pilot.approvedAt && <div className={cn('text-[11px] mt-0.5', muted(isDark))}>{t('slotBooking.calendar.approvedAt', { when: s.dateTime(slot.pilot.approvedAt) })}</div>}
                    </div>
                    {slot.pilot.assignedByOpm && <Pill isDark={isDark} tone="violet">{t('slotBooking.slotDialog.assignedByOpm')}</Pill>}
                  </div>
                ) : (
                  <Pill isDark={isDark} tone="red">{t('slotBooking.dayPreview.unassigned')}</Pill>
                )}
              </Section>

              <Section isDark={isDark} title={t('slotBooking.calendar.waiting', { count: slot.pending.length })}>
                {slot.pending.length === 0 ? (
                  <p className={cn('text-xs', muted(isDark))}>{t('slotBooking.calendar.noWaiting')}</p>
                ) : (
                  <ul className="space-y-1">
                    {slot.pending.map((p) => (
                      <li key={p.userId} className="flex items-center justify-between gap-2 text-xs">
                        <span className={cn('inline-flex items-center gap-1.5 font-medium', heading(isDark))}><Users size={12} /> {p.name}</span>
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
