'use client';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { Booking } from '@/config/types/slot-booking';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { nextApprovalDay, shortSlotLabel, weekdayOf } from '@/lib/slot-booking-utils';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Ban, Check, Clock, Loader2, Lock, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export const apiMsg = (e: unknown, fallback: string) =>
  getApiErrorMessage(axios.isAxiosError(e) ? e.response?.data : null, fallback);

const LOCALES: Record<string, string> = { en: 'en-GB', de: 'de-DE', it: 'it-IT' };

 
export function useSlotI18n() {
  const { t, i18n } = useTranslation();
  const locale = LOCALES[(i18n.language ?? 'en').slice(0, 2)] ?? 'en-GB';
  const utc = (d: string) => new Date(`${d}T00:00:00Z`);

  const weekdayShort = (i: number) => t(`slotBooking.weekdaysShort.${i}`);
  const weekdayLong = (i: number) => t(`slotBooking.weekdaysLong.${i}`);
  const daysLabel = (days: number[]) =>
    days.length ? [...days].sort().map(weekdayLong).join(', ') : t('slotBooking.notSet');

  return {
    t,
    locale,
    date: (d: string) => utc(d).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    dateLong: (d: string) => utc(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    dayShort: (d: string) => utc(d).toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' }),
    dayMonth: (d: string) => utc(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', timeZone: 'UTC' }),
    dateTime: (iso: string) => new Date(iso).toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    auditDay: (iso: string) => new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
    auditTime: (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    weekdayShort,
    weekdayLong,
    daysLabel,
    reviewDay: (days: number[]) => {
      const n = nextApprovalDay(days);
      if (!n) return daysLabel(days);
      return n.label === 'Today' ? t('slotBooking.today') : weekdayLong(weekdayOf(n.date));
    },
    status: (s: Booking['status']) => t(`slotBooking.status.${s}`),
    range: (r: string) => t(`slotBooking.range.${r}`),
    mode: (m: string) => t(`slotBooking.mode.${m}`),
  };
}

export const card = (isDark: boolean) =>
  isDark ? 'bg-[#0f1320] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm';
export const muted = (isDark: boolean) => (isDark ? 'text-gray-400' : 'text-gray-500');
export const heading = (isDark: boolean) => (isDark ? 'text-white' : 'text-gray-900');
export const dialogSurface = (isDark: boolean) => (isDark ? 'bg-[#0f1320] border-white/[0.08] text-white' : '');
export const inputCls = (isDark: boolean) =>
  cn(
    'h-9 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/40',
    isDark ? 'bg-[#0a0e1a] border-white/[0.1] text-white' : 'bg-white border-gray-300 text-gray-900',
  );

export function Btn({
  children,
  onClick,
  variant = 'ghost',
  disabled,
  loading,
  isDark,
  className,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'success' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  isDark: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const styles = {
    primary: 'bg-violet-600 hover:bg-violet-700 text-white border-transparent',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent',
    danger: isDark
      ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
      : 'border-red-300 text-red-600 hover:bg-red-50',
    ghost: isDark
      ? 'border-white/[0.1] hover:bg-white/[0.05] text-white'
      : 'border-gray-200 hover:bg-gray-50 text-gray-700',
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'cursor-pointer h-8 inline-flex items-center justify-center gap-1.5 px-3.5 text-xs font-medium rounded-lg border transition-all disabled:cursor-not-allowed disabled:opacity-50',
        styles,
        className,
      )}
    >
      {loading && <Loader2 size={12} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Pill({
  children,
  tone = 'gray',
  isDark,
}: {
  children: ReactNode;
  tone?: 'gray' | 'violet' | 'amber' | 'green' | 'red' | 'blue';
  isDark: boolean;
}) {
  const tones = {
    gray: isDark ? 'bg-white/[0.06] text-gray-300' : 'bg-gray-100 text-gray-600',
    violet: isDark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700',
    amber: isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700',
    green: isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
    red: isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-700',
    blue: isDark ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-50 text-sky-700',
  }[tone];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', tones)}>
      {children}
    </span>
  );
}

export const statusTone = (s: Booking['status']) =>
  s === 'APPROVED' ? 'green' : s === 'REJECTED' ? 'red' : 'amber';

/** Loading / error / empty placeholders so every screen handles the three states the same way. */
export function LoadingBlock({ isDark, rows = 3 }: { isDark: boolean; rows?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn('h-44 rounded-xl', isDark && 'bg-white/[0.06]')} />
      ))}
    </div>
  );
}

export function ErrorBlock({ isDark, message, onRetry }: { isDark: boolean; message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className={cn('rounded-xl border p-6 text-center space-y-3', card(isDark))}>
      <p className="text-sm text-red-500">{message}</p>
      {onRetry && <Btn isDark={isDark} onClick={onRetry}>{t('slotBooking.common.tryAgain')}</Btn>}
    </div>
  );
}

/** Search box used above lists (same look as the search on the Audit Logs page). */
export function SearchBox({
  isDark,
  value,
  onChange,
  placeholder,
  className,
}: {
  isDark: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search size={14} className={cn('absolute left-2.5 top-1/2 -translate-y-1/2', isDark ? 'text-gray-500' : 'text-gray-400')} />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-8 pl-8 text-xs bg-transparent border-white/[0.08]"
      />
    </div>
  );
}

export function EmptyBlock({ isDark, children }: { isDark: boolean; children: ReactNode }) {
  return <div className={cn('rounded-xl border border-dashed p-8 text-center text-sm', muted(isDark), isDark ? 'border-white/[0.1]' : 'border-gray-300')}>{children}</div>;
}

// ───────────────────────── Calendar grid ─────────────────────────

export type CalendarMode = 'activate' | 'opm' | 'pic';

/** Server slots have numeric ids; the publish wizard uses string keys for not-yet-saved slots. */
export interface CalSlot {
  id: number | string;
  date: string;
  start: string;
  end: string;
  active: boolean;
}

interface CalendarProps<S extends CalSlot> {
  isDark: boolean;
  mode: CalendarMode;
  dates: string[];
  slots: S[];
  blocked?: boolean;
  bookings?: Booking[];
  /** The signed-in user's id, to recognise "my" requests in PIC mode. */
  meId?: number;
  onSlotClick?: (slot: S) => void;
  onDayToggle?: (date: string, activate: boolean) => void;
  /** More padding / taller cells (used in the publish modal). */
  roomy?: boolean;
}

export function GroupCalendar<S extends CalSlot>({
  isDark,
  mode,
  dates,
  slots,
  blocked,
  bookings = [],
  meId,
  onSlotClick,
  onDayToggle,
  roomy,
}: CalendarProps<S>) {
  const s = useSlotI18n();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7', roomy ? 'gap-3' : 'gap-2')}>
      {dates.map((date) => {
        const daySlots = slots.filter((x) => x.date === date).sort((a, b) => a.start.localeCompare(b.start));
        const allActive = daySlots.length > 0 && daySlots.every((x) => x.active);
        return (
          <div
            key={date}
            className={cn(
              'rounded-xl border flex flex-col',
              roomy ? 'p-3 gap-2 min-h-[160px]' : 'p-2 gap-1.5 min-h-[120px]',
              card(isDark),
              date === today && 'ring-1 ring-violet-500/50',
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className={cn('text-xs font-semibold', heading(isDark))}>{s.dayShort(date)}</div>
                <div className={cn('text-[10px]', muted(isDark))}>{s.dayMonth(date)}</div>
              </div>
              {mode === 'activate' && (
                <button
                  type="button"
                  onClick={() => onDayToggle?.(date, !allActive)}
                  className="cursor-pointer text-[10px] text-violet-500 hover:underline"
                >
                  {allActive ? s.t('slotBooking.calendar.deactivateDay') : s.t('slotBooking.calendar.activateDay')}
                </button>
              )}
            </div>
            <div className={cn('flex flex-col overflow-y-auto pr-0.5', roomy ? 'gap-1.5 max-h-80' : 'gap-1 max-h-72')}>
              {daySlots.length === 0 && <span className={cn('text-[11px]', muted(isDark))}>{s.t('slotBooking.calendar.noSlots')}</span>}
              {daySlots.map((slot) => (
                <SlotChip
                  key={slot.id}
                  isDark={isDark}
                  mode={mode}
                  slot={slot}
                  blocked={blocked}
                  bookings={bookings.filter((b) => b.slotId === slot.id)}
                  meId={meId}
                  past={date < today}
                  onClick={() => onSlotClick?.(slot)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SlotChip({
  isDark,
  mode,
  slot,
  blocked,
  bookings,
  meId,
  past,
  onClick,
}: {
  isDark: boolean;
  mode: CalendarMode;
  slot: CalSlot;
  blocked?: boolean;
  bookings: Booking[];
  meId?: number;
  past: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const base =
    'w-full text-left rounded-md border px-2 py-1 text-[11px] flex items-center justify-between gap-1 transition-colors';
  const label = shortSlotLabel(slot);
  const live = bookings.filter((b) => b.status !== 'REJECTED');
  const pending = live.filter((b) => b.status === 'PENDING');
  const approved = live.find((b) => b.status === 'APPROVED');
  const dim = isDark ? 'border-white/[0.08] text-gray-500' : 'border-gray-200 text-gray-400';

  if (mode === 'activate') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          base,
          'cursor-pointer',
          slot.active
            ? isDark
              ? 'bg-violet-500/20 border-violet-500/40 text-violet-200'
              : 'bg-violet-50 border-violet-300 text-violet-800'
            : cn(dim, 'line-through'),
        )}
      >
        <span className="font-medium">{label}</span>
        {slot.active ? <Check size={11} /> : <Ban size={11} />}
      </button>
    );
  }

  if (!slot.active) {
    return (
      <div className={cn(base, 'opacity-60 line-through', dim)}>
        <span>{label}</span>
        <Ban size={11} />
      </div>
    );
  }

  if (mode === 'opm') {
    const tone = approved
      ? isDark
        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
        : 'bg-emerald-50 border-emerald-300 text-emerald-800'
      : pending.length
        ? isDark
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
          : 'bg-amber-50 border-amber-300 text-amber-800'
        : isDark
          ? 'border-white/[0.1] text-gray-300 hover:bg-white/[0.04]'
          : 'border-gray-200 text-gray-600 hover:bg-gray-50';
    return (
      <button type="button" onClick={onClick} className={cn(base, 'cursor-pointer', tone)}>
        <span className="font-medium">{label}</span>
        <span className="text-[10px] whitespace-nowrap">
          {approved
            ? t('slotBooking.calendar.approved')
            : pending.length
              ? t('slotBooking.calendar.picsBooked', { count: pending.length })
              : t('slotBooking.calendar.open')}
        </span>
      </button>
    );
  }

  // PIC mode
  const mine = live.find((b) => b.picId === meId);
  if (mine) {
    const ok = mine.status === 'APPROVED';
    return (
      <div
        className={cn(
          base,
          ok
            ? isDark
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
            : isDark
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              : 'bg-amber-50 border-amber-300 text-amber-800',
        )}
      >
        <span className="font-medium">{label}</span>
        <span className="flex items-center gap-0.5 text-[10px]">
          {ok ? <Check size={10} /> : <Clock size={10} />}
          {ok ? t('slotBooking.calendar.approved') : t('slotBooking.calendar.pending')}
        </span>
      </div>
    );
  }
  if (approved || (blocked && live.length > 0)) {
    return (
      <div className={cn(base, 'opacity-70', dim)}>
        <span>{label}</span>
        <span className="flex items-center gap-0.5 text-[10px]">
          <Lock size={10} /> {t('slotBooking.calendar.taken')}
        </span>
      </div>
    );
  }
  if (past) {
    return (
      <div className={cn(base, 'opacity-60', dim)}>
        <span>{label}</span>
        <span className="text-[10px]">{t('slotBooking.calendar.closed')}</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        base,
        'cursor-pointer',
        isDark ? 'border-sky-500/40 text-sky-300 hover:bg-sky-500/10' : 'border-sky-300 text-sky-700 hover:bg-sky-50',
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="text-[10px]">{t('slotBooking.calendar.open')}</span>
    </button>
  );
}

export function Legend({ isDark, mode }: { isDark: boolean; mode: CalendarMode }) {
  const { t } = useTranslation();
  const items =
    mode === 'activate'
      ? [
          ['bg-violet-500', 'active'],
          ['bg-gray-400', 'disabled'],
        ]
      : mode === 'opm'
        ? [
            ['bg-gray-400', 'noBookings'],
            ['bg-amber-500', 'awaiting'],
            ['bg-emerald-500', 'approved'],
          ]
        : [
            ['bg-sky-500', 'open'],
            ['bg-amber-500', 'myPending'],
            ['bg-emerald-500', 'myApproved'],
            ['bg-gray-400', 'taken'],
          ];
  return (
    <div className="flex flex-wrap gap-3">
      {items.map(([c, key]) => (
        <div key={key} className="flex items-center gap-1.5">
          <span className={cn('w-2.5 h-2.5 rounded-full', c)} />
          <span className={cn('text-[11px]', muted(isDark))}>{t(`slotBooking.legend.${key}`)}</span>
        </div>
      ))}
    </div>
  );
}
