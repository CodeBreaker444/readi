'use client';

import { TablePagination } from '@/components/tables/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import type { AiCompanyOption, AiEventItem } from '@/config/types/ai-event';
import { cn } from '@/lib/utils';
import { getCoreRowModel, useReactTable, type PaginationState } from '@tanstack/react-table';
import axios from 'axios';
import { Eye, ImageOff, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { eventUi } from './event-ui';

interface Props {
  isDark: boolean;
  refreshKey: number;
}

const PAGE_SIZE = 8;

const PAGER_COLUMNS = [{ id: 'search', accessorFn: (e: AiEventItem) => e.ai_event_id }];

export function AiEventsPanel({ isDark, refreshKey }: Props) {
  const { t } = useTranslation();
  const a = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.ai.${key}`, opts);
  const ui = eventUi(isDark);

  const [stream, setStream] = useState('');
  const [eventType, setEventType] = useState('');
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

  const load = useCallback(
    async (p: number, size = pagination.pageSize) => {
      setLoading(true);
      try {
        const res = await axios.post('/api/logbooks/event/ai/list', {
          page: p,
          page_size: size,
          stream_id: stream.trim() || undefined,
          event_type: eventType.trim() || undefined,
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
     
    [stream, eventType, company, from, to, pagination.pageSize],
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

  const companyBadge = (e: AiEventItem) =>
    e.claimed ? (
      <span className={ui.text}>{e.company_name ?? '—'}</span>
    ) : (
      <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-600">{a('unclaimed')}</Badge>
    );

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
                Array.from({ length: 5 }).map((_, i) => (
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
                      {e.snapshot_url ? (
                         
                        <img src={e.snapshot_url} alt="" className="h-10 w-16 rounded object-cover" />
                      ) : (
                        <span className={cn('inline-flex items-center gap-1', ui.faint)}>
                          <ImageOff className="h-3.5 w-3.5" />
                          {a(`snapshot_${e.snapshot_status}`)}
                        </span>
                      )}
                    </td>
                    {isAll && <td className="px-4 py-2">{companyBadge(e)}</td>}
                    <td className={cn('px-4 py-2', ui.muted)}>{e.client_name ?? '—'}</td>
                    <td className="px-4 py-2">{linkBadge(e)}</td>
                    <td className={cn('px-4 py-2', ui.muted)}>{a(`notify_${e.notify_status}`)}</td>
                    <td className="px-4 py-2">
                      <Eye className={cn('h-4 w-4', ui.muted)} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && total > PAGE_SIZE && <TablePagination table={table} />}

      <AiEventDetail event={detail} onClose={() => setDetail(null)} isDark={isDark} showCompany={isAll} companyBadge={companyBadge} linkBadge={linkBadge} />
    </div>
  );
}

type ImageView = 'processed' | 'original';

function AiEventDetail({
  event,
  onClose,
  isDark,
  showCompany,
  companyBadge,
  linkBadge,
}: {
  event: AiEventItem | null;
  onClose: () => void;
  isDark: boolean;
  showCompany: boolean;
  companyBadge: (e: AiEventItem) => React.ReactNode;
  linkBadge: (e: AiEventItem) => React.ReactNode;
}) {
  const { t } = useTranslation();
  const a = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.ai.${key}`, opts);
  const ui = eventUi(isDark);
  const [view, setView] = useState<ImageView>('original');
  const [showPredictions, setShowPredictions] = useState(true);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    setView(event.original_url ? 'original' : 'processed');
    setShowPredictions(true);
    setFailedSrc(null);
  }, [event?.ai_event_id]);

  const fields: [string, React.ReactNode][] = event
    ? [
        [a('event'), event.event_label],
        [a('time'), new Date(event.event_time).toLocaleString()],
        [a('stream'), event.stream_id],
        ...(showCompany ? ([[a('company'), companyBadge(event)]] as [string, React.ReactNode][]) : []),
        [a('client'), event.client_name ?? '—'],
        [a('link'), linkBadge(event)],
        [a('detected'), event.class_name ?? '—'],
        [a('confidence'), event.confidence != null ? `${(event.confidence * 100).toFixed(1)}%` : '—'],
        [a('track'), event.track_id ?? '—'],
        [a('session'), event.session_id],
        [a('frame'), event.frame_number ?? '—'],
        [a('framesDetected'), event.frames_detected ?? '—'],
        [a('processingTime'), event.processing_time_ms != null ? `${event.processing_time_ms} ms` : '—'],
        [a('modelMode'), event.model_mode ?? '—'],
        [a('email'), a(`notify_${event.notify_status}`)],
        ...(event.notified_emails.length ? ([[a('sentTo'), event.notified_emails.join(', ')]] as [string, React.ReactNode][]) : []),
      ]
    : [];

  // The original frame has nothing drawn on it, so the boxes are drawn here from the detections.
  // The AI-processed image already carries the model's own drawing.
  const showOriginal = view === 'original' && !!event?.original_url;
  const src = showOriginal ? event?.original_url : (event?.snapshot_url ?? event?.original_url);
  const size = event?.original_size;
  const drawBoxes = showOriginal && showPredictions && !!size && (event?.detections.length ?? 0) > 0;

  return (
    <Dialog open={!!event} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={cn('max-h-[90vh] max-w-3xl overflow-y-auto', ui.dialog)}>
        <DialogHeader>
          <DialogTitle>{event?.event_label}</DialogTitle>
        </DialogHeader>
        {event && (
          <div className="space-y-4">
            {event.snapshot_url && event.original_url && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1">
                  {(['original', 'processed'] as const).map((v) => (
                    <Button
                      key={v}
                      size="sm"
                      variant={view === v ? 'default' : 'outline'}
                      className={cn('h-7 text-xs', view === v ? 'bg-violet-600 text-white hover:bg-violet-700' : ui.outlineBtn)}
                      onClick={() => setView(v)}
                    >
                      {a(v === 'processed' ? 'viewProcessed' : 'viewOriginal')}
                    </Button>
                  ))}
                </div>
                {showOriginal && event.detections.length > 0 && (
                  <label className={cn('flex cursor-pointer items-center gap-2 text-xs', ui.muted)}>
                    <Switch checked={showPredictions} onCheckedChange={setShowPredictions} />
                    {a('showPredictions')}
                  </label>
                )}
              </div>
            )}
            {src ? (
              <div className="space-y-1.5">
                <div className="relative overflow-hidden rounded-lg border">
                  {}
                  <img src={src} alt="" className="block w-full" />
                  {drawBoxes && size && (
                    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none">
                      {event.detections.map((d, i) => {
                        const main = d.track_id === event.track_id;
                        const color = main ? '#ef4444' : '#f59e0b';
                        const [x1, y1, x2, y2] = d.bounding_box;
                        const stroke = Math.max(2, size.width / 300);
                        const fs = Math.max(12, size.width / 55);
                        const label = `${d.class_name} ${Math.round(d.confidence * 100)}%`;
                        const labelW = label.length * fs * 0.6 + fs * 0.8;
                        const labelH = fs * 1.5;
                        // Above the box; inside it when the box touches the top edge.
                        const ly = y1 - labelH >= 0 ? y1 - labelH : y1;
                        return (
                          <g key={i}>
                            <rect x={x1} y={y1} width={Math.max(0, x2 - x1)} height={Math.max(0, y2 - y1)} fill="none" stroke={color} strokeWidth={stroke} />
                            <rect x={x1} y={ly} width={labelW} height={labelH} fill={color} />
                            <text x={x1 + fs * 0.4} y={ly + labelH * 0.72} fill="#fff" fontSize={fs} fontWeight={600} fontFamily="sans-serif">
                              {label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
                {drawBoxes && (
                  <div className={cn('flex flex-wrap gap-x-4 text-[11px]', ui.faint)}>
                    <span>
                      <span className="mr-1 text-red-500">■</span>
                      {a('legendMain')}
                    </span>
                    {event.detections.some((d) => d.track_id !== event.track_id) && (
                      <span>
                        <span className="mr-1 text-amber-500">■</span>
                        {a('legendOthers')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={cn('flex items-center gap-2 rounded-lg border p-4 text-xs', ui.panel, ui.muted)}>
                <ImageOff className="h-4 w-4" />
                {a(`snapshot_${event.snapshot_status}`)}
              </div>
            )}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
              {fields.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b pb-1">
                  <dt className={ui.muted}>{k}</dt>
                  <dd className={cn('break-all text-right font-medium', ui.text)}>{v}</dd>
                </div>
              ))}
            </dl>
            {event.detections.length > 0 && (
              <div className="space-y-1.5">
                <div className={ui.label}>{a('detections')}</div>
                <div className={cn('overflow-hidden rounded-lg border', ui.divider)}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={cn('border-b text-left', ui.divider)}>
                        {[a('track'), a('detected'), a('confidence')].map((h) => (
                          <th key={h} className={cn('px-3 py-1.5', ui.label)}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {event.detections.map((d, i) => (
                        <tr key={i} className={cn('border-b last:border-0', ui.rowBorder, d.track_id === event.track_id && 'font-semibold')}>
                          <td className={cn('px-3 py-1.5', ui.text)}>
                            {d.track_id}
                            {d.track_id === event.track_id && <span className="ml-1 text-red-500">●</span>}
                          </td>
                          <td className={cn('px-3 py-1.5', ui.text)}>{d.class_name}</td>
                          <td className={cn('px-3 py-1.5', ui.muted)}>{(d.confidence * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
