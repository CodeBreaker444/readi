'use client';

import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface PagedSelectItem {
  value: string;
  /** Main line, also shown in the closed trigger. */
  label: string;
  /** Secondary line under the label (e.g. the primary drone component). */
  sublabel?: string | null;
  /** Extra text matched by the search box. */
  searchText?: string;
  disabled?: boolean;
}

interface Props {
  items: PagedSelectItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isDark: boolean;
  disabled?: boolean;
  pageSize?: number;
  /** Optional first entry that is always visible and not paginated (e.g. "All" / "No mission"). */
  clearLabel?: string;
  clearValue?: string;
  className?: string;
  /** Show every match in one list that scrolls on its own (search box stays fixed) instead of paging. */
  scrollable?: boolean;
}

export function PagedSelect({
  items,
  value,
  onChange,
  placeholder,
  isDark,
  disabled,
  pageSize = 8,
  clearLabel,
  clearValue = '',
  className,
  scrollable = false,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.label} ${i.sublabel ?? ''} ${i.searchText ?? ''}`.toLowerCase().includes(q));
  }, [items, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = scrollable ? filtered : filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  useEffect(() => setPage(0), [query, items]);
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  // Rows can differ in height (sublabels), so keep the tallest page seen: paging then never resizes the list.
  const listRef = useRef<HTMLUListElement>(null);
  const [minHeight, setMinHeight] = useState(0);
  useEffect(() => setMinHeight(0), [open, query, items]);
  useLayoutEffect(() => {
    const h = listRef.current?.offsetHeight ?? 0;
    if (!scrollable && filtered.length > pageSize && h > minHeight) setMinHeight(h);
  }, [safePage, filtered.length, pageSize, minHeight, open]);

  const selected = items.find((i) => i.value === value);
  const triggerText = selected ? (selected.sublabel ? `${selected.label} – ${selected.sublabel}` : selected.label) : (value === clearValue && clearLabel ? clearLabel : null);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const rowBase = cn(
    'flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100',
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50',
            isDark
              ? 'border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800'
              : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
            className,
          )}
        >
          <span className={cn('truncate', !triggerText && muted)}>{triggerText ?? placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        // Always open downwards (never flip above the field); scroll inside when space is short.
        avoidCollisions={false}
        className={cn(
          'w-[var(--radix-popover-trigger-width)] min-w-64 max-h-[min(26rem,var(--radix-popover-content-available-height))] p-2',
          scrollable ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
          isDark ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800',
        )}
      >
        <div className="relative mb-2 shrink-0">
          <Search className={cn('absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2', muted)} />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('logbooks.eventLogbook.searchOptions')}
            className={cn(
              'h-8 pl-8 text-xs',
              isDark ? 'border-slate-700 bg-slate-800/60 text-slate-200' : 'border-slate-200 bg-white text-slate-800',
            )}
          />
        </div>

        <ul
          ref={listRef}
          role="listbox"
          className={cn('space-y-0.5', scrollable && 'min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1')}
          style={minHeight ? { minHeight } : undefined}
        >
          {clearLabel && !query && (
            <li>
              <button type="button" role="option" aria-selected={value === clearValue} className={rowBase} onClick={() => pick(clearValue)}>
                <span className="flex-1">{clearLabel}</span>
                {value === clearValue && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
              </button>
            </li>
          )}
          {pageItems.map((i) => (
            <li key={i.value}>
              <button
                type="button"
                role="option"
                aria-selected={value === i.value}
                disabled={i.disabled}
                className={cn(rowBase, i.disabled && 'cursor-not-allowed opacity-50')}
                onClick={() => pick(i.value)}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{i.label}</span>
                  {i.sublabel && <span className={cn('truncate text-xs', muted)}>{i.sublabel}</span>}
                </span>
                {value === i.value && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className={cn('px-2 py-3 text-center text-xs', muted)}>{t('logbooks.eventLogbook.noResults')}</li>}
        </ul>

        {!scrollable && filtered.length > pageSize && (
          <div
            className={cn(
              'mt-2 flex items-center justify-between gap-2 border-t pt-2 text-xs',
              isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500',
            )}
          >
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className={cn('flex items-center gap-1 rounded px-1.5 py-1 disabled:opacity-40', isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t('operations.newOperation.drone.pagePrevious')}
            </button>
            <span>{t('operations.newOperation.drone.pageIndicator', { current: safePage + 1, total: pageCount })}</span>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              className={cn('flex items-center gap-1 rounded px-1.5 py-1 disabled:opacity-40', isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}
            >
              {t('operations.newOperation.drone.pageNext')}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function droneItem(
  d: { tool_id: number; tool_name: string | null; tool_code: string | null },
  componentLine: string | null,
  label: string,
): PagedSelectItem {
  return {
    value: String(d.tool_id),
    label,
    sublabel: componentLine,
    searchText: `${d.tool_code ?? ''} ${d.tool_name ?? ''}`,
  };
}
