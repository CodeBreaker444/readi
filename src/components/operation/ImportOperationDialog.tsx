'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Operation } from '@/config/types/operation';
import { cn } from '@/lib/utils';
import axios from 'axios';
import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    FileText,
    FileUp,
    Loader2,
    Settings,
    Upload,
    User,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Client        { client_id: number; client_name: string; client_code: string }
interface DroneSystem   { tool_id: number; tool_code: string; tool_name: string }
interface MissionPlan   { mission_planning_id: number; mission_planning_code: string; mission_planning_desc: string }
interface SelectOption  { id: number; name: string }
interface Pilot         { user_id: number; first_name: string; last_name: string }
interface FlytbaseFlight {
    flight_id: string;
    flight_name?: string;
    start_time?: number;
    end_time?: number;
    duration?: number;
    distance?: number;
    drone_name?: string;
}

interface ImportOperationDialogProps {
    open: boolean;
    onClose: () => void;
    onSaved?: (op: Operation) => void;
}

const STEP_KEYS = [
    { id: 1, labelKey: 'client',      icon: User },
    { id: 2, labelKey: 'logFile',     icon: FileUp },
    { id: 3, labelKey: 'missionData', icon: Settings },
    { id: 4, labelKey: 'pilot',       icon: User },
    { id: 5, labelKey: 'confirm',     icon: ClipboardCheck },
];

const PLATFORMS = [{ value: 'FLYTBASE', label: 'Flytbase' }];

export default function ImportOperationDialog({ open, onClose, onSaved }: ImportOperationDialogProps) {
    const { t } = useTranslation();
    const ns = 'operations.importOperation';

    const [step, setStep]             = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [importedIds, setImportedIds] = useState<number[]>([]);
    const [skippedList, setSkippedList] = useState<string[]>([]);

    const [clients,    setClients]    = useState<Client[]>([]);
    const [drones,     setDrones]     = useState<DroneSystem[]>([]);
    const [plans,      setPlans]      = useState<MissionPlan[]>([]);
    const [categories, setCategories] = useState<SelectOption[]>([]);
    const [types,      setTypes]      = useState<SelectOption[]>([]);
    const [statuses,   setStatuses]   = useState<SelectOption[]>([]);
    const [pilots,     setPilots]     = useState<Pilot[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [loadingDrones, setLoadingDrones] = useState(false);
    const [loadingMissionOptions, setLoadingMissionOptions] = useState(false);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [loadingPilots, setLoadingPilots] = useState(false);

    const [clientId,    setClientId]    = useState('');
    const [platform,    setPlatform]    = useState('FLYTBASE');
    const [logFile,     setLogFile]     = useState<File | null>(null);
    const [fbWindow, setFbWindow] = useState('30');
    const [flights, setFlights] = useState<FlytbaseFlight[]>([]);
    const [loadingFlights, setLoadingFlights] = useState(false);
    const [selectedFlightId, setSelectedFlightId] = useState('');
    const [flightsError, setFlightsError] = useState('');
    const [vehicleId,   setVehicleId]   = useState('');
    const [categoryId,  setCategoryId]  = useState('');
    const [typeId,      setTypeId]      = useState('');
    const [planId,      setPlanId]      = useState('N');
    const [statusId,    setStatusId]    = useState('');
    const [location,    setLocation]    = useState('');
    const [groupLabel,  setGroupLabel]  = useState('');
    const [notes,       setNotes]       = useState('');
    const [pilotId,     setPilotId]     = useState('');

    useEffect(() => {
        if (!open) return;
        resetForm();
        setLoadingClients(true);
        axios.get('/api/operation/import/options?type=clients')
            .then((r) => setClients(r.data.clients ?? []))
            .catch(() => toast.error(t(`${ns}.toast.loadClientsError`)))
            .finally(() => setLoadingClients(false));
    }, [open]);

    useEffect(() => {
        if (!clientId) { setDrones([]); setVehicleId(''); return; }
        setDrones([]); setVehicleId(''); setPlans([]); setPlanId('N');
        setLoadingDrones(true);
        axios.get(`/api/operation/import/options?type=drones&client_id=${clientId}`)
            .then((r) => setDrones(r.data.drones ?? []))
            .catch(() => toast.error(t(`${ns}.toast.loadDronesError`)))
            .finally(() => setLoadingDrones(false));
    }, [clientId]);

    useEffect(() => {
        if (step !== 3) return;
        setLoadingMissionOptions(true);
        Promise.all([
            axios.get('/api/operation/import/options?type=categories'),
            axios.get('/api/operation/import/options?type=types'),
            axios.get('/api/operation/import/options?type=statuses'),
        ]).then(([cat, typ, sta]) => {
            setCategories(cat.data.categories ?? []);
            setTypes(typ.data.types ?? []);
            setStatuses(sta.data.statuses ?? []);
        }).catch(() => toast.error(t(`${ns}.toast.loadMissionOptionsError`)))
          .finally(() => setLoadingMissionOptions(false));
    }, [step]);

    useEffect(() => {
        if (!vehicleId || !clientId) { setPlans([]); setPlanId('N'); return; }
        setPlans([]); setPlanId('N');
        setLoadingPlans(true);
        axios.get(`/api/operation/import/options?type=plans&client_id=${clientId}&vehicle_id=${vehicleId}`)
            .then((r) => setPlans(r.data.plans ?? []))
            .catch(() => toast.error(t(`${ns}.toast.loadMissionOptionsError`)))
            .finally(() => setLoadingPlans(false));
    }, [vehicleId, clientId]);

    useEffect(() => {
        if (step !== 4) return;
        setLoadingPilots(true);
        axios.get('/api/operation/import/options?type=pilots')
            .then((r) => setPilots(r.data.pilots ?? []))
            .catch(() => toast.error(t(`${ns}.toast.loadPilotsError`)))
            .finally(() => setLoadingPilots(false));
    }, [step]);

    function resetForm() {
        setStep(1); setImportedIds([]); setSkippedList([]);
        setClientId(''); setPlatform('FLYTBASE'); setLogFile(null);
        setVehicleId(''); setCategoryId(''); setTypeId(''); setPlanId('N');
        setStatusId(''); setLocation(''); setGroupLabel(''); setNotes(''); setPilotId('');
        setFbWindow('30'); setFlights([]); setSelectedFlightId(''); setFlightsError('');
        setDrones([]); setPlans([]); setCategories([]); setTypes([]); setStatuses([]); setPilots([]);
        setLoadingClients(false); setLoadingDrones(false); setLoadingMissionOptions(false); setLoadingPlans(false); setLoadingPilots(false);
    }

    const fetchFlytbaseFlights = useCallback(async () => {
        setLoadingFlights(true);
        setFlights([]);
        setSelectedFlightId('');
        setFlightsError('');
        try {
            const { data } = await axios.get(`/api/flytbase/flights?window=${fbWindow}`);
            if (data.success) {
                const loaded = data.flights ?? [];
                setFlights(loaded);
                if (loaded.length === 0) {
                    setFlightsError(t(`${ns}.toast.noFlightsFound`));
                }
            } else {
                setFlightsError(data.message ?? t(`${ns}.toast.loadFlightsError`));
            }
        } catch (e: any) {
            setFlightsError(e?.response?.data?.message ?? t(`${ns}.toast.loadFlightsError`));
        } finally {
            setLoadingFlights(false);
        }
    }, [fbWindow, ns, t]);

    useEffect(() => {
        if (step !== 2 || platform !== 'FLYTBASE') return;
        fetchFlytbaseFlights();
    }, [step, platform, fetchFlytbaseFlights]);

    const canNext = useCallback(() => {
        if (step === 1) return !!clientId;
        if (step === 2) return !!logFile || !!selectedFlightId;
        if (step === 3) return !!vehicleId && !!categoryId && !!typeId && !!statusId;
        if (step === 4) return !!pilotId;
        return true;
    }, [step, clientId, logFile, vehicleId, categoryId, typeId, statusId, pilotId]);

    async function handleSubmit() {
        if (!logFile && !selectedFlightId) return;
        setSubmitting(true);
        try {
            const fd = new FormData();
            if (logFile) fd.append('mission_file_log', logFile);
            fd.append('client_id',           clientId);
            fd.append('mission_ccPlatform',  platform);
            fd.append('mission_vehicle',     vehicleId);
            fd.append('mission_category',    categoryId);
            fd.append('mission_type',        typeId);
            fd.append('mission_plan',        planId);
            fd.append('mission_status',      statusId);    
            fd.append('mission_location',    location);    
            fd.append('mission_group_label', groupLabel);
            fd.append('mission_notes',       notes);
            fd.append('pilot_id',            pilotId);
            if (selectedFlightId) {
                fd.append('flytbase_flight_id', selectedFlightId);
            }

            const { data } = await axios.post('/api/operation/import', fd);
            if (data.code === 1) {
                setImportedIds(data.newMissionIds ?? []);
                setSkippedList(data.skipped ?? []);
                const imported = data.newMissionIds?.length ?? 0;
                const skipped  = data.skipped?.length ?? 0;
                if (imported > 0) {
                    if (skipped > 0) toast.success(t(`${ns}.toast.importSuccessWithSkipped`, { count: imported, skipped }));
                    else toast.success(t(`${ns}.toast.importSuccess`, { count: imported }));
                } else {
                    toast.warning(t(`${ns}.toast.allDuplicates`, { count: skipped }));
                }
                if (onSaved && data.operations) {
                    data.operations.forEach((op: Operation) => onSaved(op));
                }
            } else {
                toast.error(data.message ?? t(`${ns}.toast.importFailed`));
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? t(`${ns}.toast.importFailed`));
        } finally {
            setSubmitting(false);
        }
    }

    const selectedPilot = pilots.find((p) => String(p.user_id) === pilotId);
    const pilotLabel    = selectedPilot ? `${selectedPilot.first_name} ${selectedPilot.last_name}` : '';
    const statusLabel   = statuses.find((s) => String(s.id) === statusId)?.name ?? '';

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                        <FileUp className="h-5 w-5 text-violet-600" />
                        {t(`${ns}.dialogTitle`)}
                    </DialogTitle>
                </DialogHeader>

                <div className="px-6 pt-4 pb-2">
                    <div className="flex items-center gap-0">
                        {STEP_KEYS.map((s, i) => {
                            const Icon   = s.icon;
                            const done   = step > s.id;
                            const active = step === s.id;
                            return (
                                <div key={s.id} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center gap-1 flex-1">
                                        <div className={cn(
                                            'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                                            done   ? 'bg-emerald-600 text-white'
                                            : active ? 'bg-violet-600 text-white ring-4 ring-violet-100 dark:ring-violet-900'
                                            :          'bg-muted text-muted-foreground'
                                        )}>
                                            {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                        </div>
                                        <span className={cn(
                                            'text-[10px] font-medium whitespace-nowrap',
                                            active ? 'text-violet-600' : done ? 'text-emerald-600' : 'text-muted-foreground'
                                        )}>
                                            {t(`${ns}.steps.${s.labelKey}`)}
                                        </span>
                                    </div>
                                    {i < STEP_KEYS.length - 1 && (
                                        <div className={cn(
                                            'h-0.5 flex-1 mt-[-14px] mx-1 transition-all',
                                            done ? 'bg-emerald-400' : 'bg-muted'
                                        )} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="px-6 py-5 min-h-[240px]">

                    {step === 1 && (
                        <div className="space-y-4">
                            <SectionTitle>{t(`${ns}.sections.clientDetails`)}</SectionTitle>
                            <div className="max-w-xs">
                                <Label className="mb-1.5 block">{t(`${ns}.fields.chooseClient`)}</Label>
                                <Select value={clientId} onValueChange={setClientId} disabled={loadingClients}>
                                    <SelectTrigger>
                                        {loadingClients ? (
                                            <span className="flex items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                                            </span>
                                        ) : <SelectValue placeholder={t(`${ns}.placeholders.selectClient`)} />}
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((c) => (
                                            <SelectItem key={c.client_id} value={String(c.client_id)}>
                                                [{c.client_code}] {c.client_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <SectionTitle>{t(`${ns}.sections.logFile`)}</SectionTitle>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-1.5 block">{t(`${ns}.fields.ccPlatform`)}</Label>
                                    <Select value={platform} onValueChange={setPlatform}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PLATFORMS.map((p) => (
                                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(`${ns}.fields.uploadLogFile`)}</Label>
                                    <div
                                        className={cn(
                                            'relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer',
                                            logFile
                                                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                                                : 'border-muted-foreground/25 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/10'
                                        )}
                                        onClick={() => document.getElementById('log-file-input')?.click()}
                                    >
                                        <input id="log-file-input" type="file" accept=".gutma,.zip" className="hidden"
                                            onChange={(e) => {
                                                setLogFile(e.target.files?.[0] ?? null);
                                                setSelectedFlightId('');
                                            }} />
                                        {logFile ? (
                                            <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400">
                                                <FileText className="h-4 w-4" />
                                                <span className="text-sm font-medium truncate max-w-[140px]">{logFile.name}</span>
                                            </div>
                                        ) : (
                                            <div className="text-muted-foreground">
                                                <Upload className="h-6 w-6 mx-auto mb-1 opacity-50" />
                                                <p className="text-xs">{t(`${ns}.info.clickToUpload`)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-md border p-3 space-y-3">
                                <div className="flex items-end gap-3">
                                    <div className="w-40">
                                        <Label className="mb-1.5 block">{t(`${ns}.fields.flytbaseWindow`)}</Label>
                                        <Select value={fbWindow} onValueChange={setFbWindow}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="30">30 min</SelectItem>
                                                <SelectItem value="120">2 h</SelectItem>
                                                <SelectItem value="360">6 h</SelectItem>
                                                <SelectItem value="720">12 h</SelectItem>
                                                <SelectItem value="1440">24 h</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={fetchFlytbaseFlights} disabled={loadingFlights}>
                                        {loadingFlights ? <Loader2 className="h-4 w-4 animate-spin" /> : t(`${ns}.buttons.refreshFlights`)}
                                    </Button>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(`${ns}.fields.selectFlightLog`)}</Label>
                                    <Select value={selectedFlightId} onValueChange={(value) => {
                                        setSelectedFlightId(value);
                                        setLogFile(null);
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t(`${ns}.placeholders.selectFlightLog`)} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {flights.map((f) => (
                                                <SelectItem key={f.flight_id} value={f.flight_id}>
                                                    {(f.flight_name || f.flight_id)}{f.drone_name ? ` · ${f.drone_name}` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {flightsError && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{flightsError}</p>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {t(`${ns}.info.uploadOrSelectFlight`)}
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-3">
                            <SectionTitle>{t(`${ns}.sections.missionDetails`)}</SectionTitle>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <Label className="mb-1.5 block">{t(`${ns}.fields.droneSystem`)} <span className="text-red-500">*</span></Label>
                                    <Select value={vehicleId} onValueChange={setVehicleId} disabled={loadingDrones}>
                                        <SelectTrigger>
                                            {loadingDrones ? (
                                                <span className="flex items-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                                                </span>
                                            ) : <SelectValue placeholder={t(`${ns}.placeholders.selectDot`)} />}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {drones.map((d) => (
                                                <SelectItem key={d.tool_id} value={String(d.tool_id)}>{d.tool_code}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(`${ns}.fields.missionCategory`)} <span className="text-red-500">*</span></Label>
                                    <Select value={categoryId} onValueChange={setCategoryId} disabled={loadingMissionOptions}>
                                        <SelectTrigger>
                                            {loadingMissionOptions ? (
                                                <span className="flex items-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                                                </span>
                                            ) : <SelectValue placeholder={t(`${ns}.placeholders.selectDot`)} />}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(`${ns}.fields.missionType`)} <span className="text-red-500">*</span></Label>
                                    <Select value={typeId} onValueChange={setTypeId} disabled={loadingMissionOptions}>
                                        <SelectTrigger>
                                            {loadingMissionOptions ? (
                                                <span className="flex items-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                                                </span>
                                            ) : <SelectValue placeholder={t(`${ns}.placeholders.selectDot`)} />}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {types.map((ty) => (
                                                <SelectItem key={ty.id} value={String(ty.id)}>{ty.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <Label className="mb-1.5 block">{t(`${ns}.fields.missionStatus`)} <span className="text-red-500">*</span></Label>
                                    <Select value={statusId} onValueChange={setStatusId} disabled={loadingMissionOptions}>
                                        <SelectTrigger>
                                            {loadingMissionOptions ? (
                                                <span className="flex items-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                                                </span>
                                            ) : <SelectValue placeholder={t(`${ns}.placeholders.selectDot`)} />}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statuses.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">
                                        {t(`${ns}.fields.missionPlan`)}
                                        <span className="ml-1 text-[10px] text-muted-foreground font-normal">{t(`${ns}.fields.optional`)}</span>
                                    </Label>
                                    <Select value={planId} onValueChange={setPlanId} disabled={loadingPlans}>
                                        <SelectTrigger>
                                            {loadingPlans ? (
                                                <span className="flex items-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                                                </span>
                                            ) : <SelectValue placeholder={t(`${ns}.placeholders.selectDot`)} />}
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="N">— {t(`${ns}.info.none`)} —</SelectItem>
                                            {plans.length === 0 ? (
                                                <div className="px-3 py-2 text-xs text-muted-foreground italic">
                                                    {vehicleId ? t(`${ns}.info.noPlansForDrone`) : t(`${ns}.info.selectDroneFirst`)}
                                                </div>
                                            ) : plans.map((p) => (
                                                <SelectItem key={p.mission_planning_id} value={String(p.mission_planning_id)}>
                                                    {p.mission_planning_code}{p.mission_planning_desc ? ` — ${p.mission_planning_desc}` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">
                                        {t(`${ns}.fields.location`)}
                                        <span className="ml-1 text-[10px] text-muted-foreground font-normal">{t(`${ns}.fields.optional`)}</span>
                                    </Label>
                                    <Input value={location} onChange={(e) => setLocation(e.target.value)}
                                        placeholder={t(`${ns}.placeholders.location`)} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="mb-1.5 block">{t(`${ns}.fields.groupLabel`)}
                                        <span className="ml-1 text-[10px] text-muted-foreground font-normal">{t(`${ns}.fields.optional`)}</span>
                                    </Label>
                                    <Input value={groupLabel} onChange={(e) => setGroupLabel(e.target.value)}
                                        placeholder={t(`${ns}.placeholders.groupLabel`)} />
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(`${ns}.fields.notes`)}
                                        <span className="ml-1 text-[10px] text-muted-foreground font-normal">{t(`${ns}.fields.optional`)}</span>
                                    </Label>
                                    <Input value={notes} onChange={(e) => setNotes(e.target.value)}
                                        placeholder={t(`${ns}.placeholders.notes`)} />
                                </div>
                            </div>

                            <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
                                ℹ️ {t(`${ns}.info.gutmaAutoExtract`)}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <SectionTitle>{t(`${ns}.sections.pilotInCommand`)}</SectionTitle>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-1.5 block">{t(`${ns}.fields.pilotInCommand`)} <span className="text-red-500">*</span></Label>
                                    <Select value={pilotId} onValueChange={setPilotId} disabled={loadingPilots}>
                                        <SelectTrigger>
                                            {loadingPilots ? (
                                                <span className="flex items-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                                                </span>
                                            ) : <SelectValue placeholder={t(`${ns}.placeholders.selectPilot`)} />}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pilots.map((p) => (
                                                <SelectItem key={p.user_id} value={String(p.user_id)}>
                                                    {p.first_name} {p.last_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {pilotLabel && (
                                    <div>
                                        <Label className="mb-1.5 block">{t(`${ns}.fields.selected`)}</Label>
                                        <Input value={pilotLabel} disabled className="bg-muted" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-4">
                            <SectionTitle>{t(`${ns}.sections.confirmation`)}</SectionTitle>

                            {importedIds.length === 0 && skippedList.length === 0 && (
                                <div className="text-center py-4 space-y-3">
                                    <div className="mx-auto h-14 w-14 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                                        <ClipboardCheck className="h-7 w-7 text-violet-600" />
                                    </div>
                                    <p className="font-semibold text-base">{t(`${ns}.info.youAreAllSet`)}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {t(`${ns}.info.reviewAndImport`, { importButton: t(`${ns}.buttons.importMission`) })}
                                    </p>
                                    <div className="mt-2 rounded-lg border bg-muted/30 p-4 text-left space-y-1.5">
                                        <Row label={t(`${ns}.review.client`)}   value={clients.find((c) => String(c.client_id) === clientId)?.client_name} />
                                        <Row label={t(`${ns}.review.platform`)} value={platform} />
                                        <Row label={t(`${ns}.review.file`)}     value={logFile?.name || flights.find((f) => f.flight_id === selectedFlightId)?.flight_name || selectedFlightId} />
                                        <Row label={t(`${ns}.review.drone`)}    value={drones.find((d) => String(d.tool_id) === vehicleId)?.tool_code} />
                                        <Row label={t(`${ns}.review.category`)} value={categories.find((c) => String(c.id) === categoryId)?.name} />
                                        <Row label={t(`${ns}.review.type`)}     value={types.find((tp) => String(tp.id) === typeId)?.name} />
                                        <Row label={t(`${ns}.review.status`)}   value={statusLabel} />
                                        <Row label={t(`${ns}.review.location`)} value={location} />
                                        <Row label={t(`${ns}.review.plan`)}     value={planId === 'N' ? t(`${ns}.info.none`) : plans.find((p) => String(p.mission_planning_id) === planId)?.mission_planning_code} />
                                        <Row label={t(`${ns}.review.pilot`)}    value={pilotLabel} />
                                        {groupLabel && <Row label={t(`${ns}.review.group`)} value={groupLabel} />}
                                    </div>
                                </div>
                            )}

                            {(importedIds.length > 0 || skippedList.length > 0) && (
                                <div className="space-y-3">
                                    {importedIds.length > 0 && (
                                        <div className="text-center py-2 space-y-2">
                                            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
                                            <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                                                {t(`${ns}.result.missionsImported`, { count: importedIds.length })}
                                            </p>
                                            <div className="space-y-1">
                                                {importedIds.map((id) => (
                                                    <p key={id} className="text-sm text-muted-foreground">{t(`${ns}.result.addedMission`, { id })}</p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {skippedList.length > 0 && (
                                        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                                    {t(`${ns}.result.duplicatesSkipped`, { count: skippedList.length })}
                                                </p>
                                            </div>
                                            <div className="space-y-0.5">
                                                {skippedList.map((msg, i) => (
                                                    <p key={i} className="text-xs text-amber-600 dark:text-amber-400">• {msg}</p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between px-6 pb-6 pt-2 border-t bg-muted/20">
                    <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}
                        disabled={step === 1 || submitting || importedIds.length > 0 || skippedList.length > 0}
                        className="gap-1">
                        <ChevronLeft className="h-4 w-4" /> {t(`${ns}.buttons.previous`)}
                    </Button>

                    {step < 5 ? (
                        <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canNext()}
                            className="gap-1 bg-violet-600 hover:bg-violet-700 text-white">
                            {t(`${ns}.buttons.next`)} <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (importedIds.length === 0 && skippedList.length === 0) ? (
                        <Button size="sm" onClick={handleSubmit} disabled={submitting}
                            className="gap-2 bg-rose-600 hover:bg-rose-700 text-white min-w-[140px]">
                            {submitting
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> {t(`${ns}.buttons.importing`)}</>
                                : <><FileUp className="h-4 w-4" /> {t(`${ns}.buttons.importMission`)}</>}
                        </Button>
                    ) : (
                        <Button size="sm" onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700 text-white">{t(`${ns}.buttons.done`)}</Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h4 className="text-sm font-semibold text-foreground border-b pb-2 mb-3">{children}</h4>;
}

function Row({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return (
        <div className="flex gap-2">
            <span className="text-muted-foreground w-20 shrink-0 text-xs">{label}</span>
            <span className="font-medium text-xs">{value}</span>
        </div>
    );
}