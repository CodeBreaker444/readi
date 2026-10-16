'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { EventNotifyContact } from '@/config/types/event-logbook';
import { cn } from '@/lib/utils';
import { ChevronDown, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  contacts: EventNotifyContact[];
  value: number[];
  onChange: (ids: number[]) => void;
  isDark: boolean;
}

const MAX_VISIBLE = 5;

/** Multi-select dropdown of contact-book entries emailed about an event. */
export function NotifyDropdown({ contacts, value, onChange, isDark }: Props) {
  const { t } = useTranslation();
  const w = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.wizard.${key}`, opts);
  const [search, setSearch] = useState('');

  const selected = contacts.filter((c) => value.includes(c.contact_id));
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => [c.name, c.company ?? '', c.email].join(' ').toLowerCase().includes(q));
  }, [contacts, search]);
  // Selected contacts first so they never get hidden behind the cut-off.
  const shown = useMemo(
    () => [...matches].sort((a, b) => Number(value.includes(b.contact_id)) - Number(value.includes(a.contact_id))).slice(0, MAX_VISIBLE),
    [matches, value],
  );

  if (contacts.length === 0) {
    return <span className="text-xs text-slate-500 dark:text-slate-400">{w('notifyNoContacts')}</span>;
  }

  const summary =
    selected.length === 0
      ? w('notifyNone')
      : selected.length <= 2
        ? selected.map((c) => c.name).join(', ')
        : `${selected.slice(0, 2).map((c) => c.name).join(', ')} +${selected.length - 2}`;

  const toggle = (id: number, checked: boolean) => onChange(checked ? [...new Set([...value, id])] : value.filter((x) => x !== id));

  return (
    <Popover onOpenChange={(o) => !o && setSearch('')}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-sm',
            isDark ? 'border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
          )}
        >
          <span className={cn('truncate', selected.length === 0 && 'text-slate-500 dark:text-slate-400')}>{summary}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        avoidCollisions={false}
        className={cn(
          'w-[var(--radix-popover-trigger-width)] min-w-64 max-h-[min(22rem,var(--radix-popover-content-available-height))] overflow-y-auto p-2',
          isDark ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800',
        )}
      >
        <p className="mb-1.5 px-1 text-[11px] text-slate-500 dark:text-slate-400">{w('notifyHint', { count: value.length })}</p>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            className={cn('h-8 pl-8 text-xs', isDark ? 'border-slate-700 bg-slate-800/60 text-slate-200' : 'border-slate-200 bg-white text-slate-800')}
            value={search}
            placeholder={w('notifySearch')}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ul className="space-y-0.5">
          {shown.map((c) => (
            <li key={c.contact_id}>
              <label className={cn('flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm', isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}>
                <Checkbox checked={value.includes(c.contact_id)} onCheckedChange={(v) => toggle(c.contact_id, v === true)} />
                <span className="min-w-0 flex-1 truncate">
                  {c.name}
                  {c.company && <span className="text-xs text-slate-500 dark:text-slate-400"> · {c.company}</span>}
                  <span className="text-xs text-slate-500 dark:text-slate-400"> · {c.email}</span>
                </span>
              </label>
            </li>
          ))}
          {matches.length === 0 && <li className="px-2 py-3 text-center text-xs text-slate-500 dark:text-slate-400">{t('logbooks.eventLogbook.noResults')}</li>}
        </ul>
        {matches.length > MAX_VISIBLE && (
          <p className="mt-1.5 px-1 text-[11px] text-slate-500 dark:text-slate-400">{w('notifyMore', { count: matches.length - MAX_VISIBLE })}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
