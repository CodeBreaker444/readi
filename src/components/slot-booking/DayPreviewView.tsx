'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DayPreview, DayPreviewRow } from '@/config/types/slot-booking';
import { addDaysIso, slotLabel, todayIso } from '@/lib/slot-booking-utils';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert, CircleCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AssignPicker } from './AssignPicker';
import { apiMsg, Btn, card, dialogSurface, EmptyBlock, ErrorBlock, heading, inputCls, LoadingBlock, muted, Pill, useSlotI18n, WeatherBadge } from './ui';

const BASE = '/api/operation/slot-booking';

/**
 * Operations day sheet: every slot of one day with its client and assigned pilot.
 * Slots without a pilot are red, and can be assigned from here.
 */
export function DayPreviewView({ isDark }: { isDark: boolean }) {
  const s = useSlotI18n();
  const { t } = useTranslation();
  const [date, setDate] = useState(todayIso());
  const [data, setData] = useState<DayPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignRow, setAssignRow] = useState<DayPreviewRow | null>(null);

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
  const past = date < todayIso();
  const th = cn('text-left text-[11px] font-semibold uppercase tracking-wider px-4 py-2.5', muted(isDark));
  const pct = data && data.total ? Math.round((data.assigned / data.total) * 100) : 0;
  const allDone = !!data && data.total > 0 && data.unassigned === 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Btn isDark={isDark} onClick={() => shift(-1)}><ChevronLeft size={14} /></Btn>
        <input
          type="date"
          className={cn(inputCls(isDark), 'w-44')}
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label={t('slotBooking.dayPreview.date')}
        />
        <Btn isDark={isDark} onClick={() => shift(1)}><ChevronRight size={14} /></Btn>
        <Btn isDark={isDark} onClick={() => setDate(todayIso())} disabled={date === todayIso()}>{t('slotBooking.today')}</Btn>
        <span className={cn('text-sm font-medium ml-2', heading(isDark))}>{s.date(date)}</span>
      </div>

      {error ? (
        <ErrorBlock isDark={isDark} message={error} onRetry={load} />
      ) : !data ? (
        <LoadingBlock isDark={isDark} rows={1} />
      ) : data.total === 0 ? (
        <EmptyBlock isDark={isDark}>
          <CalendarDays size={22} className="mx-auto mb-2" />
          {t('slotBooking.dayPreview.empty')}
        </EmptyBlock>
      ) : (
        <>
          <div
            className={cn(
              'rounded-xl border p-4 flex items-center gap-4',
              allDone
                ? isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                : isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200',
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
          </div>

          <div className={cn('rounded-xl border overflow-x-auto', card(isDark))}>
            <table className="w-full min-w-[760px]">
              <thead className={isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}>
                <tr>
                  <th className={th}>{t('slotBooking.dayPreview.slot')}</th>
                  <th className={th}>{t('slotBooking.dayPreview.client')}</th>
                  <th className={th}>{t('slotBooking.dayPreview.group')}</th>
                  <th className={th}>{t('slotBooking.dayPreview.pilot')}</th>
                  <th className={th}>{t('slotBooking.dayPreview.weather')}</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const open = r.pilotId === null;
                  return (
                    <tr
                      key={r.slotId}
                      className={cn(
                        'border-t',
                        isDark ? 'border-white/[0.05]' : 'border-gray-100',
                        open && (isDark ? 'bg-red-500/10' : 'bg-red-50'),
                      )}
                    >
                      <td className={cn('px-4 py-3 text-[13px] font-semibold', open ? 'text-red-600' : heading(isDark))}>{slotLabel(r)}</td>
                      <td className={cn('px-4 py-3 text-[13px]', isDark ? 'text-gray-200' : 'text-gray-700')}>{r.clientName ?? <span className={muted(isDark)}>—</span>}</td>
                      <td className={cn('px-4 py-3 text-[13px]', isDark ? 'text-gray-200' : 'text-gray-700')}>{r.groupName}</td>
                      <td className="px-4 py-3 text-[13px]">
                        {open ? (
                          <span className="inline-flex items-center gap-2">
                            <Pill isDark={isDark} tone="red">{t('slotBooking.dayPreview.unassigned')}</Pill>
                            {r.pending > 0 && <span className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.dayPreview.requests', { count: r.pending })}</span>}
                          </span>
                        ) : (
                          <Pill isDark={isDark} tone="green">{r.pilotName}</Pill>
                        )}
                      </td>
                      <td className="px-4 py-3">{r.weather ? <WeatherBadge weather={r.weather} isDark={isDark} /> : <span className={muted(isDark)}>—</span>}</td>
                      <td className="px-4 py-3 text-right">
                        <Btn isDark={isDark} variant={open ? 'primary' : 'ghost'} disabled={past} onClick={() => setAssignRow(r)}>
                          {open ? t('slotBooking.dayPreview.assign') : t('slotBooking.dayPreview.change')}
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.weatherNote === 'no_location' && <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.weather.noLocation')}</p>}
          {data.weatherNote === 'unavailable' && <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.weather.unavailable')}</p>}
          {data.weatherNote === 'out_of_range' && <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.weather.outOfRange')}</p>}
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
