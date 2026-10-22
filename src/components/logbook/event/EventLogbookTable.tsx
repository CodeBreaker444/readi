'use client';

import { TablePagination } from '@/components/tables/Pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { EventLogbookItem } from '@/config/types/event-logbook';
import { cn } from '@/lib/utils';
import { type ColumnDef, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import axios from 'axios';
import { Eye, FileText, Film, Paperclip, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AddSupportMediaDialog } from './AddSupportMediaDialog';
import { eventUi } from './event-ui';
import { isImageMedia, isVideoMedia, isViewableMedia, MediaViewer } from './MediaViewer';

const PAGE_SIZE = 8;

interface Props {
  data: EventLogbookItem[];
  loading: boolean;
  showPilot: boolean;
  isDark: boolean;
  highlightId?: number | null;
  /** Endpoint returning presigned attachment links for an event (differs for the client portal). */
  attachmentsUrl?: (eventId: number) => string;
  /** Opens the event details; also triggered by clicking a row. */
  onView?: (eventId: number) => void;
  /** Shows a plus icon beside each event to add supporting media. */
  canAddMedia?: boolean;
  /** Called after supporting media was added so the list can refresh. */
  onMediaAdded?: () => void;
}

interface AttachmentLink {
  attachment_id: number;
  file_name: string;
  file_type: string | null;
  url: string;
  download_url?: string;
  is_supporting?: boolean;
}

export function EventLogbookTable({
  data,
  loading,
  showPilot,
  isDark,
  highlightId,
  attachmentsUrl = (id) => `/api/logbooks/event/${id}/attachments`,
  onView,
  canAddMedia = false,
  onMediaAdded,
}: Props) {
  const { t } = useTranslation();
  const ui = eventUi(isDark);
  const [globalFilter, setGlobalFilter] = useState('');
  const [viewer, setViewer] = useState<{ event: EventLogbookItem; items: AttachmentLink[] | null } | null>(null);
  const [mediaIndex, setMediaIndex] = useState<number | null>(null);
  const [addMediaFor, setAddMediaFor] = useState<number | null>(null);
  const viewable = useMemo(() => (viewer?.items ?? []).filter(isViewableMedia), [viewer?.items]);

  const c =(key: string) => t(`logbooks.eventLogbook.columns.${key}`);

  // The table model only drives filtering and paging; rows are rendered below.
  const columns = useMemo<ColumnDef<EventLogbookItem>[]>(
    () => [{ id: 'search', accessorFn: (e) => e.event_id }],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, value: string) => {
      const e = row.original;
      const haystack = [
        e.event_id,
        e.event_type_label,
        e.event_type,
        e.tool_name,
        e.mission_name,
        e.pilot_name,
        e.client_name,
        e.location_label,
        e.notes,
        new Date(e.takeoff_time).toLocaleString(),
      ]
        .filter((v) => v != null)
        .join(' ')
        .toLowerCase();
      return haystack.includes(value.trim().toLowerCase());
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const colCount = (showPilot ? 9 : 7) + (onView ? 1 : 0);

  const openAttachments = async (event: EventLogbookItem) => {
    setViewer({ event, items: null });
    try {
      const res = await axios.get(attachmentsUrl(event.event_id));
      setViewer({ event, items: res.data.data });
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? t('logbooks.eventLogbook.loadError'));
      setViewer(null);
    }
  };

  const headers = [
    c('id'),
    c('eventTime'),
    c('drone'),
    c('mission'),
    c('event'),
    ...(showPilot ? [c('pilot'), c('client')] : []),
    c('location'),
    c('attachments'),
    ...(onView ? [c('details')] : []),
  ];

  return (
    <div className={cn('overflow-hidden rounded-xl border transition-colors', ui.card)}>
      <div className={cn('flex items-center justify-between gap-4 border-b px-4 py-3', ui.divider)}>
        {loading ? (
          <Skeleton className={cn('h-4 w-28', isDark ? 'bg-slate-800' : 'bg-slate-200')} />
        ) : (
          <span className="text-xs">
            <span className={cn('font-semibold', ui.text)}>{filteredCount}</span>
            <span className={ui.faint}> {t('logbooks.eventLogbook.eventsFound')}</span>
          </span>
        )}
        <div className="relative w-56">
          <Search className={cn('absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2', ui.faint)} />
          <Input
            placeholder={t('logbooks.eventLogbook.searchPlaceholder')}
            value={globalFilter}
            onChange={(ev) => setGlobalFilter(ev.target.value)}
            disabled={loading}
            className={cn('h-7 pl-8 text-xs', ui.input)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className={cn('border-b', ui.divider)}>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={cn('whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest', ui.faint)}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className={cn('border-b', ui.rowBorder)}>
                  <td colSpan={colCount} className="px-3 py-3">
                    <Skeleton className={cn('h-4 w-full', isDark ? 'bg-slate-800' : 'bg-slate-200')} />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className={cn('py-16 text-center text-xs', ui.faint)}>
                  {t('logbooks.eventLogbook.noEvents')}
                </td>
              </tr>
            ) : (
              rows.map(({ original: e }, i) => (
                <tr
                  key={e.event_id}
                  onClick={onView ? () => onView(e.event_id) : undefined}
                  className={cn(
                    'border-b transition-colors',
                    onView && 'cursor-pointer',
                    ui.rowBorder,
                    ui.rowHover,
                    ui.text,
                    i % 2 !== 0 && (isDark ? 'bg-slate-900/30' : 'bg-slate-50/60'),
                    e.event_id === highlightId && (isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'),
                  )}
                >
                  <td className={cn('px-3 py-2.5', ui.faint)}>{e.event_id}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {new Date(e.takeoff_time).toLocaleString(undefined, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-3 py-2.5">{e.tool_name ?? '—'}</td>
                  <td className="max-w-[240px] truncate px-3 py-2.5" title={e.mission_name ?? undefined}>
                    {e.mission_name ?? '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span title={e.notes ?? undefined}>{e.event_type_label}</span>
                      {canAddMedia && (
                        <button
                          type="button"
                          title={t('logbooks.eventLogbook.supportMedia.add')}
                          aria-label={t('logbooks.eventLogbook.supportMedia.add')}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setAddMediaFor(e.event_id);
                          }}
                          className="rounded-full border border-violet-500/40 p-0.5 text-violet-500 hover:bg-violet-500/10"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </td>
                  {showPilot && <td className="px-3 py-2.5">{e.pilot_name ?? '—'}</td>}
                  {showPilot && <td className="px-3 py-2.5">{e.client_name ?? '—'}</td>}
                  <td className="max-w-[220px] truncate px-3 py-2.5" title={e.location_label ?? undefined}>
                    {e.location_label ??
                      (e.latitude != null && e.longitude != null ? `${e.latitude.toFixed(4)}, ${e.longitude.toFixed(4)}` : '—')}
                  </td>
                  <td className="px-3 py-2.5">
                    {e.attachment_count > 0 ? (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openAttachments(e);
                        }}
                        className="inline-flex items-center gap-1 text-violet-500 hover:underline"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {e.attachment_count}
                      </button>
                    ) : (
                      <span className={ui.faint}>—</span>
                    )}
                  </td>
                  {onView && (
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        title={t('logbooks.eventLogbook.detail.view')}
                        aria-label={t('logbooks.eventLogbook.detail.view')}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onView(e.event_id);
                        }}
                        className="rounded p-1 text-violet-500 hover:bg-violet-500/10"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredCount > PAGE_SIZE && <TablePagination table={table} />}

      <Dialog open={!!viewer} onOpenChange={(v) => !v && setViewer(null)}>
        <DialogContent className={cn('max-h-[85vh] overflow-y-auto sm:max-w-2xl', ui.dialog)}>
          <DialogHeader>
            <DialogTitle>
              #{viewer?.event.event_id} — {c('attachments')}
            </DialogTitle>
          </DialogHeader>
          {viewer?.items == null ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="aspect-square w-full" />
              ))}
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {viewer.items.map((a) => {
                const viewIdx = viewable.findIndex((v) => v.attachment_id === a.attachment_id);
                const tile = (
                  <>
                    {isImageMedia(a) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.url} alt={a.file_name} className="h-28 w-full object-cover" />
                    ) : (
                      <div className={cn('flex h-28 items-center justify-center', isDark ? 'bg-slate-800' : 'bg-slate-100')}>
                        {isVideoMedia(a) ? <Film className={cn('h-7 w-7', ui.faint)} /> : <FileText className={cn('h-7 w-7', ui.faint)} />}
                      </div>
                    )}
                    <p className="truncate px-2 py-1 text-xs">{a.file_name}</p>
                  </>
                );
                return (
                  <li key={a.attachment_id}>
                    {viewIdx >= 0 ? (
                      <button type="button" onClick={() => setMediaIndex(viewIdx)} className={cn('block w-full overflow-hidden rounded-md border text-left', ui.divider)}>
                        {tile}
                      </button>
                    ) : (
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className={cn('block overflow-hidden rounded-md border', ui.divider)}>
                        {tile}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <MediaViewer items={viewable} index={mediaIndex} onIndexChange={setMediaIndex} />
      <AddSupportMediaDialog
        eventId={addMediaFor}
        isDark={isDark}
        onClose={() => setAddMediaFor(null)}
        onAdded={() => onMediaAdded?.()}
      />
    </div>
  );
}
