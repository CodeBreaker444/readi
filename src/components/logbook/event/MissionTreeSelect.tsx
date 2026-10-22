'use client';

import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatMissionLabel, type EventMissionOption } from '@/config/types/event-logbook';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, ChevronRight, Map as MapIcon, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  /** Active missions of the chosen system. */
  missions: EventMissionOption[];
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
  disabled?: boolean;
  placeholder: string;
  clearLabel: string;
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'violet' | 'emerald' | 'slate' | 'amber' }) {
  const tones = {
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
  return <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium leading-none', tones[tone])}>{children}</span>;
}

const STATUS_TONE = { PLANNED: 'amber', IN_PROGRESS: 'emerald', COMPLETED: 'slate', CANCELLED: 'slate', ABORTED: 'slate' } as const;

export function MissionBadges({ mission }: { mission: EventMissionOption }) {
  const { t } = useTranslation();
  const statusLabel = mission.status_code ? t(`logbooks.eventLogbook.wizard.status.${mission.status_code}`) : mission.status_name;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {mission.operation_type && <Badge tone="violet">{mission.operation_type}</Badge>}
      {statusLabel && <Badge tone={mission.status_code ? STATUS_TONE[mission.status_code] : 'slate'}>{statusLabel}</Badge>}
      {mission.category && <Badge tone="slate">{mission.category}</Badge>}
      {mission.client && <Badge tone="slate">{mission.client.client_name}</Badge>}
      {mission.scheduled_start && <Badge tone="slate">{new Date(mission.scheduled_start).toLocaleDateString()}</Badge>}
    </span>
  );
}

/** Active missions, each with its mission plan nested underneath when it has one. */
export function MissionTreeSelect({ missions, value, onChange, isDark, disabled, placeholder, clearLabel }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return missions;
    return missions.filter((m) =>
      [m.mission_code, m.mission_name, m.operation_type, m.status_name, m.status_code && t(`logbooks.eventLogbook.wizard.status.${m.status_code}`), m.category, m.client?.client_name, m.plan?.code, m.plan?.description]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [missions, query, t]);

  const selected = missions.find((m) => String(m.pilot_mission_id) === value);
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const rowBase = cn('flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm', isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100');

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };
  const toggle = (id: number) =>
    setCollapsed((cur) => {
      const next = new Set(cur);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex min-h-9 w-full items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50',
            isDark ? 'border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
          )}
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className={cn('truncate', !selected && muted)}>{selected ? formatMissionLabel(selected, selected.pilot_mission_id) : placeholder}</span>
            {selected && <MissionBadges mission={selected} />}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        avoidCollisions={false}
        className={cn(
          'w-[var(--radix-popover-trigger-width)] min-w-72 max-h-[min(26rem,var(--radix-popover-content-available-height))] overflow-y-auto p-2',
          isDark ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800',
        )}
      >
        <div className="relative mb-2">
          <Search className={cn('absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2', muted)} />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('logbooks.eventLogbook.searchOptions')}
            className={cn('h-8 pl-8 text-xs', isDark ? 'border-slate-700 bg-slate-800/60 text-slate-200' : 'border-slate-200 bg-white text-slate-800')}
          />
        </div>
        <p className={cn('mb-1 px-2 text-[11px]', muted)}>{t('logbooks.eventLogbook.wizard.activeOnly')}</p>

        <ul role="tree" className="space-y-0.5">
          {!query && (
            <li>
              <button type="button" role="treeitem" className={rowBase} onClick={() => pick('')}>
                <span className="flex-1">{clearLabel}</span>
                {value === '' && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
              </button>
            </li>
          )}
          {filtered.map((m) => {
            const id = String(m.pilot_mission_id);
            const isOpen = !collapsed.has(m.pilot_mission_id);
            return (
              <li key={id}>
                <div className="flex items-start">
                  {m.plan ? (
                    <button
                      type="button"
                      aria-label={isOpen ? 'Collapse' : 'Expand'}
                      onClick={() => toggle(m.pilot_mission_id)}
                      className={cn('mt-1.5 rounded p-0.5', isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}
                    >
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                  ) : (
                    <span className="w-5 shrink-0" />
                  )}
                  <button type="button" role="treeitem" aria-selected={value === id} className={rowBase} onClick={() => pick(id)}>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate font-medium">{formatMissionLabel(m, m.pilot_mission_id)}</span>
                      <MissionBadges mission={m} />
                    </span>
                    {value === id && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
                  </button>
                </div>
                {m.plan && isOpen && (
                  <button
                    type="button"
                    role="treeitem"
                    className={cn(rowBase, 'ml-7 w-[calc(100%-1.75rem)] border-l-2 border-amber-400 pl-3')}
                    onClick={() => pick(id)}
                  >
                    <MapIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-xs">
                        {t('logbooks.eventLogbook.wizard.missionPlan')}
                        {m.plan.code ? ` · ${m.plan.code}` : ''}
                      </span>
                      <span className={cn('truncate text-[11px]', muted)}>
                        {m.plan.waypoints.length > 0
                          ? t('logbooks.eventLogbook.wizard.planWaypoints', { count: m.plan.waypoints.length })
                          : t('logbooks.eventLogbook.wizard.planNoArea')}
                      </span>
                    </span>
                  </button>
                )}
              </li>
            );
          })}
          {filtered.length === 0 && <li className={cn('px-2 py-3 text-center text-xs', muted)}>{t('logbooks.eventLogbook.wizard.noActiveMissions')}</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
