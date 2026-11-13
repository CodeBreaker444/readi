'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { SlotCandidate, SlotCandidates } from '@/config/types/slot-booking';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { AlertTriangle, Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Avatar } from './Avatar';
import { apiMsg, Btn, ErrorBlock, heading, inputCls, muted, Pill, useWeatherText, WeatherBadge } from './ui';

const BASE = '/api/operation/slot-booking';

const optionText = (c: SlotCandidate, t: (k: string, o?: Record<string, unknown>) => string) =>
  `${c.name}${c.expert ? ' ★' : ''} · ${t('slotBooking.assign.hoursShort', { hours: c.hours90 })} · ${t('slotBooking.assign.scoreShort', { score: c.score })}`;

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
          <select
            className={inputCls(isDark)}
            value={selected}
            onChange={(e) => { setSelected(e.target.value); setConfirmTough(false); }}
            aria-label={t('slotBooking.assign.choose')}
          >
            <option value="">{t('slotBooking.assign.choose')}</option>
            {requested.length > 0 && (
              <optgroup label={t('slotBooking.assign.groupRequested')}>
                {requested.map((c) => <option key={c.userId} value={c.userId}>{optionText(c, t)}</option>)}
              </optgroup>
            )}
            {free.length > 0 && (
              <optgroup label={t('slotBooking.assign.groupAvailable')}>
                {free.map((c) => <option key={c.userId} value={c.userId}>{optionText(c, t)}</option>)}
              </optgroup>
            )}
            {blockedOnes.length > 0 && (
              <optgroup label={t('slotBooking.assign.groupBlocked')}>
                {blockedOnes.map((c) => <option key={c.userId} value={c.userId} disabled>{optionText(c, t)}</option>)}
              </optgroup>
            )}
          </select>

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
                </div>
                <div className={cn('text-[11px]', muted(isDark))}>
                  {t('slotBooking.assign.hours90', { hours: chosen.hours90 })} · {t('slotBooking.assign.score', { score: chosen.score })}
                </div>
              </div>
            </div>
          )}

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
