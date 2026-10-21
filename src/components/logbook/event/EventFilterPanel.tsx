'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  droneComponentLine,
  formatDroneLabel,
  formatMissionLabel,
  type EventDroneOption,
  type EventMissionOption,
} from '@/config/types/event-logbook';
import { useMemo } from 'react';
import { droneItem, PagedSelect, type PagedSelectItem } from './PagedSelect';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { eventUi } from './event-ui';
import { useEventTypes } from './useEventTypes';

export const FILTER_ALL = '__all__';

export interface EventFilters {
  tool: string;
  mission: string;
  type: string;
  from: string;
  to: string;
}
export const EMPTY_EVENT_FILTERS: EventFilters = { tool: FILTER_ALL, mission: FILTER_ALL, type: FILTER_ALL, from: '', to: '' };

interface Props {
  filters: EventFilters;
  onChange: (filters: EventFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  isDark: boolean;
  /** Omit for views where drone/mission filters make no sense (e.g. the client portal). */
  drones?: EventDroneOption[];
  missions?: EventMissionOption[];
}

export function EventFilterPanel({ filters, onChange, onSearch, onReset, isDark, drones, missions = [] }: Props) {
  const { t } = useTranslation();
  const ui = eventUi(isDark);
  const e = (key: string) => t(`logbooks.eventLogbook.${key}`);
  const { types: eventTypes } = useEventTypes();
  const filterMissions = useMemo(
    () => (filters.tool === FILTER_ALL ? missions : missions.filter((m) => String(m.fk_tool_id) === filters.tool)),
    [missions, filters.tool],
  );

  const droneItems = useMemo<PagedSelectItem[]>(
    () => (drones ?? []).map((d) => droneItem(d, droneComponentLine(d), formatDroneLabel(d))),
    [drones],
  );
  const typeItems = useMemo<PagedSelectItem[]>(
    () => eventTypes.map((x) => ({ value: x.type_code, label: x.client_name ? `${x.type_name} · ${x.client_name}` : x.type_name })),
    [eventTypes],
  );
  const missionItems = useMemo<PagedSelectItem[]>(
    () =>
      filterMissions.map((m) => ({
        value: String(m.pilot_mission_id),
        label: formatMissionLabel(m, m.pilot_mission_id),
        sublabel: m.scheduled_start ? new Date(m.scheduled_start).toLocaleDateString() : null,
        searchText: `${m.mission_code ?? ''} ${m.mission_name ?? ''}`,
      })),
    [filterMissions],
  );

  const trigger = cn('h-8 w-full text-xs', ui.input);
  const field = (label: string, control: React.ReactNode) => (
    <div className="space-y-1.5">
      <Label className={ui.label}>{label}</Label>
      {control}
    </div>
  );

  return (
    <div className={cn('grid grid-cols-2 items-end gap-3 rounded-xl border p-4 sm:grid-cols-3 lg:grid-cols-6', ui.card)}>
      {drones &&
        field(
          e('drone'),
          <PagedSelect
            isDark={isDark}
            items={droneItems}
            value={filters.tool}
            placeholder={e('all')}
            clearLabel={e('all')}
            clearValue={FILTER_ALL}
            className={cn('h-8 text-xs', ui.input)}
            onChange={(v) => onChange({ ...filters, tool: v, mission: FILTER_ALL })}
          />,
        )}
      {drones &&
        field(
          e('mission'),
          <PagedSelect
            isDark={isDark}
            items={missionItems}
            value={filters.mission}
            placeholder={e('all')}
            clearLabel={e('all')}
            clearValue={FILTER_ALL}
            className={cn('h-8 text-xs', ui.input)}
            onChange={(v) => onChange({ ...filters, mission: v })}
          />,
        )}
      {field(
        e('eventType'),
        <PagedSelect
          isDark={isDark}
          items={typeItems}
          value={filters.type}
          placeholder={e('all')}
          clearLabel={e('all')}
          clearValue={FILTER_ALL}
          className={cn('h-8 text-xs', ui.input)}
          onChange={(v) => onChange({ ...filters, type: v })}
        />,
      )}
      {field(
        e('from'),
        <Input
          type="date"
          value={filters.from}
          onChange={(ev) => onChange({ ...filters, from: ev.target.value })}
          className={cn('h-8 text-xs', ui.input)}
        />,
      )}
      {field(
        e('to'),
        <Input
          type="date"
          value={filters.to}
          onChange={(ev) => onChange({ ...filters, to: ev.target.value })}
          className={cn('h-8 text-xs', ui.input)}
        />,
      )}
      <div className="flex gap-2">
        <Button size="sm" className="h-8 bg-violet-600 text-xs text-white hover:bg-violet-700" onClick={onSearch}>
          {e('search')}
        </Button>
        <Button size="sm" variant="outline" className={cn('h-8 text-xs', ui.outlineBtn)} onClick={onReset}>
          {e('reset')}
        </Button>
      </div>
    </div>
  );
}
