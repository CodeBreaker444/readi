'use client';

import LocationPicker from '@/components/system/LocationPicker';
import { MissionBadges, MissionTreeSelect } from './MissionTreeSelect';
import { NotifyDropdown } from './NotifyDropdown';
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
  type EventNotifyContact,
  type EventType,
} from '@/config/types/event-logbook';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { CheckCircle2, FileText, Info, Loader2, Map as MapIcon, UploadCloud, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  mode?: 'event' | 'setup';
  onOpenChange: (open: boolean) => void;
  drones: EventDroneOption[];
  missions: EventMissionOption[];
  contacts: EventNotifyContact[];
  /** Default contact ids per client id, used to pre-fill the recipients. */
  defaultContacts: Record<number, number[]>;
  isDark: boolean;
  onCreated: (eventId: number) => void;
}

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string | null;
}

/** What stays the same for every event of one mission; set once, then each event only needs a type and a location. */
interface MissionSetup {
  toolId: string;
  missionId: string;
  takeoff: string;
  notifyIds: number[];
  /** Once the pilot edits the recipients, changing the system/mission no longer overwrites them. */
  notifyTouched: boolean;
}

const SETUP_STORAGE_KEY = 'readi.eventLogbook.missionSetup.v1';
const SETUP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const emptySetup = (): MissionSetup => ({ toolId: '', missionId: '', takeoff: toLocalInputValue(new Date()), notifyIds: [], notifyTouched: false });

function readStoredSetup(): MissionSetup | null {
  try {
    const raw = localStorage.getItem(SETUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MissionSetup> & { savedAt?: number };
    if (!parsed.savedAt || Date.now() - parsed.savedAt > SETUP_MAX_AGE_MS) return null;
    return {
      toolId: String(parsed.toolId ?? ''),
      missionId: String(parsed.missionId ?? ''),
      takeoff: String(parsed.takeoff ?? ''),
      notifyIds: Array.isArray(parsed.notifyIds) ? parsed.notifyIds.filter((n): n is number => typeof n === 'number') : [],
      notifyTouched: parsed.notifyTouched === true,
    };
  } catch {
    return null;
  }
}

function writeStoredSetup(setup: MissionSetup) {
  try {
    localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify({ ...setup, savedAt: Date.now() }));
  } catch {
    // Storage may be unavailable (private mode); the setup then only lives for this page view.
  }
}

export function AddEventWizard({ open, mode = 'event', onOpenChange, drones, missions, contacts, defaultContacts, isDark, onCreated }: Props) {
  const { t } = useTranslation();
  const w = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.wizard.${key}`, opts);

  const [view, setView] = useState<'setup' | 'event'>('setup');
  const [setup, setSetup] = useState<MissionSetup | null>(null);
  const [draft, setDraft] = useState<MissionSetup>(emptySetup);
  const initialised = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const filesRef = useRef<PendingFile[]>([]);
  filesRef.current = files;

  const resetEvent = useCallback(() => {
    filesRef.current.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
    setDone(false);
    setLat('');
    setLng('');
    setLocationLabel('');
    setEventType('');
    setNotes('');
    setFiles([]);
  }, []);

  const activeMissionsFor = useCallback(
    (toolId: string) => missions.filter((m) => String(m.fk_tool_id) === toolId),
    [missions],
  );

  const isSetupValid = useCallback(
    (s: MissionSetup | null): s is MissionSetup => {
      if (!s || !drones.some((d) => String(d.tool_id) === s.toolId)) return false;
      if (!s.takeoff || Number.isNaN(Date.parse(s.takeoff))) return false;
      return !s.missionId || activeMissionsFor(s.toolId).some((m) => String(m.pilot_mission_id) === s.missionId);
    },
    [drones, activeMissionsFor],
  );

  // Open: reuse the stored setup if it still applies, otherwise start with the setup screen.
  useEffect(() => {
    if (!open) {
      initialised.current = false;
      resetEvent();
      return;
    }
    if (initialised.current || drones.length === 0) return;
    initialised.current = true;

    const stored = readStoredSetup();
    if (isSetupValid(stored)) {
      setSetup(stored);
      setDraft(stored);
      setView(mode === 'setup' ? 'setup' : 'event');
      return;
    }
    setSetup(null);
    setView('setup');
    const fresh = emptySetup();
    // A single available system needs no choosing.
    setDraft(drones.length === 1 ? { ...fresh, toolId: String(drones[0].tool_id) } : fresh);
  }, [open, mode, drones, isSetupValid, resetEvent]);

  const droneItems = useMemo<PagedSelectItem[]>(
    () => drones.map((d) => droneItem(d, droneComponentLine(d), formatDroneLabel(d))),
    [drones],
  );

  const current = view === 'setup' ? draft : (setup ?? draft);
  const selectedDrone = drones.find((d) => String(d.tool_id) === current.toolId);
  const toolMissions = useMemo(() => activeMissionsFor(current.toolId), [activeMissionsFor, current.toolId]);
  const selectedMission = toolMissions.find((m) => String(m.pilot_mission_id) === current.missionId);
  // Same rule as the server: the mission's client, else the system's assigned client.
  const reportClientId = (selectedMission?.client ?? selectedDrone?.assigned_client ?? null)?.client_id ?? null;

  // Pre-fill the recipients with the client's default contacts.
  useEffect(() => {
    if (view !== 'setup' || draft.notifyTouched) return;
    const known = new Set(contacts.map((c) => c.contact_id));
    const ids = reportClientId ? (defaultContacts[reportClientId] ?? []).filter((id) => known.has(id)) : [];
    setDraft((d) => (d.notifyTouched ? d : { ...d, notifyIds: ids }));
  }, [view, reportClientId, defaultContacts, contacts, draft.notifyTouched]);

  const planArea = selectedMission?.plan && selectedMission.plan.waypoints.length >= 2 ? selectedMission.plan.waypoints : null;
  const focus = selectedDrone?.latitude != null && selectedDrone?.longitude != null ? { lat: selectedDrone.latitude, lng: selectedDrone.longitude } : null;

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const hasLocation = lat !== '' && lng !== '' && Number.isFinite(latNum) && Number.isFinite(lngNum);

  const canSaveSetup = isSetupValid(draft);
  const canSubmit = !!setup && !!eventType && hasLocation && !submitting;

  const saveSetup = () => {
    if (!isSetupValid(draft)) return;
    setSetup(draft);
    writeStoredSetup(draft);
    if (mode === 'setup') {
      // Opened from the page's Mission setup button: saving is the whole job.
      toast.success(w('setupSaved'));
      onOpenChange(false);
      return;
    }
    setView('event');
  };

  const setNotify = (ids: number[]) => {
    if (!setup) return;
    const next = { ...setup, notifyIds: ids, notifyTouched: true };
    setSetup(next);
    writeStoredSetup(next);
  };

  const addFiles = (list: FileList | File[]) => {
    const accepted: PendingFile[] = [];
    for (const file of Array.from(list)) {
      if (!EVENT_ATTACHMENT_ALLOWED_TYPES.includes(file.type) || file.size > EVENT_ATTACHMENT_MAX_BYTES) {
        toast.error(w('fileRejected', { name: file.name }));
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
    if (!setup || !eventType || !hasLocation) return;
    setSubmitting(true);
    try {
      const attachments = await uploadAll();
      const res = await axios.post('/api/logbooks/event/create', {
        tool_id: Number(setup.toolId),
        mission_id: setup.missionId ? Number(setup.missionId) : null,
        event_type: eventType,
        takeoff_time: new Date(setup.takeoff).toISOString(),
        latitude: latNum,
        longitude: lngNum,
        location_label: locationLabel || null,
        notes: notes.trim() || null,
        notify_contact_ids: setup.notifyIds,
        attachments,
      });
      setDone(true);
      onCreated(res.data.event_id);
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? w('submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const fieldCls = 'border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200';
  const faint = 'text-slate-500 dark:text-slate-400';

  const title = done ? w('successTitle') : view === 'setup' ? w('setupTitle') : w('title');

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <p className={cn('text-sm', faint)}>{w('successText')}</p>
            <div className="flex w-full flex-col gap-2 sm:w-64">
              <Button className="bg-violet-600 text-white hover:bg-violet-700" onClick={resetEvent}>
                {w('addAnother')}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {w('viewLogbook')}
              </Button>
            </div>
          </div>
        ) : view === 'setup' ? (
          <>
            <div className={cn('flex gap-2 rounded-lg p-3 text-xs', isDark ? 'bg-slate-800' : 'bg-slate-100')}>
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <p className={faint}>{w('setupHint')}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>
                  {w('system')} <span className="text-red-500">*</span>
                </Label>
                <PagedSelect
                  isDark={isDark}
                  items={droneItems}
                  value={draft.toolId}
                  placeholder={w('chooseDrone')}
                  onChange={(v) => setDraft((d) => ({ ...d, toolId: v, missionId: '' }))}
                />
                {drones.length === 0 && <p className="text-xs text-amber-600">{w('noDrones')}</p>}
                {selectedDrone && (
                  <p className={cn('text-xs', faint)}>
                    {selectedDrone.latitude != null
                      ? w('systemBase', { name: selectedDrone.location_name ?? `${selectedDrone.latitude.toFixed(4)}, ${selectedDrone.longitude?.toFixed(4)}` })
                      : w('systemNoBase')}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>{t('logbooks.eventLogbook.missionOptional')}</Label>
                <MissionTreeSelect
                  isDark={isDark}
                  missions={toolMissions}
                  value={draft.missionId}
                  disabled={!draft.toolId}
                  placeholder={w('chooseMission')}
                  clearLabel={w('chooseMission')}
                  onChange={(id) => {
                    const m = toolMissions.find((x) => String(x.pilot_mission_id) === id);
                    setDraft((d) => ({
                      ...d,
                      missionId: id,
                      takeoff: m?.scheduled_start ? toLocalInputValue(new Date(m.scheduled_start)) : d.takeoff,
                    }));
                  }}
                />
                {selectedMission?.plan && (
                  <p className="flex items-center gap-1 text-xs text-amber-600">
                    <MapIcon className="h-3.5 w-3.5" />
                    {w('planWillBeShown')}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>
                  {w('takeoffTime')} <span className="text-red-500">*</span>
                </Label>
                <Input className={fieldCls} type="datetime-local" value={draft.takeoff} onChange={(e) => setDraft((d) => ({ ...d, takeoff: e.target.value }))} />
                <p className={cn('text-xs', faint)}>{w('takeoffHint')}</p>
              </div>

              <div className="space-y-1.5">
                <Label>{w('notify')}</Label>
                <NotifyDropdown
                  isDark={isDark}
                  contacts={contacts}
                  value={draft.notifyIds}
                  onChange={(ids) => setDraft((d) => ({ ...d, notifyIds: ids, notifyTouched: true }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {w('cancel')}
              </Button>
              <Button className="bg-violet-600 text-white hover:bg-violet-700" disabled={!canSaveSetup} onClick={saveSetup}>
                {w('saveSetup')}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Read-only: pre-filled from the mission setup, which is edited from the page's Mission setup button. */}
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{w('setupTitle')}</p>
              <dl className="grid grid-cols-[90px_1fr] items-start gap-x-3 gap-y-2 text-sm">
                <dt className={faint}>{w('system')}</dt>
                <dd className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    {selectedDrone ? formatDroneLabel(selectedDrone) : '—'}
                    {selectedDrone && droneComponentLine(selectedDrone) && <span className={cn('block text-xs', faint)}>{droneComponentLine(selectedDrone)}</span>}
                  </span>
                </dd>

                <dt className={faint}>{t('logbooks.eventLogbook.mission')}</dt>
                <dd className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 flex-col gap-1">
                    {selectedMission ? (
                      <>
                        <span className="truncate">{formatMissionLabel(selectedMission, selectedMission.pilot_mission_id)}</span>
                        <MissionBadges mission={selectedMission} />
                        {selectedMission.plan && (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <MapIcon className="h-3 w-3" />
                            {w('missionPlan')}
                            {selectedMission.plan.code ? ` · ${selectedMission.plan.code}` : ''}
                          </span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </span>
                </dd>

                <dt className={faint}>{w('takeoffTime')}</dt>
                <dd className="flex items-start justify-between gap-2">
                  <span>{current.takeoff ? new Date(current.takeoff).toLocaleString() : '—'}</span>
                </dd>

                <dt className={cn(faint, 'pt-2')}>{w('notify')}</dt>
                <dd>
                  <NotifyDropdown isDark={isDark} contacts={contacts} value={current.notifyIds} onChange={setNotify} />
                </dd>
              </dl>
            </div>

            <div className="space-y-1.5">
              <Label>
                {t('logbooks.eventLogbook.eventType')} <span className="text-red-500">*</span>
              </Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                <SelectTrigger className={cn('w-full', fieldCls)}>
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

            {/* Map and attachments side by side on wide screens. */}
            <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>
                {w('location')} <span className="text-red-500">*</span>
              </Label>
              <p className={cn('text-xs lg:min-h-8', faint)}>{planArea ? w('locationHintPlan') : w('locationHint')}</p>
              <LocationPicker
                lat={lat}
                lng={lng}
                isDark={isDark}
                focus={focus}
                area={planArea}
                height={300}
                onChange={(la, ln, label) => {
                  setLat(la);
                  setLng(ln);
                  // A label only comes with a search result; dropping a pin elsewhere invalidates it.
                  setLocationLabel(label ?? '');
                }}
              />
              {hasLocation && (
                <p className={cn('text-xs', faint)}>
                  {latNum.toFixed(4)}, {lngNum.toFixed(4)}
                  {locationLabel ? ` — ${locationLabel}` : ''}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('logbooks.eventLogbook.columns.attachments')}</Label>
              <p className={cn('text-xs lg:min-h-8', faint)}>{w('attachmentsHint')}</p>
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
  'flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors lg:h-[344px]',
                  dragging ? 'border-violet-500 bg-violet-500/10' : 'border-slate-300 hover:border-violet-400 dark:border-slate-600',
                )}
              >
                <UploadCloud className={cn('h-8 w-8 shrink-0', faint)} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {w('dropHere')} <span className="text-xs font-normal text-violet-600">{w('orBrowse')}</span>
                  </p>
                  <p className={cn('text-[11px]', faint)}>{w('supported')}</p>
                </div>
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
                    <li key={f.id} className="relative h-20 w-24 overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                      {f.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.previewUrl} alt={f.file.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-1 p-1 text-center">
                          <FileText className={cn('h-6 w-6', faint)} />
                          <span className="line-clamp-2 break-all text-[10px]">{f.file.name}</span>
                        </div>
                      )}
                      <button type="button" aria-label="Remove" onClick={() => removeFile(f.id)} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            </div>

            <div className="space-y-1.5">
              <Label>{w('notes')}</Label>
              <Textarea className={fieldCls} rows={3} maxLength={EVENT_NOTES_MAX} value={notes} placeholder={w('notesPlaceholder')} onChange={(e) => setNotes(e.target.value)} />
              <p className={cn('text-right text-[11px]', faint)}>
                {notes.length}/{EVENT_NOTES_MAX}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
              <Button variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
                {w('cancel')}
              </Button>
              <Button className="bg-violet-600 text-white hover:bg-violet-700" disabled={!canSubmit} onClick={submit}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    {files.length ? w('uploading') : w('submit')}
                  </>
                ) : (
                  w('submit')
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
