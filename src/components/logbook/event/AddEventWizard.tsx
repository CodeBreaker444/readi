'use client';

import LocationPicker from '@/components/system/LocationPicker';
import { droneItem, PagedSelect, type PagedSelectItem } from './PagedSelect';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  EVENT_ATTACHMENT_ALLOWED_TYPES,
  EVENT_ATTACHMENT_MAX_BYTES,
  EVENT_ATTACHMENT_MAX_FILES,
  EVENT_NOTES_MAX,
  EVENT_TYPES,
  droneComponentLine,
  formatDroneLabel,
  formatMissionLabel,
  type EventAttachmentInput,
  type EventDroneOption,
  type EventMissionOption,
  type EventType,
} from '@/config/types/event-logbook';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileText, Info, Loader2, UploadCloud, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drones: EventDroneOption[];
  missions: EventMissionOption[];
  isDark: boolean;
  onCreated: (eventId: number) => void;
}

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string | null;
}

const STEP_KEYS = ['drone', 'location', 'details', 'attachments', 'review'] as const;

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AddEventWizard({ open, onOpenChange, drones, missions, isDark, onCreated }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [toolId, setToolId] = useState('');
  const [missionId, setMissionId] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [takeoff, setTakeoff] = useState(() => toLocalInputValue(new Date()));
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const filesRef = useRef<PendingFile[]>([]);
  filesRef.current = files;

  const reset = useCallback(() => {
    filesRef.current.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
    setStep(1);
    setDone(false);
    setToolId('');
    setMissionId('');
    setLat('');
    setLng('');
    setLocationLabel('');
    setEventType('');
    setTakeoff(toLocalInputValue(new Date()));
    setNotes('');
    setFiles([]);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const toolMissions = useMemo(
    () => missions.filter((m) => String(m.fk_tool_id) === toolId),
    [missions, toolId],
  );

  const droneName = (d: EventDroneOption) => formatDroneLabel(d);
  const missionName = (m: EventMissionOption) => formatMissionLabel(m, m.pilot_mission_id);
  const droneItems = useMemo<PagedSelectItem[]>(
    () => drones.map((d) => droneItem(d, droneComponentLine(d), formatDroneLabel(d))),
    [drones],
  );
  const missionItems = useMemo<PagedSelectItem[]>(
    () =>
      toolMissions.map((m) => ({
        value: String(m.pilot_mission_id),
        label: formatMissionLabel(m, m.pilot_mission_id),
        sublabel: m.scheduled_start ? new Date(m.scheduled_start).toLocaleDateString() : null,
        searchText: `${m.mission_code ?? ''} ${m.mission_name ?? ''}`,
      })),
    [toolMissions],
  );
  const selectedDrone = drones.find((d) => String(d.tool_id) === toolId);
  const selectedMission = toolMissions.find((m) => String(m.pilot_mission_id) === missionId);
  // Same rule as the server: the mission's client, else the system's assigned client.
  const reportClient = selectedMission?.client ?? selectedDrone?.assigned_client ?? null;

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const hasLocation = lat !== '' && lng !== '' && Number.isFinite(latNum) && Number.isFinite(lngNum);

  const canProceed =
    (step === 1 && !!toolId) ||
    (step === 2 && hasLocation) ||
    (step === 3 && !!eventType && !!takeoff && !Number.isNaN(Date.parse(takeoff))) ||
    step === 4 ||
    step === 5;

  const addFiles = (list: FileList | File[]) => {
    const accepted: PendingFile[] = [];
    for (const file of Array.from(list)) {
      if (!EVENT_ATTACHMENT_ALLOWED_TYPES.includes(file.type) || file.size > EVENT_ATTACHMENT_MAX_BYTES) {
        toast.error(t('logbooks.eventLogbook.wizard.fileRejected', { name: file.name }));
        continue;
      }
      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      });
    }
    setFiles((prev) => [...prev, ...accepted].slice(0, EVENT_ATTACHMENT_MAX_FILES));
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const uploadAll = async (): Promise<EventAttachmentInput[]> => {
    const uploaded: EventAttachmentInput[] = [];
    for (const { file } of files) {
      const presign = await axios.post('/api/logbooks/event/presign', {
        file_name: file.name,
        content_type: file.type,
        file_size: file.size,
      });
      await axios.put(presign.data.upload_url, file, { headers: { 'Content-Type': file.type } });
      uploaded.push({ file_name: file.name, file_key: presign.data.file_key, file_type: file.type, file_size: file.size });
    }
    return uploaded;
  };

  const submit = async () => {
    if (!toolId || !eventType || !hasLocation) return;
    setSubmitting(true);
    try {
      const attachments = await uploadAll();
      const res = await axios.post('/api/logbooks/event/create', {
        tool_id: Number(toolId),
        mission_id: missionId ? Number(missionId) : null,
        event_type: eventType,
        takeoff_time: new Date(takeoff).toISOString(),
        latitude: latNum,
        longitude: lngNum,
        location_label: locationLabel || null,
        notes: notes.trim() || null,
        attachments,
      });
      setDone(true);
      onCreated(res.data.event_id);
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? t('logbooks.eventLogbook.wizard.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const w = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.wizard.${key}`, opts);

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle>{done ? w('successTitle') : w('title')}</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{w('successText')}</p>
            <div className="flex w-full flex-col gap-2 sm:w-64">
              <Button className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => onOpenChange(false)}>
                {w('viewLogbook')}
              </Button>
              <Button variant="outline" onClick={reset}>
                {w('addAnother')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ol className="flex items-center gap-1 pb-2">
              {STEP_KEYS.map((key, i) => {
                const n = i + 1;
                const state = n < step ? 'done' : n === step ? 'active' : 'todo';
                return (
                  <li key={key} className="flex flex-1 items-center gap-1 last:flex-none">
                    <span
                      title={w(`steps.${key}`)}
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                        state === 'done' && 'bg-emerald-500 text-white',
                        state === 'active' && 'bg-violet-600 text-white ring-2 ring-violet-300',
                        state === 'todo' && 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
                      )}
                    >
                      {state === 'done' ? <Check className="h-3.5 w-3.5" /> : n}
                    </span>
                    {n < STEP_KEYS.length && <span className={cn('h-px flex-1', n < step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700')} />}
                  </li>
                );
              })}
            </ol>
            <p className="text-sm font-medium">{w(`steps.${STEP_KEYS[step - 1]}`)}</p>

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>
                    {t('logbooks.eventLogbook.drone')} <span className="text-red-500">*</span>
                  </Label>
                  <PagedSelect
                    isDark={isDark}
                    items={droneItems}
                    value={toolId}
                    placeholder={w('chooseDrone')}
                    onChange={(v) => {
                      setToolId(v);
                      setMissionId('');
                    }}
                  />
                  {drones.length === 0 && <p className="text-xs text-amber-600">{w('noDrones')}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>{t('logbooks.eventLogbook.missionOptional')}</Label>
                  <PagedSelect
                    isDark={isDark}
                    items={missionItems}
                    value={missionId}
                    disabled={!toolId}
                    placeholder={w('chooseMission')}
                    clearLabel={w('chooseMission')}
                    onChange={(id) => {
                      setMissionId(id);
                      const m = toolMissions.find((x) => String(x.pilot_mission_id) === id);
                      if (m?.scheduled_start) setTakeoff(toLocalInputValue(new Date(m.scheduled_start)));
                    }}
                  />
                </div>

                <div className={cn('flex gap-2 rounded-lg p-3 text-xs', isDark ? 'bg-slate-800' : 'bg-slate-100')}>
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="font-medium">{w('takeoffRequired')}</p>
                    <p className="text-slate-500 dark:text-slate-400">{w('takeoffHint')}</p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">{w('locationHint')}</p>
                <LocationPicker
                  lat={lat}
                  lng={lng}
                  isDark={isDark}
                  onChange={(la, ln, label) => {
                    setLat(la);
                    setLng(ln);
                    // A label only comes with a search result; dropping a pin elsewhere invalidates it.
                    setLocationLabel(label ?? '');
                  }}
                />
                {hasLocation && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {latNum.toFixed(4)}, {lngNum.toFixed(4)}
                    {locationLabel ? ` — ${locationLabel}` : ''}
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>
                    {t('logbooks.eventLogbook.eventType')} <span className="text-red-500">*</span>
                  </Label>
                  <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                    <SelectTrigger className="w-full border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                      <SelectValue placeholder={w('chooseType')} />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`logbooks.eventLogbook.types.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {w('takeoffTime')} <span className="text-red-500">*</span>
                  </Label>
                  <Input className="border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200" type="datetime-local" value={takeoff} onChange={(e) => setTakeoff(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{w('notes')}</Label>
                  <Textarea className="border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                    rows={4}
                    maxLength={EVENT_NOTES_MAX}
                    value={notes}
                    placeholder={w('notesPlaceholder')}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <p className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                    {notes.length}/{EVENT_NOTES_MAX}
                  </p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInput.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && fileInput.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    addFiles(e.dataTransfer.files);
                  }}
                  className={cn(
                    'flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                    dragging ? 'border-violet-500 bg-violet-500/10' : 'border-slate-300 hover:border-violet-400 dark:border-slate-600',
                  )}
                >
                  <UploadCloud className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                  <p className="text-sm font-medium">{w('dropHere')}</p>
                  <p className="text-xs text-violet-600">{w('orBrowse')}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{w('supported')}</p>
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
                </div>
                {files.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {files.map((f) => (
                      <li key={f.id} className="relative h-20 w-24 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                        {f.previewUrl ? (
                           
                          <img src={f.previewUrl} alt={f.file.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-1 p-1 text-center">
                            <FileText className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                            <span className="line-clamp-2 break-all text-[10px]">{f.file.name}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          aria-label="Remove"
                          onClick={() => removeFile(f.id)}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {step === 5 && (
              <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 text-sm">
                <dt className="text-slate-500 dark:text-slate-400">{t('logbooks.eventLogbook.drone')}</dt>
                <dd>
                  {selectedDrone ? droneName(selectedDrone) : '—'}
                  {selectedDrone && droneComponentLine(selectedDrone) && (
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{droneComponentLine(selectedDrone)}</span>
                  )}
                </dd>
                <dt className="text-slate-500 dark:text-slate-400">{t('logbooks.eventLogbook.mission')}</dt>
                <dd>{selectedMission ? missionName(selectedMission) : '—'}</dd>
                <dt className="text-slate-500 dark:text-slate-400">{t('logbooks.eventLogbook.eventType')}</dt>
                <dd>{eventType ? t(`logbooks.eventLogbook.types.${eventType}`) : '—'}</dd>
                <dt className="text-slate-500 dark:text-slate-400">{w('takeoffTime')}</dt>
                <dd>{takeoff ? new Date(takeoff).toLocaleString() : '—'}</dd>
                <dt className="text-slate-500 dark:text-slate-400">{w('location')}</dt>
                <dd>
                  {hasLocation ? `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}` : '—'}
                  {locationLabel && <span className="block text-xs text-slate-500 dark:text-slate-400">{locationLabel}</span>}
                </dd>
                <dt className="text-slate-500 dark:text-slate-400">{t('logbooks.eventLogbook.columns.attachments')}</dt>
                <dd>{files.length ? w('files', { count: files.length }) : w('noAttachments')}</dd>
                {notes.trim() && (
                  <>
                    <dt className="text-slate-500 dark:text-slate-400">{w('notes').replace(/\s*\(.*\)$/, '')}</dt>
                    <dd className="whitespace-pre-wrap break-words">{notes.trim()}</dd>
                  </>
                )}
                <dt className="text-slate-500 dark:text-slate-400">{w('client')}</dt>
                <dd>
                  {reportClient ? (
                    <div className="space-y-0.5 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                      <p className="font-medium">
                        {reportClient.client_name}
                        {reportClient.client_code && <span className="font-normal text-slate-500 dark:text-slate-400"> · {reportClient.client_code}</span>}
                      </p>
                      {reportClient.legal_name && <p className="text-xs text-slate-500 dark:text-slate-400">{reportClient.legal_name}</p>}
                      {reportClient.address && <p className="text-xs">{reportClient.address}</p>}
                      {reportClient.email && <p className="text-xs">{reportClient.email}</p>}
                      {reportClient.phone && <p className="text-xs">{reportClient.phone}</p>}
                      {reportClient.website && <p className="text-xs">{reportClient.website}</p>}
                    </div>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">{w('noClient')}</span>
                  )}
                </dd>
              </dl>
            )}

            <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => (step === 1 ? onOpenChange(false) : setStep((s) => s - 1))}
              >
                {step === 1 ? (
                  w('cancel')
                ) : (
                  <>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    {w('back')}
                  </>
                )}
              </Button>
              {step < 5 ? (
                <Button
                  className="bg-violet-600 text-white hover:bg-violet-700"
                  disabled={!canProceed}
                  onClick={() => setStep((s) => s + 1)}
                >
                  {w('next')}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button className="bg-violet-600 text-white hover:bg-violet-700" disabled={submitting} onClick={submit}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      {files.length ? w('uploading') : w('submit')}
                    </>
                  ) : (
                    w('submit')
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
