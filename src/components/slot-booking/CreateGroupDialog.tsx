'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { NewSlotGroupInput, RangeMode, SlotDefaults, SlotMode } from '@/config/types/slot-booking';
import { addDaysIso, groupDates, timeBlocks, todayIso } from '@/lib/slot-booking-utils';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiMsg, Btn, dialogSurface, GroupCalendar, heading, inputCls, Legend, muted, useSlotI18n, type CalSlot } from './ui';

const BASE = '/api/operation/slot-booking';
const RANGES: RangeMode[] = ['DAY', 'WEEK', 'TWO_WEEKS'];

export function CreateGroupDialog({
  open,
  onOpenChange,
  isDark,
  defaults,
  existingNames,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isDark: boolean;
  defaults: SlotDefaults;
  existingNames: string[];
  onCreated: () => Promise<void>;
}) {
  const s = useSlotI18n();
  const { t } = s;
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<SlotMode>(defaults.mode);
  const [hourStart, setHourStart] = useState(defaults.hourStart);
  const [hourEnd, setHourEnd] = useState(defaults.hourEnd);
  const [rangeMode, setRangeMode] = useState<RangeMode>(defaults.rangeMode);
  const [startDate, setStartDate] = useState(todayIso());
  const [blocked, setBlocked] = useState(defaults.blocked);
  const [approvalDays, setApprovalDays] = useState<number[]>(defaults.approvalDays);
  const [slots, setSlots] = useState<CalSlot[]>([]);
  const [conflicts, setConflicts] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  // Re-prefill from the company's Slot Settings each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName('');
    setDescription('');
    setMode(defaults.mode);
    setHourStart(defaults.hourStart);
    setHourEnd(defaults.hourEnd);
    setRangeMode(defaults.rangeMode);
    setStartDate(todayIso());
    setBlocked(defaults.blocked);
    setApprovalDays(defaults.approvalDays);
    setSlots([]);
    setConflicts(null);
  }, [open]);

  const dates = useMemo(() => groupDates(startDate, rangeMode), [startDate, rangeMode]);
  const hourlyInvalid = mode === 'HOURLY' && hourEnd <= hourStart;
  const pastStart = startDate < todayIso();
  const nameTaken = existingNames.some((n) => n.trim().toLowerCase() === name.trim().toLowerCase()) && name.trim().length > 0;
  const valid = name.trim().length > 0 && !nameTaken && !!startDate && !pastStart && approvalDays.length > 0 && !hourlyInvalid;
  const activeSlots = slots.filter((x) => x.active);

  const goPreview = () => {
    const blocks = timeBlocks(mode, hourStart, hourEnd);
    setSlots(dates.flatMap((date) => blocks.map(([start, end]) => ({ id: `${date}|${start}`, date, start, end, active: true }))));
    setStep(2);
  };

  const submit = async (resolution: NewSlotGroupInput['resolution']) => {
    setBusy(true);
    const input: NewSlotGroupInput = {
      name: name.trim(),
      description: description.trim(),
      mode,
      hourStart,
      hourEnd,
      rangeMode,
      startDate,
      blocked,
      approvalDays,
      slots: activeSlots.map(({ date, start, end }) => ({ date, start, end })),
      resolution,
    };
    try {
      await axios.post(`${BASE}/groups`, input);
      toast.success(t('slotBooking.create.published', { name: input.name }), {
        description: t('slotBooking.create.publishedDesc', { count: input.slots.length }),
      });
      setConflicts(null);
      onOpenChange(false);
      await onCreated();
    } catch (e) {
      // Someone may have added slots between the check and the publish.
      if (axios.isAxiosError(e) && e.response?.status === 409 && Array.isArray(e.response.data?.conflicts)) {
        setConflicts(e.response.data.conflicts as string[]);
      } else {
        toast.error(apiMsg(e, t('slotBooking.errors.publish')));
      }
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!activeSlots.length) return void toast.error(t('slotBooking.create.activateOne'));
    setBusy(true);
    try {
      const res = await axios.post(`${BASE}/conflicts`, { dates: [...new Set(activeSlots.map((x) => x.date))] });
      const found = res.data.data.conflicts as string[];
      if (found.length) {
        setConflicts(found);
        setBusy(false);
      } else {
        await submit('none');
      }
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.errors.checkConflicts')));
      setBusy(false);
    }
  };

  const toggleSlot = (slot: CalSlot) => setSlots((prev) => prev.map((x) => (x.id === slot.id ? { ...x, active: !x.active } : x)));
  const toggleDay = (date: string, activate: boolean) => setSlots((prev) => prev.map((x) => (x.date === date ? { ...x, active: activate } : x)));

  const label = cn('text-xs font-medium mb-1 block', heading(isDark));
  const seg = (active: boolean) =>
    cn(
      'cursor-pointer flex-1 h-9 rounded-lg border text-xs font-medium transition-colors',
      active
        ? 'bg-violet-600 border-violet-600 text-white'
        : isDark
          ? 'border-white/[0.1] text-gray-300 hover:bg-white/[0.05]'
          : 'border-gray-200 text-gray-600 hover:bg-gray-50',
    );

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
        <DialogContent
          className={cn(step === 1 ? 'sm:max-w-3xl' : 'sm:max-w-6xl', 'max-h-[92vh] overflow-y-auto p-6 sm:p-8', dialogSurface(isDark))}
        >
          <DialogHeader>
            <DialogTitle>{step === 1 ? t('slotBooking.create.titleParams') : t('slotBooking.create.titleActivate')}</DialogTitle>
            <DialogDescription>{step === 1 ? t('slotBooking.create.descParams') : t('slotBooking.create.descActivate')}</DialogDescription>
          </DialogHeader>

          {step === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={label}>{t('slotBooking.create.name')} *</label>
                <input className={inputCls(isDark)} maxLength={150} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('slotBooking.create.namePlaceholder')} />
                {nameTaken && <p className="text-[11px] text-red-500 mt-1">{t('slotBooking.create.nameTaken')}</p>}
              </div>
              <div className="md:col-span-2">
                <label className={label}>{t('slotBooking.create.description')}</label>
                <input className={inputCls(isDark)} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('slotBooking.create.descriptionPlaceholder')} />
              </div>

              <div>
                <label className={label}>{t('slotBooking.create.slotHours')}</label>
                <div className="flex gap-2">
                  <button type="button" className={seg(mode === 'HOURLY')} onClick={() => setMode('HOURLY')}>{s.mode('HOURLY')}</button>
                  <button type="button" className={seg(mode === 'SHIFT')} onClick={() => setMode('SHIFT')}>{s.mode('SHIFT')}</button>
                </div>
                <p className={cn('text-[11px] mt-1', muted(isDark))}>
                  {mode === 'SHIFT' ? '06:00–14:00 · 14:00–22:00 · 22:00–06:00' : t('slotBooking.create.hourlyHint')}
                </p>
                {mode === 'HOURLY' && (
                  <div className="flex items-center gap-2 mt-2">
                    <select className={inputCls(isDark)} value={hourStart} onChange={(e) => setHourStart(+e.target.value)}>
                      {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                    </select>
                    <span className={muted(isDark)}>{t('slotBooking.create.to')}</span>
                    <select className={inputCls(isDark)} value={hourEnd} onChange={(e) => setHourEnd(+e.target.value)}>
                      {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => <option key={h} value={h}>{String(h % 24).padStart(2, '0')}:00</option>)}
                    </select>
                  </div>
                )}
                {hourlyInvalid && <p className="text-[11px] text-red-500 mt-1">{t('slotBooking.create.endAfterStart')}</p>}
              </div>

              <div>
                <label className={label}>{t('slotBooking.create.dateRange')}</label>
                <div className="flex gap-2">
                  {RANGES.map((r) => (
                    <button key={r} type="button" className={seg(rangeMode === r)} onClick={() => setRangeMode(r)}>
                      {s.range(r)}
                    </button>
                  ))}
                </div>
                <input type="date" className={cn(inputCls(isDark), 'mt-2')} value={startDate} min={todayIso()} onChange={(e) => setStartDate(e.target.value)} />
                {pastStart && <p className="text-[11px] text-red-500 mt-1">{t('slotBooking.create.pastStart')}</p>}
                {!pastStart && startDate && (
                  <p className={cn('text-[11px] mt-1', muted(isDark))}>
                    {s.date(startDate)} → {s.date(addDaysIso(startDate, dates.length - 1))}
                  </p>
                )}
              </div>

              <div>
                <label className={label}>{t('slotBooking.create.blocking')}</label>
                <label className={cn('flex items-start gap-2 rounded-lg border p-3 cursor-pointer', isDark ? 'border-white/[0.1]' : 'border-gray-200')}>
                  <input type="checkbox" className="mt-0.5 accent-violet-600" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} />
                  <span>
                    <span className={cn('text-xs font-medium block', heading(isDark))}>{t('slotBooking.create.blockCheckbox')}</span>
                    <span className={cn('text-[11px]', muted(isDark))}>
                      {blocked ? t('slotBooking.create.blockedHint') : t('slotBooking.create.unblockedHint')}
                    </span>
                  </span>
                </label>
              </div>

              <div>
                <label className={label}>{t('slotBooking.create.approvalDays')} *</label>
                <div className="flex gap-1.5 flex-wrap">
                  {Array.from({ length: 7 }, (_, i) => i).map((i) => {
                    const on = approvalDays.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setApprovalDays((p) => (on ? p.filter((x) => x !== i) : [...p, i]))}
                        className={cn(
                          'cursor-pointer h-8 w-11 rounded-lg border text-xs font-medium transition-colors',
                          on
                            ? 'bg-violet-600 border-violet-600 text-white'
                            : isDark
                              ? 'border-white/[0.1] text-gray-300 hover:bg-white/[0.05]'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                        )}
                      >
                        {s.weekdayShort(i)}
                      </button>
                    );
                  })}
                </div>
                <p className={cn('text-[11px] mt-1', muted(isDark))}>{t('slotBooking.create.approvalHint')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Legend isDark={isDark} mode="activate" />
                <span className={cn('text-xs', muted(isDark))}>{t('slotBooking.create.slotsActive', { active: activeSlots.length, total: slots.length })}</span>
              </div>
              <GroupCalendar isDark={isDark} mode="activate" dates={dates} slots={slots} onSlotClick={toggleSlot} onDayToggle={toggleDay} roomy />
            </div>
          )}

          <DialogFooter>
            {step === 1 ? (
              <>
                <Btn isDark={isDark} onClick={() => onOpenChange(false)}>{t('slotBooking.common.cancel')}</Btn>
                <Btn isDark={isDark} variant="primary" disabled={!valid} onClick={goPreview}>{t('slotBooking.create.nextCalendar')}</Btn>
              </>
            ) : (
              <>
                <Btn isDark={isDark} disabled={busy} onClick={() => setStep(1)}>{t('slotBooking.common.back')}</Btn>
                <Btn isDark={isDark} variant="primary" loading={busy} onClick={publish}>{t('slotBooking.create.publish')}</Btn>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate slot warning */}
      <Dialog open={!!conflicts} onOpenChange={(o) => !o && !busy && setConflicts(null)}>
        <DialogContent className={cn('sm:max-w-md', dialogSurface(isDark))}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle size={18} /> {t('slotBooking.conflict.title')}
            </DialogTitle>
            <DialogDescription>{t('slotBooking.conflict.message')}</DialogDescription>
          </DialogHeader>
          <ul className={cn('text-xs rounded-lg border p-3 space-y-0.5 max-h-40 overflow-y-auto', isDark ? 'border-white/[0.08]' : 'border-gray-200')}>
            {conflicts?.map((d) => <li key={d}>{s.date(d)}</li>)}
          </ul>
          <p className={cn('text-[11px]', muted(isDark))}>
            <b>{t('slotBooking.conflict.merge')}</b> {t('slotBooking.conflict.mergeHint')} <b>{t('slotBooking.conflict.overwrite')}</b> {t('slotBooking.conflict.overwriteHint')}
          </p>
          <DialogFooter>
            <Btn isDark={isDark} disabled={busy} onClick={() => setConflicts(null)}>{t('slotBooking.common.cancel')}</Btn>
            <Btn isDark={isDark} variant="danger" loading={busy} onClick={() => submit('overwrite')}>{t('slotBooking.conflict.overwrite')}</Btn>
            <Btn isDark={isDark} variant="primary" loading={busy} onClick={() => submit('merge')}>{t('slotBooking.conflict.merge')}</Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
