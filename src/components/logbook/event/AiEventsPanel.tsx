'use client';

import { TablePagination } from '@/components/tables/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { AiCompanyOption, AiEventItem } from '@/config/types/ai-event';
import { cn } from '@/lib/utils';
import { getCoreRowModel, useReactTable, type PaginationState } from '@tanstack/react-table';
import axios from 'axios';
import { Eye, ImageOff, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AiEventDeleteDialog } from './AiEventDeleteDialog';
import { AiEventDetail } from './AiEventDetail';
import { AiEventThumb } from './AiEventThumb';
import { eventUi } from './event-ui';
import type { AiEventStatus } from '@/config/types/ai-event';

interface Props {
  isDark: boolean;
  refreshKey: number;
}

const PAGE_SIZE = 8;

const PAGER_COLUMNS = [{ id: 'search', accessorFn: (e: AiEventItem) => e.ai_event_id }];

const STATUS_STYLE: Record<AiEventStatus, string> = {
  open: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
  acknowledged: 'border-sky-500/30 bg-sky-500/10 text-sky-600',
  resolved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
};

export function AiEventsPanel({ isDark, refreshKey }: Props) {
  const { t } = useTranslation();
  const a = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.ai.${key}`, opts);
  const ui = eventUi(isDark);

  const [stream, setStream] = useState('');
  const [eventType, setEventType] = useState('');
  const [status, setStatus] = useState('all');
  const [company, setCompany] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [rows, setRows] = useState<AiEventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [companies, setCompanies] = useState<AiCompanyOption[]>([]);
  const [isAll, setIsAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AiEventItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiEventItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (p: number, size = pagination.pageSize) => {
      setLoading(true);
      try {
        const res = await axios.post('/api/logbooks/event/ai/list', {
          page: p,
          page_size: size,
          stream_id: stream.trim() || undefined,
          event_type: eventType.trim() || undefined,
          status: status === 'all' ? undefined : status,
          company: company === 'all' || company === 'unclaimed' ? company : Number(company),
          date_start: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
          date_end: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
        });
        setRows(res.data.data ?? []);
        setTotal(res.data.total ?? 0);
        setCompanies(res.data.companies ?? []);
        setIsAll(res.data.scope === 'all');
        setPagination({ pageIndex: p - 1, pageSize: size });
      } catch (err: any) {
        toast.error(err?.response?.data?.error ?? a('loadError'));
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
     
    [stream, eventType, status, company, from, to, pagination.pageSize],
  );

  useEffect(() => {
    load(1);
     
  }, [refreshKey]);

  const table = useReactTable({
    data: rows,
    columns: PAGER_COLUMNS,
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pagination.pageSize)),
    state: { pagination },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      // A new page size starts again from the first page.
      const pageIndex = next.pageSize !== pagination.pageSize ? 0 : next.pageIndex;
      load(pageIndex + 1, next.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  const fmtTime = (iso: string) => new Date(iso).toLocaleString();

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/logbooks/event/ai/${deleteTarget.ai_event_id}`);
      toast.success(a('deleteSuccess'));
      if (detail?.ai_event_id === deleteTarget.ai_event_id) setDetail(null);
      setDeleteTarget(null);
      // Deleting the last row of a page would leave it empty: go back one page.
      await load(rows.length === 1 && pagination.pageIndex > 0 ? pagination.pageIndex : pagination.pageIndex + 1);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? a('deleteError'));
      if (err?.response?.status === 404) {
        setDeleteTarget(null);
        await load(pagination.pageIndex + 1);
      }
    } finally {
      setDeleting(false);
    }
  };

  const companyBadge = (e: AiEventItem) =>
    e.claimed ? (
      <span className={ui.text}>{e.company_name ?? '—'}</span>
    ) : (
      <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-600">{a('unclaimed')}</Badge>
    );

  const statusBadge = (e: AiEventItem) => <Badge className={STATUS_STYLE[e.status]}>{a(`status_${e.status}`)}</Badge>;

  useEffect(() => {
    setDetail((d) => (d ? (rows.find((r) => r.ai_event_id === d.ai_event_id) ?? d) : d));
  }, [rows]);

  const linkBadge = (e: AiEventItem) =>
    e.linked ? (
      <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600">{a('linked')}</Badge>
    ) : (
      <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-600">{a('notLinked')}</Badge>
    );

  const headers = [
    a('time'),
    a('event'),
    a('stream'),
    a('detected'),
    a('confidence'),
    a('snapshot'),
    ...(isAll ? [a('company')] : []),
    a('client'),
    a('link'),
    a('email'),
    a('status'),
    '',
  ];

  return (
    <div className="space-y-4">
      <div className={cn('flex flex-wrap items-end gap-3 rounded-xl border p-3', ui.card)}>
        <div className="space-y-1">
          <div className={ui.label}>{a('stream')}</div>
          <div className="relative w-52">
            <Search className={cn('absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2', ui.faint)} />
            <Input
              value={stream}
              onChange={(ev) => setStream(ev.target.value)}
              onKeyDown={(ev) => ev.key === 'Enter' && load(1)}
              placeholder={a('streamPlaceholder')}
              className={cn('h-8 pl-8 text-xs', ui.input)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className={ui.label}>{a('eventType')}</div>
          <div className="relative w-52">
            <Search className={cn('absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2', ui.faint)} />
            <Input
              value={eventType}
              onChange={(ev) => setEventType(ev.target.value)}
              onKeyDown={(ev) => ev.key === 'Enter' && load(1)}
              placeholder={a('eventTypePlaceholder')}
              className={cn('h-8 pl-8 text-xs', ui.input)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className={ui.label}>{a('status')}</div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className={cn('h-8 w-40 text-xs', ui.input)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={ui.selectContent}>
              <SelectItem value="all">{a('statusAll')}</SelectItem>
              {(['open', 'acknowledged', 'resolved'] as const).map((s) => (
                <SelectItem key={s} value={s}>
                  {a(`status_${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isAll && (
          <div className="space-y-1">
            <div className={ui.label}>{a('company')}</div>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger className={cn('h-8 w-52 text-xs', ui.input)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={ui.selectContent}>
                <SelectItem value="all">{a('companyAll')}</SelectItem>
                <SelectItem value="unclaimed">{a('companyUnclaimed')}</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.owner_id} value={String(c.owner_id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <div className={ui.label}>{a('from')}</div>
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(ev) => {
              const v = ev.target.value;
              setFrom(v);
              if (v && to && v > to) setTo(v);
            }}
            className={cn('h-8 w-40 text-xs', ui.input)}
          />
        </div>
        <div className="space-y-1">
          <div className={ui.label}>{a('to')}</div>
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(ev) => {
              const v = ev.target.value;
              setTo(v);
              if (v && from && v < from) setFrom(v);
            }}
            className={cn('h-8 w-40 text-xs', ui.input)}
          />
        </div>
        <Button size="sm" className="h-8 bg-violet-600 text-xs text-white hover:bg-violet-700" disabled={loading} onClick={() => load(1)}>
          {a('search')}
        </Button>
      </div>

      <div className={cn('overflow-hidden rounded-xl border', ui.card)}>
        <div className={cn('border-b px-4 py-3 text-xs', ui.divider)}>
          <span className={cn('font-semibold', ui.text)}>{total}</span>
          <span className={ui.faint}> {a('eventsFound')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={cn('border-b text-left', ui.divider)}>
                {headers.map((h, i) => (
                  <th key={i} className={cn('px-4 py-2', ui.label)}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: pagination.pageSize }).map((_, i) => (
                  <tr key={i} className={cn('border-b', ui.rowBorder)}>
                    <td colSpan={headers.length} className="px-4 py-3">
                      <Skeleton className={cn('h-5 w-full', isDark ? 'bg-slate-800' : 'bg-slate-200')} />
                    </td>
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={headers.length} className={cn('px-4 py-10 text-center', ui.muted)}>
                    {isAll ? a('empty') : a('emptyCompany')}
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((e) => (
                  <tr key={e.ai_event_id} className={cn('cursor-pointer border-b', ui.rowBorder, ui.rowHover)} onClick={() => setDetail(e)}>
                    <td className={cn('whitespace-nowrap px-4 py-2', ui.text)}>{fmtTime(e.event_time)}</td>
                    <td className={cn('px-4 py-2 font-medium', ui.text)}>{e.event_label}</td>
                    <td className={cn('px-4 py-2', ui.text)}>{e.stream_id}</td>
                    <td className={cn('px-4 py-2', ui.muted)}>
                      {e.class_name ?? '—'}
                      {e.detections.length > 1 && <span className={ui.faint}> {a('moreDetections', { count: e.detections.length - 1 })}</span>}
                    </td>
                    <td className={cn('px-4 py-2', ui.muted)}>{e.confidence != null ? `${Math.round(e.confidence * 100)}%` : '—'}</td>
                    <td className="px-4 py-2">
                      <AiEventThumb
                        url={e.snapshot_url}
                        fallback={
                          <span className={cn('inline-flex items-center gap-1', ui.faint)}>
                            <ImageOff className="h-3.5 w-3.5" />
                            {a(`snapshot_${e.snapshot_url ? 'failed' : e.snapshot_status}`)}
                          </span>
                        }
                      />
                    </td>
                    {isAll && <td className="px-4 py-2">{companyBadge(e)}</td>}
                    <td className={cn('px-4 py-2', ui.muted)}>{e.client_name ?? '—'}</td>
                    <td className="px-4 py-2">{linkBadge(e)}</td>
                    <td className={cn('px-4 py-2', ui.muted)}>{a(`notify_${e.notify_status}`)}</td>
                    <td className="px-4 py-2">{statusBadge(e)}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <Eye className={cn('h-4 w-4', ui.muted)} />
                        <button
                          type="button"
                          aria-label={a('delete')}
                          title={a('delete')}
                          className="text-red-500 hover:text-red-600"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setDeleteTarget(e);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && total > PAGE_SIZE && <TablePagination table={table} />}

      <AiEventDetail event={detail} onClose={() => setDetail(null)} isDark={isDark} showCompany={isAll} companyBadge={companyBadge} linkBadge={linkBadge} statusBadge={statusBadge} onActed={() => load(pagination.pageIndex + 1)} onDelete={setDeleteTarget} />

      <AiEventDeleteDialog target={deleteTarget} deleting={deleting} isDark={isDark} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}
