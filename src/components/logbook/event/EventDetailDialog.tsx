'use client';

import LocationPicker from '@/components/system/LocationPicker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  EVENT_ATTACHMENT_ALLOWED_TYPES,
  EVENT_ATTACHMENT_MAX_BYTES,
  EVENT_ATTACHMENT_MAX_FILES,
  EVENT_NOTES_MAX,
  prettifyEventTypeCode,
  type EventDetail,
  type EventType,
} from '@/config/types/event-logbook';
import { uploadEventFiles } from '@/lib/event-logbook-upload';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Download, ExternalLink, FileText, Loader2, Pencil, Trash2, UploadCloud, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PagedSelect, type PagedSelectItem } from './PagedSelect';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import EventLocationMap from './EventLocationMap';
import { eventUi } from './event-ui';
import { useEventTypes } from './useEventTypes';

interface Props {
  /** Event to show; null keeps the dialog closed. */
  eventId: number | null;
  onClose: () => void;
  /** Called after the event was edited or deleted so the list can refresh. */
  onChanged: () => void;
  isDark: boolean;
  /** Endpoint that returns the event details (differs for the client portal). */
  detailUrl: (eventId: number) => string;
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface NewFile {
  id: string;
  file: File;
}

export function EventDetailDialog({ eventId, onClose, onChanged, isDark, detailUrl }: Props) {
  const { t } = useTranslation();
  const ui = eventUi(isDark);
  const d = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.detail.${key}`, opts);

  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [takeoff, setTakeoff] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [removeIds, setRemoveIds] = useState<number[]>([]);
  const [newFiles, setNewFiles] = useState<NewFile[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (id: number) => {
      setLoading(true);
      try {
        const res = await axios.get(detailUrl(id));
        setDetail(res.data.data);
      } catch (e: any) {
        toast.error(e?.response?.data?.error ?? d('loadError'));
        onClose();
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detailUrl],
  );

  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
    setDetail(null);
    if (eventId != null) load(eventId);
  }, [eventId, load]);

  const startEdit = () => {
    if (!detail) return;
    setEventType(detail.event_type as EventType);
    setTakeoff(toLocalInputValue(new Date(detail.takeoff_time)));
    setLat(detail.latitude != null ? String(detail.latitude) : '');
    setLng(detail.longitude != null ? String(detail.longitude) : '');
    setLocationLabel(detail.location_label ?? '');
    setNotes(detail.notes ?? '');
    setRemoveIds([]);
    setNewFiles([]);
    setEditing(true);
  };

  const keptCount = (detail?.attachments.length ?? 0) - removeIds.length;
  const room = Math.max(0, EVENT_ATTACHMENT_MAX_FILES - keptCount - newFiles.length);

  const addFiles = (list: FileList) => {
    const accepted: NewFile[] = [];
    for (const file of Array.from(list)) {
      if (!EVENT_ATTACHMENT_ALLOWED_TYPES.includes(file.type) || file.size > EVENT_ATTACHMENT_MAX_BYTES) {
        toast.error(t('logbooks.eventLogbook.wizard.fileRejected', { name: file.name }));
        continue;
      }
      accepted.push({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`, file });
    }
    setNewFiles((prev) => [...prev, ...accepted].slice(0, prev.length + room));
  };

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const hasLocation = lat !== '' && lng !== '' && Number.isFinite(latNum) && Number.isFinite(lngNum);
  const canSave = !!eventType && !!takeoff && !Number.isNaN(Date.parse(takeoff)) && hasLocation && !saving;

  const save = async () => {
    if (!detail || !canSave) return;
    setSaving(true);
    try {
      const add_attachments = await uploadEventFiles(newFiles.map((f) => f.file));
      await axios.patch(detailUrl(detail.event_id), {
        event_type: eventType,
        takeoff_time: new Date(takeoff).toISOString(),
        latitude: latNum,
        longitude: lngNum,
        location_label: locationLabel || null,
        notes: notes.trim() || null,
        remove_attachment_ids: removeIds,
        add_attachments,
      });
      toast.success(d('updated'));
      setEditing(false);
      await load(detail.event_id);
      onChanged();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? d('updateError'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!detail) return;
    setDeleting(true);
    try {
      await axios.delete(detailUrl(detail.event_id));
      toast.success(d('deleted'));
      setConfirmDelete(false);
      onChanged();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? d('deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const { types: eventTypes } = useEventTypes();
  // The event's own type stays selectable while editing even if it was deleted from the list since.
  const typeItems = useMemo<PagedSelectItem[]>(() => {
    const items = eventTypes.map((x) => ({ value: x.type_code, label: x.type_name }));
    if (detail && eventTypes.every((x) => x.type_code !== detail.event_type)) {
      items.push({ value: detail.event_type, label: detail.event_type_label || prettifyEventTypeCode(detail.event_type) });
    }
    return items;
  }, [eventTypes, detail]);
  const fieldCls = 'border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200';
  const faint = ui.faint;
  const hasCoords = detail?.latitude != null && detail?.longitude != null;

  const row = (label: string, value: React.ReactNode) => (
    <>
      <dt className={cn('text-xs', faint)}>{label}</dt>
      <dd className="min-w-0 break-words text-sm">{value ?? '—'}</dd>
    </>
  );

  return (
    <>
      <Dialog open={eventId != null} onOpenChange={(v) => !v && !saving && !deleting && onClose()}>
        <DialogContent className={cn('max-h-[90vh] overflow-y-auto sm:max-w-5xl', ui.dialog)}>
          <DialogHeader>
            <DialogTitle>{eventId != null ? d('title', { id: eventId }) : ''}</DialogTitle>
          </DialogHeader>

          {loading || !detail ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : editing ? (
            <>
              <p className={cn('rounded-lg p-2.5 text-xs', isDark ? 'bg-slate-800' : 'bg-slate-100', faint)}>{d('noRenotify')}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    {t('logbooks.eventLogbook.eventType')} <span className="text-red-500">*</span>
                  </Label>
                  <PagedSelect
                    isDark={isDark}
                    items={typeItems}
                    value={eventType}
                    placeholder={t('logbooks.eventLogbook.wizard.chooseType')}
                    onChange={(v) => setEventType(v as EventType)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {t('logbooks.eventLogbook.wizard.takeoffTime')} <span className="text-red-500">*</span>
                  </Label>
                  <Input className={fieldCls} type="datetime-local" value={takeoff} onChange={(e) => setTakeoff(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {t('logbooks.eventLogbook.wizard.location')} <span className="text-red-500">*</span>
                  </Label>
                  <LocationPicker
                    lat={lat}
                    lng={lng}
                    isDark={isDark}
                    area={detail.plan && detail.plan.waypoints.length >= 2 ? detail.plan.waypoints : null}
                    height={260}
                    onChange={(la, ln, label) => {
                      setLat(la);
                      setLng(ln);
                      setLocationLabel(label ?? '');
                    }}
                  />
                  {locationLabel && <p className={cn('text-xs', faint)}>{locationLabel}</p>}
                </div>

                <div className="space-y-2">
                  <Label>{t('logbooks.eventLogbook.columns.attachments')}</Label>
                  <ul className="space-y-1.5">
                    {detail.attachments.map((a) => {
                      const removed = removeIds.includes(a.attachment_id);
                      return (
                        <li key={a.attachment_id} className={cn('flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm', ui.divider, removed && 'opacity-50')}>
                          <FileText className={cn('h-4 w-4 shrink-0', faint)} />
                          <span className={cn('min-w-0 flex-1 truncate', removed && 'line-through')}>{a.file_name}</span>
                          <button
                            type="button"
                            className="text-xs text-violet-600 hover:underline"
                            onClick={() => setRemoveIds((cur) => (removed ? cur.filter((x) => x !== a.attachment_id) : [...cur, a.attachment_id]))}
                          >
                            {removed ? d('undo') : d('remove')}
                          </button>
                        </li>
                      );
                    })}
                    {newFiles.map((f) => (
                      <li key={f.id} className={cn('flex items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-sm', ui.divider)}>
                        <UploadCloud className={cn('h-4 w-4 shrink-0', faint)} />
                        <span className="min-w-0 flex-1 truncate">{f.file.name}</span>
                        <button type="button" aria-label={d('remove')} onClick={() => setNewFiles((cur) => cur.filter((x) => x.id !== f.id))}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    hidden
                    accept={EVENT_ATTACHMENT_ALLOWED_TYPES.join(',')}
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" disabled={room === 0} onClick={() => fileInput.current?.click()} className={ui.outlineBtn}>
                    <UploadCloud className="mr-1.5 h-4 w-4" />
                    {d('addFiles')}
                  </Button>
                  <p className={cn('text-[11px]', faint)}>{t('logbooks.eventLogbook.wizard.supported')}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t('logbooks.eventLogbook.wizard.notes')}</Label>
                <Textarea className={fieldCls} rows={3} maxLength={EVENT_NOTES_MAX} value={notes} onChange={(e) => setNotes(e.target.value)} />
                <p className={cn('text-right text-[11px]', faint)}>
                  {notes.length}/{EVENT_NOTES_MAX}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                <Button variant="outline" disabled={saving} onClick={() => setEditing(false)}>
                  {d('cancel')}
                </Button>
                <Button className="bg-violet-600 text-white hover:bg-violet-700" disabled={!canSave} onClick={save}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      {d('saving')}
                    </>
                  ) : (
                    d('save')
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                <dl className="grid grid-cols-[110px_1fr] content-start gap-x-3 gap-y-2.5">
                  {row(t('logbooks.eventLogbook.eventType'), <span className="font-medium">{detail.event_type_label}</span>)}
                  {row(
                    t('logbooks.eventLogbook.wizard.takeoffTime'),
                    new Date(detail.takeoff_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
                  )}
                  {row(d('reportedAt'), new Date(detail.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))}
                  {row(d('reportedBy'), detail.pilot_name)}
                  {row(
                    t('logbooks.eventLogbook.drone'),
                    <>
                      {detail.tool_name ?? '—'}
                      {detail.tool_code && <span className={cn('block text-xs', faint)}>{detail.tool_code}</span>}
                    </>,
                  )}
                  {row(t('logbooks.eventLogbook.mission'), detail.mission_name)}
                  {row(t('logbooks.eventLogbook.columns.client'), detail.client_name)}
                  {row(
                    t('logbooks.eventLogbook.columns.location'),
                    <>
                      {detail.location_label ?? (hasCoords ? '' : '—')}
                      {hasCoords && (
                        <span className={cn('block text-xs', faint)}>
                          {detail.latitude!.toFixed(6)}, {detail.longitude!.toFixed(6)}
                        </span>
                      )}
                    </>,
                  )}
                  {detail.notify_emails.length > 0 && row(d('notified'), <span className="break-all text-xs">{detail.notify_emails.join(', ')}</span>)}
                  {row(t('logbooks.eventLogbook.wizard.notes').replace(/\s*\(.*\)$/, ''), detail.notes ? <span className="whitespace-pre-wrap">{detail.notes}</span> : '—')}
                </dl>

                <div className="space-y-2">
                  {hasCoords ? (
                    <>
                      <EventLocationMap
                        lat={detail.latitude!}
                        lng={detail.longitude!}
                        area={detail.plan && detail.plan.waypoints.length >= 2 ? detail.plan.waypoints : null}
                        isDark={isDark}
                        height={280}
                      />
                      <div className={cn('flex items-center justify-between text-xs', faint)}>
                        <span>{detail.plan && detail.plan.waypoints.length >= 2 ? d('planArea') : ''}</span>
                        <a
                          href={`https://www.google.com/maps?q=${detail.latitude},${detail.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-violet-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {d('openMap')}
                        </a>
                      </div>
                    </>
                  ) : (
                    <p className={cn('text-sm', faint)}>{d('noLocation')}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className={cn('text-xs font-semibold uppercase tracking-wide', faint)}>
                  {t('logbooks.eventLogbook.columns.attachments')} ({detail.attachments.length})
                </p>
                {detail.attachments.length === 0 ? (
                  <p className={cn('text-sm', faint)}>{d('noAttachments')}</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {detail.attachments.map((a) => (
                      <li key={a.attachment_id} className={cn('overflow-hidden rounded-md border', ui.divider)}>
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                          {a.file_type?.startsWith('image/') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.url} alt={a.file_name} className="h-28 w-full object-cover" />
                          ) : (
                            <div className={cn('flex h-28 items-center justify-center', isDark ? 'bg-slate-800' : 'bg-slate-100')}>
                              <FileText className={cn('h-7 w-7', faint)} />
                            </div>
                          )}
                        </a>
                        <div className="flex items-center gap-1 px-2 py-1">
                          <span className="min-w-0 flex-1 truncate text-xs" title={a.file_name}>
                            {a.file_name}
                          </span>
                          <a href={a.download_url} download={a.file_name} title={d('download')} aria-label={d('download')} className="text-violet-600 hover:text-violet-700">
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                <Button variant="outline" onClick={onClose}>
                  {d('close')}
                </Button>
                {detail.can_edit && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setConfirmDelete(true)}>
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      {d('delete')}
                    </Button>
                    <Button className="bg-violet-600 text-white hover:bg-violet-700" onClick={startEdit}>
                      <Pencil className="mr-1.5 h-4 w-4" />
                      {d('edit')}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={(v) => !deleting && setConfirmDelete(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{d('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{d('deleteText', { id: detail?.event_id })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{d('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : d('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
