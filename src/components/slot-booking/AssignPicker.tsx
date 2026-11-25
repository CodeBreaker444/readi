'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import type { SlotCandidate, SlotCandidates } from '@/config/types/slot-booking';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { AlertTriangle, Check, ChevronDown, Search, Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Avatar } from './Avatar';
import { apiMsg, Btn, ErrorBlock, FlightChip, FlightWarning, heading, inputCls, muted, Pill, useWeatherText, WeatherBadge } from './ui';

const BASE = '/api/operation/slot-booking';

/** Styled pilot dropdown: searchable, grouped, with avatar, hours/score and flight-limit chip per pilot. */
function PilotSelect({
  isDark,
  value,
  onChange,
  groups,
  placeholder,
}: {
  isDark: boolean;
  value: string;
  onChange: (v: string) => void;
  groups: Array<{ label: string; items: SlotCandidate[]; disabled?: boolean }>;
  placeholder: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const all = groups.flatMap((g) => g.items);
  const current = all.find((c) => String(c.userId) === value) ?? null;
  const needle = q.trim().toLowerCase();
  const shown = groups
    .map((g) => ({ ...g, items: needle ? g.items.filter((c) => [c.name, c.email ?? '', c.role ?? ''].some((v) => v.toLowerCase().includes(needle))) : g.items }))
    .filter((g) => g.items.length > 0);
  const line = isDark ? 'border-white/[0.08]' : 'border-gray-100';

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(''); }}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(inputCls(isDark), 'h-11 flex items-center justify-between gap-2 cursor-pointer text-left')}>
          {current ? (
            <span className="flex items-center gap-2 min-w-0">
              <Avatar person={current} size={24} />
              <span className="truncate text-sm font-medium">{current.name}</span>
              {current.expert && <Star size={11} className="text-amber-500 shrink-0" />}
            </span>
          ) : (
            <span className="truncate opacity-60">{placeholder}</span>
          )}
          <ChevronDown size={14} className={cn('shrink-0 transition-transform opacity-60', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn('w-(--radix-popover-trigger-width) min-w-72 p-0 overflow-hidden', isDark && 'bg-[#0f1320] border-white/[0.1] text-white')}
      >
        <div className={cn('relative p-2 border-b', line)}>
          <Search size={13} className={cn('absolute left-4.5 top-1/2 -translate-y-1/2 pointer-events-none', muted(isDark))} />
          <input autoFocus className={cn(inputCls(isDark), 'pl-8 h-8 text-xs')} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('slotBooking.pilotGroups.searchUsers')} />
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
          {shown.length === 0 && <p className={cn('py-6 text-center text-xs', muted(isDark))}>{t('slotBooking.pilotGroups.noUsers')}</p>}
          {shown.map((g) => (
            <div key={g.label}>
              <div className={cn('px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider', muted(isDark))}>{g.label}</div>
              {g.items.map((c) => {
                const on = String(c.userId) === value;
                return (
                  <button
                    key={c.userId}
                    type="button"
                    disabled={g.disabled}
                    onClick={() => { onChange(String(c.userId)); setOpen(false); setQ(''); }}
                    className={cn(
                      'w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors',
                      g.disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : cn('cursor-pointer', on ? 'bg-violet-600 text-white' : isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-violet-50'),
                    )}
                  >
                    <Avatar person={c} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-xs font-medium">
                        <span className="truncate">{c.name}</span>
                        {c.expert && <Star size={10} className={cn('shrink-0', on ? 'text-white' : 'text-amber-500')} />}
                      </span>
                      <span className={cn('block text-[11px] truncate', on ? 'text-white/80' : muted(isDark))}>
                        {g.disabled && c.collision
                          ? c.collision
                          : `${t('slotBooking.assign.hoursShort', { hours: c.hours90 })} · ${t('slotBooking.assign.scoreShort', { score: c.score })}`}
                      </span>
                    </span>
                    {!g.disabled && <FlightChip flight={c.flight} isDark={isDark} />}
                    {on && <Check size={14} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * "Assign pilot" dropdown for one slot: pilots who asked for it come first, then free pilots (experts first when the
 * weather is tough); pilots with an overlapping assignment are listed but cannot be picked.
 */
export function AssignPicker({ slotId, isDark, onChanged }: { slotId: number; isDark: boolean; onChanged: () => Promise<void> | void }) {
  const { t } = useTranslation();
  const weatherText = useWeatherText();
  const [data, setData] = useState<SlotCandidates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmTough, setConfirmTough] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE}/slots/${slotId}/candidates`);
      setData(res.data.data);
      setError(null);
    } catch (e) {
      setError(apiMsg(e, t('slotBooking.assign.errors.load')));
    }
  }, [slotId, t]);

  useEffect(() => {
    setData(null);
    setSelected('');
    setConfirmTough(false);
    load();
  }, [load]);

  if (error) return <ErrorBlock isDark={isDark} message={error} onRetry={load} />;
  if (!data) return <Skeleton className={cn('h-24 rounded-lg', isDark && 'bg-white/[0.06]')} />;

  const chosen = data.candidates.find((c) => String(c.userId) === selected) ?? null;
  const tough = data.weather?.level === 'tough';
  const requested = data.candidates.filter((c) => c.requested && !c.collision);
  const free = data.candidates.filter((c) => !c.requested && !c.collision);
  const blockedOnes = data.candidates.filter((c) => c.collision);
  const assigned = data.candidates.find((c) => c.userId === data.assignedPilotId);

  const run = async (fn: () => Promise<unknown>, okMsg: string, failMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      setSelected('');
      setConfirmTough(false);
      await onChanged();
      await load();
    } catch (e) {
      toast.error(apiMsg(e, failMsg));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const assign = () => {
    if (!chosen) return;
    if (tough && !chosen.expert && !confirmTough) return setConfirmTough(true);
    return run(() => axios.post(`${BASE}/slots/${slotId}/assign`, { pilotId: chosen.userId }), t('slotBooking.assign.assigned', { name: chosen.name }), t('slotBooking.assign.errors.assign'));
  };

  if (data.assignedPilotId !== null) {
    return (
      <div className={cn('rounded-lg border p-3 flex items-center gap-3', isDark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50')}>
        {assigned && <Avatar person={assigned} size={32} />}
        <div className="flex-1 min-w-0">
          <div className={cn('text-sm font-medium truncate', heading(isDark))}>{assigned?.name ?? t('slotBooking.assign.pilot')}</div>
          <div className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.assign.currentlyAssigned')}</div>
        </div>
        <Btn
          isDark={isDark}
          variant="danger"
          loading={busy}
          onClick={() => run(() => axios.delete(`${BASE}/slots/${slotId}/assign`), t('slotBooking.assign.unassigned'), t('slotBooking.assign.errors.unassign'))}
        >
          {t('slotBooking.assign.unassign')}
        </Btn>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.weather && (
        <div
          className={cn(
            'rounded-lg border px-3 py-2 text-[11px] flex items-start gap-2',
            tough
              ? isDark ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-800'
              : isDark ? 'border-white/[0.08] text-gray-300' : 'border-gray-200 text-gray-600',
          )}
        >
          <WeatherBadge weather={data.weather} isDark={isDark} />
          <span className="flex-1">
            {weatherText(data.weather)}
            {tough && <span className="block font-medium mt-0.5">{t('slotBooking.assign.toughHint')}</span>}
          </span>
        </div>
      )}

      {data.candidates.length === 0 ? (
        <p className={cn('text-xs', muted(isDark))}>{t('slotBooking.assign.none')}</p>
      ) : (
        <>
          <PilotSelect
            isDark={isDark}
            value={selected}
            placeholder={t('slotBooking.assign.choose')}
            onChange={(v) => { setSelected(v); setConfirmTough(false); }}
            groups={[
              { label: t('slotBooking.assign.groupRequested'), items: requested },
              { label: t('slotBooking.assign.groupAvailable'), items: free },
              { label: t('slotBooking.assign.groupBlocked'), items: blockedOnes, disabled: true },
            ]}
          />

          {chosen && (
            <div className={cn('rounded-lg border p-3 flex items-start gap-3', isDark ? 'border-white/[0.08]' : 'border-gray-200')}>
              <Avatar person={chosen} size={36} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className={cn('text-sm font-medium truncate', heading(isDark))}>{chosen.name}</div>
                <div className={cn('text-[11px] truncate', muted(isDark))}>{chosen.email ?? t('slotBooking.pilotGroups.noEmail')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {chosen.role && <Pill isDark={isDark} tone="violet">{chosen.role}</Pill>}
                  {chosen.groups.map((g) => (
                    <Pill key={g.id} isDark={isDark} tone={g.expert ? 'green' : 'gray'}>{g.expert && <Star size={9} />} {g.name}</Pill>
                  ))}
                  {chosen.requested && <Pill isDark={isDark} tone="amber">{t('slotBooking.assign.requested')}</Pill>}
                  <FlightChip flight={chosen.flight} isDark={isDark} />
                </div>
                <div className={cn('text-[11px]', muted(isDark))}>
                  {t('slotBooking.assign.hours90', { hours: chosen.hours90 })} · {t('slotBooking.assign.score', { score: chosen.score })}
                </div>
              </div>
            </div>
          )}

          {chosen && <FlightWarning flight={chosen.flight} name={chosen.name} isDark={isDark} />}

          {confirmTough && (
            <p className="text-[11px] text-amber-600 flex items-start gap-1.5">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {t('slotBooking.assign.confirmTough')}
            </p>
          )}
          <Btn isDark={isDark} variant="primary" disabled={!chosen} loading={busy} onClick={assign}>
            {confirmTough ? t('slotBooking.assign.assignAnyway') : t('slotBooking.assign.assign')}
          </Btn>
          {blockedOnes.length > 0 && <p className={cn('text-[11px]', muted(isDark))}>{t('slotBooking.assign.blockedNote', { count: blockedOnes.length })}</p>}
        </>
      )}
    </div>
  );
}
