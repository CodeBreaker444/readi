'use client';

import { EVENT_TYPE_COLORS } from '@/components/tables/AuditLogsTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { SlotAuditRow } from '@/config/types/slot-booking';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { ChevronDown, ChevronLeft, ChevronRight, FilterX, RefreshCw } from 'lucide-react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { apiMsg, Btn, card, ErrorBlock, heading, muted, useSlotI18n } from './ui';

const ENTITIES = ['slot_group', 'slot', 'slot_booking'];
const EVENTS = ['CREATE', 'UPDATE', 'DELETE'];
const PAGE_SIZE = 10;

export function SlotAuditTable({ isDark, groupId, compact }: { isDark: boolean; groupId?: number; compact?: boolean }) {
  const s = useSlotI18n();
  const { t } = s;
  const [rows, setRows] = useState<SlotAuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventType, setEventType] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/operation/slot-booking/audit', {
        params: {
          page,
          page_size: PAGE_SIZE,
          event_type: eventType || undefined,
          entity_type: entityType || undefined,
          group_id: groupId,
          date_from: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
          date_to: dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : undefined,
        },
      });
      setRows(res.data.data.data);
      setTotal(res.data.data.total);
    } catch (e) {
      setError(apiMsg(e, t('slotBooking.errors.loadAudit')));
    } finally {
      setLoading(false);
    }
  }, [page, eventType, entityType, dateFrom, dateTo, groupId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(eventType || entityType || dateFrom || dateTo);
  const clearFilters = () => {
    setEventType('');
    setEntityType('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };
  const th = cn('text-left text-[11px] font-semibold uppercase tracking-wider px-4 py-2.5 whitespace-nowrap', muted(isDark));
  const td = cn('px-4 py-3 text-xs align-top', isDark ? 'text-gray-200' : 'text-gray-700');

  const metaLabel = (key: string) => t(`slotBooking.audit.meta.${key}`, { defaultValue: key });
  const metaValue = (v: unknown): string => {
    if (v == null) return '—';
    if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
    if (typeof v === 'object') return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k}: ${String(x)}`).join(' · ');
    if (typeof v === 'boolean') return v ? t('slotBooking.common.yes') : t('slotBooking.common.no');
    return String(v);
  };

  return (
    <div className={cn('rounded-xl border', card(isDark))}>
      <div className={cn('flex flex-wrap items-end gap-2 p-3 border-b', isDark ? 'border-white/[0.06]' : 'border-gray-100')}>
        <h3 className={cn('text-xs font-semibold mr-auto', heading(isDark))}>{compact ? t('slotBooking.audit.titleCompact') : t('slotBooking.audit.title')}</h3>
        <Select value={eventType || 'all'} onValueChange={(v) => { setEventType(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="h-8 text-xs bg-transparent border-white/[0.08] w-40" aria-label={t('slotBooking.audit.event')}>
            <SelectValue placeholder={t('slotBooking.audit.allEvents')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('slotBooking.audit.allEvents')}</SelectItem>
            {EVENTS.map((k) => (
              <SelectItem key={k} value={k}>{t(`slotBooking.audit.events.${k}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entityType || 'all'} onValueChange={(v) => { setEntityType(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="h-8 text-xs bg-transparent border-white/[0.08] w-44" aria-label={t('slotBooking.audit.section')}>
            <SelectValue placeholder={t('slotBooking.audit.allSections')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('slotBooking.audit.allSections')}</SelectItem>
            {ENTITIES.map((k) => (
              <SelectItem key={k} value={k}>{t(`slotBooking.audit.sections.${k}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" className="h-8 text-xs bg-transparent border-white/[0.08] w-36" value={dateFrom} max={dateTo || undefined} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} aria-label={t('slotBooking.audit.fromDate')} />
        <Input type="date" className="h-8 text-xs bg-transparent border-white/[0.08] w-36" value={dateTo} min={dateFrom || undefined} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} aria-label={t('slotBooking.audit.toDate')} />
        {hasFilters && <Btn isDark={isDark} onClick={clearFilters}><FilterX size={12} /> {t('slotBooking.audit.clear')}</Btn>}
        <Btn isDark={isDark} onClick={load} disabled={loading}><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {t('slotBooking.audit.refresh')}</Btn>
      </div>

      {error ? (
        <div className="p-4"><ErrorBlock isDark={isDark} message={error} onRetry={load} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className={isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}>
              <tr>
                <th className={cn(th, 'w-8')} />
                <th className={th}>{t('slotBooking.audit.time')}</th>
                <th className={th}>{t('slotBooking.audit.event')}</th>
                <th className={th}>{t('slotBooking.audit.section')}</th>
                <th className={th}>{t('slotBooking.audit.description')}</th>
                <th className={th}>{t('slotBooking.audit.user')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={cn('border-t', isDark ? 'border-white/[0.05]' : 'border-gray-100')}>
                    <td colSpan={6} className="px-4 py-3"><Skeleton className={cn('h-5 w-full', isDark && 'bg-white/[0.06]')} /></td>
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className={cn(td, 'text-center py-10', muted(isDark))}>
                    {hasFilters ? t('slotBooking.audit.emptyFiltered') : t('slotBooking.audit.empty')}
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const expanded = open === r.id;
                const meta = Object.entries(r.metadata ?? {}).filter(([, v]) => v !== null && v !== undefined);
                return (
                  <Fragment key={r.id}>
                    <tr
                      className={cn('border-t cursor-pointer', isDark ? 'border-white/[0.05] hover:bg-white/[0.02]' : 'border-gray-100 hover:bg-gray-50/70')}
                      onClick={() => setOpen(expanded ? null : r.id)}
                    >
                      <td className={cn(td, 'pr-0')}>
                        {meta.length > 0 && (expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
                      </td>
                      <td className={cn(td, 'whitespace-nowrap')}>
                        <div className="font-medium">{s.auditDay(r.created_at)}</div>
                        <div className={cn('text-[10px]', muted(isDark))}>{s.auditTime(r.created_at)}</div>
                      </td>
                      <td className={td}>
                        <span className={cn('inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium', EVENT_TYPE_COLORS[r.event_type])}>
                          {t(`slotBooking.audit.events.${r.event_type}`, { defaultValue: r.event_type })}
                        </span>
                      </td>
                      <td className={cn(td, 'whitespace-nowrap')}>{t(`slotBooking.audit.sections.${r.entity_type}`, { defaultValue: r.entity_type })}</td>
                      <td className={cn(td, 'max-w-[420px]')}>{r.description}</td>
                      <td className={cn(td, 'whitespace-nowrap')}>
                        <div>{r.user_name ?? t('slotBooking.audit.system')}</div>
                        {r.user_role && <div className={cn('text-[10px]', muted(isDark))}>{r.user_role}</div>}
                      </td>
                    </tr>
                    {expanded && meta.length > 0 && (
                      <tr className={isDark ? 'bg-white/[0.02]' : 'bg-gray-50/60'}>
                        <td />
                        <td colSpan={5} className="px-4 py-3">
                          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
                            {meta.map(([k, v]) => (
                              <div key={k} className="text-[11px]">
                                <dt className={muted(isDark)}>{metaLabel(k)}</dt>
                                <dd className={cn('font-medium break-words', heading(isDark))}>{metaValue(v)}</dd>
                              </div>
                            ))}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={cn('flex items-center justify-between px-4 py-2.5 border-t text-xs', muted(isDark), isDark ? 'border-white/[0.06]' : 'border-gray-100')}>
        <span>{t('slotBooking.audit.entries', { count: total })}</span>
        <div className="flex items-center gap-2">
          <Btn isDark={isDark} disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={12} /></Btn>
          <span>{t('slotBooking.audit.pageOf', { page, pages })}</span>
          <Btn isDark={isDark} disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}><ChevronRight size={12} /></Btn>
        </div>
      </div>
    </div>
  );
}
