'use client';

import type { MissionProgress, TodaySlotState } from '@/lib/slot-booking-logic';
import { muted, useSlotI18n } from './ui';


export type Tone = 'red' | 'blue' | 'amber' | 'violet' | 'green' | 'gray';

export const STATE_TONE: Record<TodaySlotState, Tone> = {
  no_mission: 'red',
  no_progress: 'red',
  incomplete: 'red',
  in_progress: 'blue',
  partial: 'amber',
  waiting: 'violet',
  completed: 'green',
};

export const PROGRESS_TONE: Record<MissionProgress, Tone> = { planned: 'gray', in_progress: 'blue', completed: 'green', aborted: 'red' };

export function toneCls(tone: Tone, isDark: boolean) {
  return {
    red: { dot: 'bg-red-500', bar: 'bg-red-500', text: 'text-red-500', fill: isDark ? 'bg-red-500/[0.10]' : 'bg-red-500/[0.06]', border: isDark ? 'border-red-500/40' : 'border-red-300' },
    blue: { dot: 'bg-sky-500', bar: 'bg-sky-500', text: 'text-sky-500', fill: isDark ? 'bg-sky-500/[0.12]' : 'bg-sky-500/[0.08]', border: isDark ? 'border-sky-500/40' : 'border-sky-300' },
    amber: { dot: 'bg-amber-500', bar: 'bg-amber-500', text: 'text-amber-500', fill: isDark ? 'bg-amber-500/[0.10]' : 'bg-amber-500/[0.07]', border: isDark ? 'border-amber-500/40' : 'border-amber-300' },
    violet: { dot: 'bg-violet-500', bar: 'bg-violet-500', text: 'text-violet-500', fill: isDark ? 'bg-violet-500/[0.10]' : 'bg-violet-500/[0.06]', border: isDark ? 'border-white/[0.08]' : 'border-gray-200' },
    green: { dot: 'bg-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-500', fill: isDark ? 'bg-emerald-500/[0.10]' : 'bg-emerald-500/[0.06]', border: isDark ? 'border-emerald-500/30' : 'border-emerald-200' },
    gray: { dot: 'bg-gray-400', bar: 'bg-gray-400', text: muted(isDark), fill: isDark ? 'bg-white/[0.03]' : 'bg-gray-500/[0.04]', border: isDark ? 'border-white/[0.08]' : 'border-gray-200' },
  }[tone];
}

/** 1h 05m · 12m 09s — seconds only below an hour, so the countdown visibly ticks. */
export function fmtCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s).padStart(2, '0')}s`;
}

/** 8h · 1h 30m · 45m */
export function fmtDuration(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/** A mission's time in the slot's site zone, so it lines up with the slot times. */
export function useSiteTime() {
  const { locale } = useSlotI18n();
  return (iso: string | null, timeZone: string) =>
    iso ? new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone }) : null;
}

