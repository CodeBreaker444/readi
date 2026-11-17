'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { SlotMissionCandidates, TodayMission, TodaySlot } from '@/config/types/slot-booking';
import { slotLabel } from '@/lib/slot-booking-utils';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { AlertTriangle, Check, ClipboardList, Link2, MapPin, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { apiMsg, Btn, dialogSurface, EmptyBlock, ErrorBlock, heading, muted, Pill, SearchBox, useSlotI18n } from './ui';
import { useSiteTime, PROGRESS_TONE } from './today-helpers';

const BASE = '/api/operation/slot-booking';

type Filter = 'all' | 'suggested';

 
export function LinkMissionsDialog({
  isDark,
  slot,
  onClose,
  onLinked,
}: {
  isDark: boolean;
  slot: TodaySlot | null;
  onClose: () => void;
  onLinked: () => void | Promise<void>;
}) {
  const s = useSlotI18n();
  const { t } = s;
  const [data, setData] = useState<SlotMissionCandidates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const slotId = slot?.slotId ?? null;

  useEffect(() => {
    if (slotId === null) return;
    let cancelled = false;
    setData(null);
    setError(null);
    setSelected(new Set());
    setSearch('');
    axios
      .get(`${BASE}/slots/${slotId}/missions`)
      .then((res) => {
        if (cancelled) return;
        const d: SlotMissionCandidates = res.data.data;
        setData(d);
        // Pre-select the obvious choice: free missions planned inside the slot.
        const from = Date.parse(d.slot.startAt);
        const to = Date.parse(d.slot.endAt);
        setSelected(new Set(d.missions.filter((m) => m.linkedSlotId === null && inWindow(m, from, to)).map((m) => m.id)));
        setFilter(d.missions.some((m) => inWindow(m, from, to)) ? 'suggested' : 'all');
      })
      .catch((e) => !cancelled && setError(apiMsg(e, t('slotBooking.todayTab.errors.candidates'))));
    return () => {
      cancelled = true;
    };
  }, [slotId, reloadKey, t]);

  const from = data ? Date.parse(data.slot.startAt) : 0;
  const to = data ? Date.parse(data.slot.endAt) : 0;

  const visible = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.missions.filter((m) => {
      if (filter === 'suggested' && !inWindow(m, from, to) && m.linkedSlotId !== slotId) return false;
      if (!q) return true;
      return [m.code, m.name, m.description, m.droneName, m.droneCode, m.planCode, m.planDescription, m.planningName, m.clientName, m.location, m.typeName]
        .some((v) => v?.toLowerCase().includes(q));
    });
  }, [data, search, filter, from, to, slotId]);

  const suggestedCount = data ? data.missions.filter((m) => inWindow(m, from, to)).length : 0;

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    if (!slot || !selected.size) return;
    setSaving(true);
    try {
      const res = await axios.post(`${BASE}/slots/${slot.slotId}/missions`, { missionIds: [...selected] });
      const { linked, skipped = 0 } = res.data.data as { linked: number; skipped?: number };
      if (linked > 0) toast.success(t('slotBooking.todayTab.linked', { count: linked }));
      if (skipped > 0) toast.warning(t('slotBooking.todayTab.skippedSome', { count: skipped }));
      await onLinked();
    } catch (e) {
      toast.error(apiMsg(e, t('slotBooking.todayTab.errors.link')));
      setReloadKey((k) => k + 1); // someone may have linked one of them meanwhile
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!slot} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className={cn('sm:max-w-3xl max-h-[92vh] flex flex-col gap-4', dialogSurface(isDark))}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 size={16} className="text-violet-500" /> {t('slotBooking.todayTab.dialog.title')}
          </DialogTitle>
          <DialogDescription>
            {slot &&
              t('slotBooking.todayTab.dialog.description', {
                date: s.date(slot.date),
                slot: slotLabel(slot),
                group: [slot.groupName, slot.clientName].filter(Boolean).join(' · '),
              })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className={cn('inline-flex rounded-lg border p-0.5', isDark ? 'border-white/[0.1]' : 'border-gray-200')}>
            {(['suggested', 'all'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'cursor-pointer px-3 h-7 rounded-md text-xs font-medium transition-colors',
                  filter === f ? 'bg-violet-600 text-white' : cn(muted(isDark), 'hover:text-violet-500'),
                )}
              >
                {f === 'suggested'
                  ? `${t('slotBooking.todayTab.dialog.filterSuggested')} (${suggestedCount})`
                  : `${t('slotBooking.todayTab.dialog.filterAll')} (${data?.missions.length ?? 0})`}
              </button>
            ))}
          </div>
          <SearchBox isDark={isDark} value={search} onChange={setSearch} placeholder={t('slotBooking.todayTab.dialog.search')} className="flex-1 min-w-[200px]" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-2">
          {error ? (
            <ErrorBlock isDark={isDark} message={error} onRetry={() => setReloadKey((k) => k + 1)} />
          ) : !data ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className={cn('h-28 rounded-xl', isDark && 'bg-white/[0.06]')} />)
          ) : data.missions.length === 0 ? (
            <EmptyBlock isDark={isDark}>
              <ClipboardList size={22} className="mx-auto mb-2" />
              <div className={cn('text-sm font-medium', heading(isDark))}>{t('slotBooking.todayTab.dialog.empty')}</div>
              <div className="mt-1">{t('slotBooking.todayTab.dialog.emptyHint')}</div>
            </EmptyBlock>
          ) : visible.length === 0 ? (
            <EmptyBlock isDark={isDark}>{t('slotBooking.todayTab.dialog.noMatch')}</EmptyBlock>
          ) : (
            visible.map((m) => (
              <MissionCard
                key={m.id}
                isDark={isDark}
                mission={m}
                timezone={slot?.timezone ?? 'UTC'}
                slotId={slotId}
                slotClientId={data.slot.clientId}
                suggested={inWindow(m, from, to)}
                checked={selected.has(m.id) || m.linkedSlotId === slotId}
                onToggle={() => toggle(m.id)}
              />
            ))
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between gap-2">
          <span className={cn('text-xs', muted(isDark))}>{t('slotBooking.todayTab.dialog.selected', { count: selected.size })}</span>
          <div className="flex gap-2">
            <Btn isDark={isDark} disabled={saving} onClick={onClose}>{t('slotBooking.common.cancel')}</Btn>
            <Btn isDark={isDark} variant="primary" loading={saving} disabled={!selected.size} onClick={save}>
              <Link2 size={12} /> {t('slotBooking.todayTab.dialog.confirm', { count: selected.size })}
            </Btn>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function inWindow(m: TodayMission, from: number, to: number) {
  if (m.progress === 'aborted') return false; // closed records are never suggested
  const at = m.actualStart ?? m.scheduledStart;
  if (!at) return false;
  const ms = Date.parse(at);
  return ms >= from && ms < to;
}

function MissionCard({
  isDark,
  mission: m,
  timezone,
  slotId,
  slotClientId,
  suggested,
  checked,
  onToggle,
}: {
  isDark: boolean;
  mission: TodayMission;
  timezone: string;
  slotId: number | null;
  slotClientId: number | null;
  suggested: boolean;
  checked: boolean;
  onToggle: () => void;
}) {
  const { t } = useSlotI18n();
  const siteTime = useSiteTime();
  const linkedHere = m.linkedSlotId !== null && m.linkedSlotId === slotId;
  const linkedElsewhere = m.linkedSlotId !== null && !linkedHere;
  const aborted = m.progress === 'aborted';
  const disabled = m.linkedSlotId !== null || aborted;
  const clientMismatch = slotClientId !== null && m.clientId !== null && m.clientId !== slotClientId;
  const f = (k: string) => t(`slotBooking.todayTab.fields.${k}`);

  const fields: Array<[string, ReactNode]> = [
    [f('scheduled'), siteTime(m.scheduledStart, timezone)],
    [f('started'), siteTime(m.actualStart, timezone)],
    [f('ended'), siteTime(m.actualEnd, timezone)],
    [f('duration'), m.flightMinutes != null ? `${m.flightMinutes} min` : null],
    [f('drone'), [m.droneName, m.droneCode && m.droneCode !== m.droneName ? `(${m.droneCode})` : null].filter(Boolean).join(' ') || null],
    [
      f('client'),
      m.clientName && (
        <span className={cn('inline-flex items-center gap-1', clientMismatch && 'text-amber-500')}>
          {clientMismatch && <AlertTriangle size={11} />}
          {m.clientName}
        </span>
      ),
    ],
    [f('type'), m.typeName],
    [f('category'), m.categoryName],
    [f('planning'), m.planningName],
    [f('plan'), [m.planCode, m.planDescription].filter(Boolean).join(' — ') || null],
  ];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'w-full text-left rounded-xl border p-3.5 transition-all',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        (linkedElsewhere || aborted) && 'opacity-55',
        checked
          ? isDark ? 'border-violet-500/60 bg-violet-500/[0.08] ring-1 ring-violet-500/30' : 'border-violet-400 bg-violet-50/70 ring-1 ring-violet-400/30'
          : isDark ? 'border-white/[0.08] hover:border-white/[0.16] bg-white/[0.02]' : 'border-gray-200 hover:border-gray-300 bg-white',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0',
            checked ? 'bg-violet-600 border-violet-600 text-white' : isDark ? 'border-white/[0.25]' : 'border-gray-300',
          )}
        >
          {checked && <Check size={11} strokeWidth={3} />}
        </span>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('text-sm font-semibold', heading(isDark))}>
              {m.code && <span className="font-mono">{m.code}</span>}
              {m.code && m.name && <span className={muted(isDark)}> · </span>}
              {m.name ?? (!m.code && `#${m.id}`)}
            </span>
            <Pill isDark={isDark} tone={PROGRESS_TONE[m.progress]}>{m.statusLabel ?? t(`slotBooking.todayTab.progress.${m.progress}`)}</Pill>
            {suggested && (
              <Pill isDark={isDark} tone="violet">
                <Sparkles size={10} /> {t('slotBooking.todayTab.dialog.suggested')}
              </Pill>
            )}
            {linkedHere && <Pill isDark={isDark} tone="green">{t('slotBooking.todayTab.dialog.linkedHere')}</Pill>}
            {linkedElsewhere && <Pill isDark={isDark} tone="amber">{t('slotBooking.todayTab.dialog.linkedElsewhere', { slot: m.linkedSlotLabel })}</Pill>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-1.5">
            {fields
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <div className={cn('text-[10px] uppercase tracking-wider font-medium', muted(isDark))}>{label}</div>
                  <div className={cn('text-xs truncate', isDark ? 'text-gray-200' : 'text-gray-700')}>{value}</div>
                </div>
              ))}
          </div>

          {m.location && (
            <div className={cn('text-[11px] flex items-center gap-1', muted(isDark))}>
              <MapPin size={11} className="shrink-0" /> <span className="truncate">{m.location}</span>
            </div>
          )}
          {(m.description || m.notes) && (
            <div className={cn('text-[11px] leading-relaxed rounded-lg px-2.5 py-1.5 line-clamp-3', isDark ? 'bg-white/[0.03] text-gray-300' : 'bg-gray-50 text-gray-600')}>
              {m.description}
              {m.description && m.notes && <br />}
              {m.notes && <span className="italic">{m.notes}</span>}
            </div>
          )}
          {clientMismatch && <p className="text-[11px] text-amber-500">{t('slotBooking.todayTab.dialog.clientMismatch')}</p>}
          {aborted && <p className="text-[11px] text-red-500">{t('slotBooking.todayTab.dialog.abortedHint')}</p>}
        </div>
      </div>
    </button>
  );
}
