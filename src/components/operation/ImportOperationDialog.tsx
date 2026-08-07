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
import { Skeleton } from '@/components/ui/skeleton';
import { Operation } from '@/config/types/operation';
import { serialInList } from '@/lib/serial-number';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { MissionPlanningOption, PlanningOption } from './OperationModalTypes';
import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Clock,
    FileText,
    FileUp,
    Fingerprint,
    Loader2,
    RefreshCw,
    Settings,
    Upload,
    User,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Client        { client_id: number; client_name: string; client_code: string }
interface DroneSystem   {
    tool_id: number; tool_code: string; tool_name: string;
    in_maintenance?: boolean; maintenance_due?: boolean;
    is_non_operational?: boolean; is_dismissed?: boolean;
    drone_serial_numbers?: string[];
}
interface SelectOption  { id: number; name: string }
interface Pilot         { user_id: number; first_name: string; last_name: string }
interface FlytbaseOrganization { organization_id: number; org_name: string }
interface FlytbaseFlight {
    flight_id: string;
    flight_name?: string;
    start_time?: number;
    end_time?: number;
    duration?: number;
    distance?: number;
    drone_name?: string;
    drone_id?: string;
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

const PLATFORMS = [{ value: 'FLYTBASE', label: 'Control Center' }];
const FLIGHTS_PAGE_SIZE = 20;

function formatDuration(secs?: number): string {
    if (secs == null) return '—';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return h + 'h ' + m + 'm';
    return m > 0 ? m + 'm ' + s + 's' : `${s}s`;
}

function formatDistance(meters?: number): string {
    if (meters == null) return '—';
    if (meters >= 1000) return (meters / 1000).toFixed(2) + ' km';
    return Math.round(meters) + ' m';
}

function formatFlightTime(timestamp?: number): string {
    if (timestamp == null) return '—';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ImportOperationDialog({ open, onClose, onSaved }: ImportOperationDialogProps) {
    const { t } = useTranslation();
    const ns = 'operations.importOperation';

    const [step, setStep]             = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [importedIds, setImportedIds] = useState<number[]>([]);
    const [skippedList, setSkippedList] = useState<string[]>([]);

    const [clients,    setClients]    = useState<Client[]>([]);
    const [drones,     setDrones]     = useState<DroneSystem[]>([]);
    const [plannings,  setPlannings]  = useState<PlanningOption[]>([]);
    const [missionPlannings, setMissionPlannings] = useState<MissionPlanningOption[]>([]);
    const [categories, setCategories] = useState<SelectOption[]>([]);
    const [types,      setTypes]      = useState<SelectOption[]>([]);
    const [pilots,     setPilots]     = useState<Pilot[]>([]);
    const [lucProcedures, setLucProcedures] = useState<SelectOption[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [loadingDrones, setLoadingDrones] = useState(false);
    const [loadingMissionOptions, setLoadingMissionOptions] = useState(false);
    const [loadingPlannings, setLoadingPlannings] = useState(false);
    const [loadingMissionPlannings, setLoadingMissionPlannings] = useState(false);
    const [loadingPilots, setLoadingPilots] = useState(false);

    const [clientId,    setClientId]    = useState('');
    const [platform,    setPlatform]    = useState('FLYTBASE');
    const [logFile,     setLogFile]     = useState<File | null>(null);
    const [organizations, setOrganizations] = useState<FlytbaseOrganization[]>([]);
    const [organizationId, setOrganizationId] = useState('');
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [fbWindow, setFbWindow] = useState('1440');
    const [flights, setFlights] = useState<FlytbaseFlight[]>([]);
    const [loadingFlights, setLoadingFlights] = useState(false);
    const [selectedFlightId, setSelectedFlightId] = useState('');
    const [flightsError, setFlightsError] = useState('');
    const [flightPage, setFlightPage] = useState(1);
    const [flightTotal, setFlightTotal] = useState(0);
    const [flightSearchQuery, setFlightSearchQuery] = useState('');
    const [logSerialNumber, setLogSerialNumber] = useState<string | null>(null);
    const [loadingSerialNumber, setLoadingSerialNumber] = useState(false);
    const [vehicleId,   setVehicleId]   = useState('');
    const [missionCode, setMissionCode] = useState('');
    const [categoryId,  setCategoryId]  = useState('');
    const [typeId,      setTypeId]      = useState('');
    const [opType,      setOpType]      = useState<'OPEN' | 'PDRA'>('OPEN');
    const [flightMode,  setFlightMode]  = useState<'RC' | 'DOCK'>('RC');
    const [planId,      setPlanId]      = useState('');
    const [missionPlanningId, setMissionPlanningId] = useState('');
    const [lucProcedureId, setLucProcedureId] = useState('');
    const [location,    setLocation]    = useState('');
    const [groupLabel,  setGroupLabel]  = useState('');
    const [notes,       setNotes]       = useState('');
    const [pilotId,     setPilotId]     = useState('');
    const [visualObserverIds, setVisualObserverIds] = useState<string[]>([]);
    const [isRecurrent, setIsRecurrent] = useState(false);
    const [recurrentStartDate, setRecurrentStartDate] = useState('');
    const [recurrentEndDate, setRecurrentEndDate] = useState('');
    const [recurrentTime, setRecurrentTime] = useState('');
    const [recurrentDateError, setRecurrentDateError] = useState('');
    const [generatingId, setGeneratingId] = useState(false);
    const [existingMissionCodes, setExistingMissionCodes] = useState<Set<string>>(new Set());

    const handleOpTypeChange = (newOpType: 'OPEN' | 'PDRA') => {
        setOpType(newOpType);
        // Reset PDRA-specific fields when switching to OPEN
        if (newOpType === 'OPEN') {
            setPlanId('');
            setMissionPlanningId('');
            setFlightMode('RC');
        }
    };

    const handleRecurrentEndDateChange = (value: string) => {
        setRecurrentEndDate(value);
        // Validate that end date is not before start date
        if (value && recurrentStartDate && new Date(value) < new Date(recurrentStartDate)) {
            setRecurrentDateError(t('operations.importOperation.errors.endDateBeforeStart'));
        } else if (!value && isRecurrent) {
            setRecurrentDateError(t('operations.importOperation.errors.datesRequired'));
        } else {
            setRecurrentDateError('');
        }
    };

    const handleRecurrentStartDateChange = (value: string) => {
        setRecurrentStartDate(value);
        // Validate that end date is not before start date
        if (value && recurrentEndDate && new Date(recurrentEndDate) < new Date(value)) {
            setRecurrentDateError(t('operations.importOperation.errors.endDateBeforeStart'));
        } else if (!value && isRecurrent) {
            setRecurrentDateError(t('operations.importOperation.errors.datesRequired'));
        } else {
            setRecurrentDateError('');
        }
    };

    const handleRecurrentToggle = (checked: boolean) => {
        setIsRecurrent(checked);
        if (!checked) {
            setRecurrentDateError('');
        }
    };

    const validateRecurrentDates = () => {
        if (!isRecurrent) return true;
        if (!recurrentStartDate || !recurrentEndDate) {
            setRecurrentDateError(t('operations.importOperation.errors.datesRequired'));
            return false;
        }
        if (recurrentDateError) return false;
        return true;
    };

    function generateMissionId(exclude: Set<string> = new Set()): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let id = ''
        let attempts = 0
        do {
            id = ''
            for (let i = 0; i < 6; i++) {
                id += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            attempts++
        } while (exclude.has(id) && attempts < 100)
        return id
    }

    async function refreshMissionId() {
        setGeneratingId(true)
        try {
            const res = await axios.get('/api/operation/calendar')
            const codes = new Set<string>(
                (res.data.data ?? [])
                    .map((ev: any) => ev.operation?.mission_code)
                    .filter(Boolean)
                    .map((c: string) => c.toUpperCase())
            )
            setExistingMissionCodes(codes)
            setMissionCode(generateMissionId(codes))
        } catch {
            setMissionCode(generateMissionId(existingMissionCodes))
        } finally {
            setGeneratingId(false)
        }
    }

    useEffect(() => {
        if (!open) return;
        resetForm();
        setLoadingClients(true);
        axios.get('/api/operation/import/options?type=clients')
            .then((r) => setClients(r.data.clients ?? []))
            .catch(() => toast.error(t(ns + '.toast.loadClientsError')))
            .finally(() => setLoadingClients(false));

        setLoadingPlannings(true);
        axios.get('/api/operation/options')
            .then((r) => setPlannings(r.data.plannings ?? []))
            .catch(() => toast.error(t(ns + '.toast.loadMissionOptionsError')))
            .finally(() => setLoadingPlannings(false));

        setLoadingOrgs(true);
        axios.get('/api/flytbase/my-organizations')
            .then((r) => {
                const orgs = r.data.organizations ?? [];
                setOrganizations(orgs);
                if (orgs.length > 0) setOrganizationId(String(orgs[0].organization_id));
            })
            .catch(() => {})
            .finally(() => setLoadingOrgs(false));
    }, [open]);

    useEffect(() => {
        if (!clientId) { setDrones([]); setVehicleId(''); return; }
        setDrones([]); setVehicleId(''); setPlanId(''); setMissionPlanningId(''); setMissionPlannings([]);
        setLoadingDrones(true);
        axios.get(`/api/operation/import/options?type=drones&client_id=${clientId}`)
            .then((r) => setDrones(r.data.drones ?? []))
            .catch(() => toast.error(t(ns + '.toast.loadDronesError')))
            .finally(() => setLoadingDrones(false));
    }, [clientId]);

    const clientPlannings = plannings
        .filter((p) => String(p.fk_client_id) === clientId)
        .sort((a, b) => {
            const aActive = !a.planning_active || a.planning_active === 'Y' ? 0 : 1;
            const bActive = !b.planning_active || b.planning_active === 'Y' ? 0 : 1;
            return aActive - bActive;
        });

    // Load mission plannings when planId changes (for PDRA operations)
    useEffect(() => {
        if (!planId || opType !== 'PDRA') {
            setMissionPlannings([]);
            setMissionPlanningId('');
            return;
        }
        setLoadingMissionPlannings(true);
        axios.get(`/api/operation/mission-plannings?planning_id=${planId}`)
            .then((r) => {
                const missions = r.data.mission_plannings ?? [];
                setMissionPlannings(missions);
                if (missions.length > 0 && !missionPlanningId) {
                    setMissionPlanningId(String(missions[0].mission_planning_id));
                }
            })
            .catch(() => toast.error(t(ns + '.toast.loadMissionOptionsError')))
            .finally(() => setLoadingMissionPlannings(false));
    }, [planId, opType]);

    const canNext = () => {
        if (step === 1) return !!clientId;
        if (step === 2) {
            // Allow either Flytbase flight selection OR log file upload
            return !!selectedFlightId || !!logFile;
        }
        if (step === 3) {
            if (!vehicleId) return false;
            if (!missionCode.trim()) return false;
            if (opType === 'PDRA') {
                if (!planId) return false;
                const selected = clientPlannings.find(p => String(p.planning_id) === planId);
                if (selected && selected.planning_active === 'N') return false;
            }
            return true;
        }
        if (step === 4) {
            if (!pilotId) return false;
            if (isRecurrent && !validateRecurrentDates()) return false;
            return true;
        }
        return true;
    };

    const matchingDrone = logSerialNumber
        ? drones.find((d) => serialInList(d.drone_serial_numbers, logSerialNumber))
        : undefined;

    useEffect(() => {
        if (matchingDrone) {
            if (String(matchingDrone.tool_id) !== vehicleId) setVehicleId(String(matchingDrone.tool_id));
        } else if (vehicleId) {
            setVehicleId('');
        }
    }, [matchingDrone, vehicleId]);

    useEffect(() => {
        if (step !== 3) return;
        setLoadingMissionOptions(true);
        Promise.all([
            axios.get('/api/operation/import/options?type=categories'),
            axios.get('/api/operation/import/options?type=types'),
            axios.get('/api/operation/import/options?type=lucProcedures'),
        ])
            .then(([catRes, typeRes, lucRes]) => {
                setCategories(catRes.data.categories ?? []);
                setTypes(typeRes.data.types ?? []);
                setLucProcedures(lucRes.data.lucProcedures ?? []);
            })
            .catch(() => toast.error(t(ns + '.toast.loadMissionOptionsError')))
            .finally(() => setLoadingMissionOptions(false));
    }, [step]);

    // Auto-generate mission code when entering step 3
    useEffect(() => {
        if (step === 3 && !missionCode) {
            refreshMissionId();
        }
    }, [step]);

    useEffect(() => {
        if (step !== 4) return;
        setLoadingPilots(true);
        axios.get('/api/operation/import/options?type=pilots')
            .then((r) => setPilots(r.data.pilots ?? []))
            .catch(() => toast.error(t(ns + '.toast.loadPilotsError')))
            .finally(() => setLoadingPilots(false));
    }, [step]);

    function resetForm() {
        setStep(1); setImportedIds([]); setSkippedList([]);
        setClientId(''); setPlatform('FLYTBASE'); setLogFile(null);
        setOrganizations([]); setOrganizationId(''); setLoadingOrgs(false);
        setVehicleId(''); setMissionCode(''); setCategoryId(''); setTypeId(''); setPlanId(''); setMissionPlanningId('');
        setOpType('OPEN'); setFlightMode('RC');
        setLucProcedureId(''); setLocation(''); setGroupLabel(''); setNotes(''); setPilotId(''); setVisualObserverIds([]);
        setFbWindow('1440'); setFlights([]); setSelectedFlightId(''); setFlightsError('');
        setFlightPage(1); setFlightTotal(0); setFlightSearchQuery('');
        setLogSerialNumber(null); setLoadingSerialNumber(false);
        setDrones([]); setPlannings([]); setMissionPlannings([]); setCategories([]); setTypes([]); setPilots([]); setLucProcedures([]);
        setLoadingClients(false); setLoadingDrones(false); setLoadingMissionOptions(false); setLoadingPlannings(false); setLoadingMissionPlannings(false); setLoadingPilots(false);
        setIsRecurrent(false); setRecurrentStartDate(''); setRecurrentEndDate(''); setRecurrentTime(''); setRecurrentDateError('');
    }

    const fetchFlytbaseFlights = useCallback(async (page = 1) => {
        if (!organizationId) return;
        setLoadingFlights(true);
        setFlights([]);
        setSelectedFlightId('');
        setFlightsError('');
        try {
            const { data } = await axios.get(`/api/flytbase/flights?window=${fbWindow}&organizationId=${organizationId}&page=${page}&pageSize=${FLIGHTS_PAGE_SIZE}`);
            if (data.success) {
                const loaded = data.flights ?? [];
                setFlights(loaded);
                setFlightTotal(data.total ?? 0);
                setFlightPage(page);
                if (loaded.length === 0) {
                    setFlightsError(t(ns + '.toast.noFlightsFound'));
                }
            } else {
                setFlightsError(data.message ?? t(ns + '.toast.loadFlightsError'));
            }
        } catch (e: any) {
            setFlightsError(e?.response?.data?.message ?? t(ns + '.toast.loadFlightsError'));
        } finally {
            setLoadingFlights(false);
        }
    }, [fbWindow, organizationId, ns, t]);

    useEffect(() => {
        if (step !== 2 || platform !== 'FLYTBASE' || !organizationId) return;
        setFlightPage(1);
        fetchFlytbaseFlights(1);
    }, [step, platform, organizationId, fetchFlytbaseFlights]);

    // Detect the drone serial number from whichever log source is selected,
    // so it can be shown as a hint on the Mission Data step.
    useEffect(() => {
        if (platform === 'FLYTBASE' && selectedFlightId) {
            setLoadingSerialNumber(true);
            axios.get(`/api/flytbase/flights/preview?flightId=${encodeURIComponent(selectedFlightId)}&organizationId=${organizationId}`)
                .then((r) => {
                    const serial = r.data.serialNumber || null;
                    setLogSerialNumber(serial);
                })
                .catch(() => setLogSerialNumber(null))
                .finally(() => setLoadingSerialNumber(false));
        } else if (logFile) {
            setLoadingSerialNumber(true);
            const formData = new FormData();
            formData.append('logFile', logFile);
            axios.post('/api/operation/import/serial-number', formData)
                .then((r) => setLogSerialNumber(r.data.serialNumber || null))
                .catch(() => setLogSerialNumber(null))
                .finally(() => setLoadingSerialNumber(false));
        } else {
            setLogSerialNumber(null);
        }
    }, [selectedFlightId, logFile, platform, organizationId]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        
        setSubmitting(true);
        
        try {
            const formData = new FormData();
            
            formData.append('client_id', clientId);
            
            formData.append('mission_ccPlatform', platform);
            
            // If a log file is uploaded, send it regardless of platform
            if (logFile) {
                formData.append('mission_file_log', logFile);
            } else if (platform === 'FLYTBASE' && selectedFlightId) {
                formData.append('flytbase_flight_id', selectedFlightId);
                formData.append('organization_id', organizationId);
            } else {
                toast.error('Please select a log file or a flight');
                setSubmitting(false);
                return;
            }
            
            formData.append('mission_vehicle', vehicleId);
            
            formData.append('mission_code', missionCode);
            
            formData.append('mission_category', categoryId);
            
            formData.append('mission_type', typeId);
            
            formData.append('mission_plan', planId || 'N');
            
            formData.append('mission_planning', missionPlanningId || 'N');
            
            formData.append('flight_mode', flightMode);
            
            formData.append('mission_result', '1');
            
            formData.append('mission_luc_procedure', lucProcedureId);
            
            formData.append('mission_location', location);
            
            formData.append('mission_group_label', groupLabel);
            
            formData.append('mission_notes', notes);
            
            formData.append('pilot_id', pilotId);
            
            visualObserverIds.forEach(id => formData.append('visual_observer_ids', id));
            
            formData.append('is_recurrent', String(isRecurrent));
            
            if (isRecurrent) {
                formData.append('recurrent_start_date', recurrentStartDate);
                formData.append('recurrent_end_date', recurrentEndDate);
                formData.append('recurrent_time', recurrentTime);
            }


            const { data } = await axios.post('/api/operation/import', formData);
            
            // Check for success based on the API response structure
            if (data.code === 1 || data.status === 'SUCCESS' || data.success) {
                toast.success(t(ns + '.toast.importSuccess'));
                onClose();
                if (onSaved && data.operations) {
                    data.operations.forEach((op: Operation) => onSaved(op));
                }
            } else {
                toast.error(data.message ?? t(ns + '.toast.importFailed'));
            }
        } catch (e: any) {
            console.error('Error:', e);
            console.error('Error response:', e?.response?.data);
            console.error('Error message:', e?.message);
            toast.error(e?.response?.data?.message ?? t(ns + '.toast.importFailed'));
        } finally {
            setSubmitting(false);
        }
    }

    const serialNotDetected = !loadingSerialNumber && !logSerialNumber;
    const serialNoMatch     = !loadingSerialNumber && !loadingDrones && !!logSerialNumber && !matchingDrone;
    const selectedPilot    = pilots.find((p) => String(p.user_id) === pilotId);
    const pilotLabel       = selectedPilot ? `${selectedPilot.first_name} ${selectedPilot.last_name}` : '';
    const selectedFlightObj = flights.find((f) => f.flight_id === selectedFlightId);
    const selectedPlan     = clientPlannings.find((p) => String(p.planning_id) === planId);
    const selectedMissionPlanning = missionPlannings.find((m) => String(m.mission_planning_id) === missionPlanningId);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl gap-0 p-0 overflow-hidden max-h-[90vh] flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                        <FileUp className="h-5 w-5 text-violet-600" />
                        {t(ns + '.dialogTitle')}
                    </DialogTitle>
                </DialogHeader>

                <div className="px-6 pt-4 pb-2 shrink-0">
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
                                            {t(ns + '.steps.' + s.labelKey)}
                                        </span>
                                    </div>
                                    {i < STEP_KEYS.length - 1 && (
                                        <div className={cn(
                                            'flex-1 h-0.5 mx-2 transition-colors',
                                            done ? 'bg-emerald-600' : active ? 'bg-violet-600' : 'bg-muted'
                                        )} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="px-6 py-4 flex-1 overflow-y-auto min-h-0">
                    <div className="min-h-[400px]">
                        {step === 1 && (
                            <div className="space-y-4">
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.client')} <span className="text-red-500">*</span></Label>
                                    <Select value={clientId} onValueChange={setClientId} disabled={loadingClients}>
                                        <SelectTrigger>
                                            {loadingClients ? <Loader2 className="h-4 w-4 animate-spin" /> : clientId ? <SelectValue /> : <SelectValue placeholder={t(ns + '.placeholders.selectClient')} />}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients.map((c) => (
                                                <SelectItem key={c.client_id} value={String(c.client_id)}>
                                                {c.client_name} ({c.client_code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="mb-1.5 block">{t(ns + '.fields.platform')}</Label>
                                            <Select value={platform} onValueChange={setPlatform}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {PLATFORMS.map((p) => (
                                                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                {platform === 'FLYTBASE' && (
                                    <>
                                        <div>
                                            <Label className="mb-1.5 block">{t(ns + '.fields.organization')} <span className="text-red-500">*</span></Label>
                                            <Select value={organizationId} onValueChange={setOrganizationId} disabled={loadingOrgs}>
                                                <SelectTrigger>
                                                    {loadingOrgs ? <Loader2 className="h-4 w-4 animate-spin" /> : organizationId ? <SelectValue /> : <SelectValue placeholder={t(ns + '.placeholders.selectOrganization')} />}
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {organizations.map((org) => (
                                                        <SelectItem key={org.organization_id} value={String(org.organization_id)}>{org.org_name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="mb-1.5 block">{t(ns + '.fields.timeWindow')}</Label>
                                            <Select value={fbWindow} onValueChange={setFbWindow}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="60">Last 1 hour</SelectItem>
                                                    <SelectItem value="360">Last 6 hours</SelectItem>
                                                    <SelectItem value="720">Last 12 hours</SelectItem>
                                                    <SelectItem value="1440">Last 24 hours</SelectItem>
                                                    <SelectItem value="4320">Last 3 days</SelectItem>
                                                    <SelectItem value="10080">Last 7 days</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="mb-1.5 block">{t(ns + '.fields.selectFlight')} <span className="text-red-500">*</span></Label>
                                            {loadingFlights ? (
                                                <div className="space-y-3">
                                                    {[...Array(5)].map((_, i) => (
                                                        <div key={i} className="flex items-center gap-3 p-3 border-b">
                                                            <Skeleton className="h-4 w-24" />
                                                            <Skeleton className="h-3 w-16" />
                                                            <Skeleton className="h-3 w-12" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden h-96 flex flex-col">
                                                    <div className="flex-1 overflow-y-auto">
                                                        {flights.map((f) => (
                                                            <div
                                                                key={f.flight_id}
                                                                onClick={() => setSelectedFlightId(f.flight_id)}
                                                                className={cn(
                                                                    'px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors',
                                                                    selectedFlightId === f.flight_id ? 'bg-violet-50 dark:bg-violet-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                                                                )}
                                                            >
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="font-medium text-xs">
                                                                        {f.flight_name || f.flight_id}
                                                                        {f.drone_name ? ` · ${f.drone_name}` : ''}
                                                                    </div>
                                                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                                                        <span>{formatFlightTime(f.start_time)}</span>
                                                                        <span>{formatDuration(f.duration)}</span>
                                                                        <span>{formatDistance(f.distance)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {flights.length === 0 && !loadingFlights && (
                                                            <div className="p-4 text-center text-sm text-muted-foreground">
                                                                No flights found
                                                            </div>
                                                        )}
                                                </div>
                                                {flightTotal > FLIGHTS_PAGE_SIZE && (
                                                    <div className="p-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                                                        <span className="text-xs text-muted-foreground">
                                                            Page {flightPage} of {Math.ceil(flightTotal / FLIGHTS_PAGE_SIZE)}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => fetchFlytbaseFlights(flightPage - 1)}
                                                                disabled={flightPage === 1 || loadingFlights}
                                                                className="h-7 px-2 cursor-pointer"
                                                            >
                                                                Prev
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => fetchFlytbaseFlights(flightPage + 1)}
                                                                disabled={flightPage >= Math.ceil(flightTotal / FLIGHTS_PAGE_SIZE) || loadingFlights}
                                                                className="h-7 px-2 cursor-pointer"
                                                            >
                                                                Next
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {flightsError && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{flightsError}</p>
                                        )}
                                    </div>

                                    {selectedFlightObj && (
                                        <div className="flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-800 px-4 py-3">
                                            <Clock className="h-5 w-5 text-violet-600 shrink-0" />
                                            <div className="grid grid-cols-3 gap-6 text-sm flex-1">
                                                {selectedFlightObj.start_time != null && (
                                                    <>
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t(ns + '.fields.flightDate')}</p>
                                                            <p className="font-medium text-xs">{new Date(selectedFlightObj.start_time).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t(ns + '.fields.flightTime')}</p>
                                                            <p className="font-medium text-xs">{new Date(selectedFlightObj.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        </div>
                                                    </>
                                                )}
                                                {selectedFlightObj.duration != null && (
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t(ns + '.fields.duration')}</p>
                                                        <p className="font-medium text-xs">{formatDuration(selectedFlightObj.duration)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                                )}
                                </div>

                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/20">
                                    <Label className="mb-3 block">{t(ns + '.fields.logFile')} <span className="text-red-500">*</span></Label>
                                    <div className="space-y-3">
                                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:border-violet-400 dark:hover:border-violet-600 transition-colors">
                                            <Input
                                                id="log-file-input"
                                                type="file"
                                                accept=".gutma,.zip,.json,.xml"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0] || null;
                                                    console.log('File selected:', file?.name, file?.size, file?.type);
                                                    setLogFile(file);
                                                    if (file) {
                                                        setSelectedFlightId('');
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor="log-file-input"
                                                className="cursor-pointer flex flex-col items-center gap-2"
                                            >
                                                <FileUp className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                                    {logFile ? logFile.name : t(ns + '.placeholders.selectFlightLog')}
                                                </span>
                                                <span className="text-xs text-slate-500 dark:text-slate-500">
                                                    .gutma, .zip, .json, .xml
                                                </span>
                                            </label>
                                        </div>
                                        {logFile && (
                                            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                    <span className="text-sm text-emerald-700 dark:text-emerald-400">{logFile.name}</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setLogFile(null);
                                                        const fileInput = document.getElementById('log-file-input') as HTMLInputElement;
                                                        if (fileInput) fileInput.value = '';
                                                    }}
                                                    className="h-6 px-2 cursor-pointer text-red-600 hover:text-red-700"
                                                >
                                                    Clear
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.droneSystem')} <span className="text-red-500">*</span></Label>
                                    <Select value={vehicleId} onValueChange={setVehicleId} disabled>
                                        <SelectTrigger>
                                            {loadingDrones || loadingSerialNumber ? <Loader2 className="h-4 w-4 animate-spin" /> : vehicleId ? <SelectValue /> : <SelectValue placeholder={t(ns + '.placeholders.selectDot')} />}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {drones.map((d) => (
                                                    <SelectItem
                                                        key={d.tool_id}
                                                        value={String(d.tool_id)}
                                                        disabled={d.in_maintenance || d.is_non_operational || d.is_dismissed}
                                                        className={cn((d.in_maintenance || d.is_non_operational || d.is_dismissed) && 'opacity-50')}
                                                    >
                                                        {d.tool_name} ({d.tool_code})
                                                        {d.in_maintenance && ' (Maintenance)'}
                                                        {d.maintenance_due && ' (Maintenance Due)'}
                                                        {d.is_non_operational && ' (Non-operational)'}
                                                        {d.is_dismissed && ' (Dismissed)'}
                                                    </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                                        {t(ns + '.info.systemLockedForImport')}
                                    </p>
                                    {loadingSerialNumber && (
                                        <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                                            <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                                            {t(ns + '.info.detectingSerialNumber')}
                                        </p>
                                    )}
                                    {serialNotDetected && (
                                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-2.5">
                                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                                            <p className="text-xs leading-snug text-red-700 dark:text-red-400">
                                                {t(ns + '.info.noSerialDetected')}
                                            </p>
                                        </div>
                                    )}
                                    {serialNoMatch && (
                                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-2.5">
                                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                                            <p className="text-xs leading-snug text-red-700 dark:text-red-400">
                                                {t(ns + '.info.noSystemWithSerial', { serial: logSerialNumber })}
                                            </p>
                                        </div>
                                    )}
                                    {!loadingSerialNumber && matchingDrone && (
                                        <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                                            {t(ns + '.info.systemAutoSelected', { name: matchingDrone.tool_name })}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.missionCode')} <span className="text-red-500">*</span></Label>
                                    <div className="flex gap-2 items-center">
                                        <Input value={missionCode} onChange={(e) => setMissionCode(e.target.value.toUpperCase())} placeholder={t(ns + '.placeholders.missionCode')}  maxLength={6} />
                                        <button
                                            type="button"
                                            onClick={refreshMissionId}
                                            disabled={generatingId}
                                            title={t('operations.newOperation.scheduler.regenerateId')}
                                            className="shrink-0 p-2 cursor-pointer rounded-md border transition-colors bg-white border-slate-300 text-slate-500 hover:bg-slate-50"
                                        >
                                            <RefreshCw className={cn('h-4 w-4', generatingId && 'animate-spin')} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.category')} <span className="text-red-500">*</span></Label>
                                    <Select value={categoryId} onValueChange={setCategoryId} disabled={loadingMissionOptions}>
                                        <SelectTrigger>
                                            {loadingMissionOptions ? <Loader2 className="h-4 w-4 animate-spin" /> : categoryId ? <SelectValue /> : <SelectValue placeholder={t(ns + '.placeholders.selectDot')} />}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.type')} <span className="text-red-500">*</span></Label>
                                    <Select value={typeId} onValueChange={setTypeId} disabled={loadingMissionOptions}>
                                        <SelectTrigger>
                                            {loadingMissionOptions ? <Loader2 className="h-4 w-4 animate-spin" /> : typeId ? <SelectValue /> : <SelectValue placeholder={t(ns + '.placeholders.selectDot')} />}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {types.map((ty) => <SelectItem key={ty.id} value={String(ty.id)}>{ty.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.opType')}</Label>
                                    <Select value={opType} onValueChange={handleOpTypeChange}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="OPEN">OPEN</SelectItem>
                                            <SelectItem value="PDRA">PDRA</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {opType === 'PDRA' && (
                                    <div>
                                        <Label className="mb-1.5 block">{t(ns + '.fields.flightMode')}</Label>
                                        <Select value={flightMode} onValueChange={(v: 'RC' | 'DOCK') => setFlightMode(v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="RC">RC</SelectItem>
                                                <SelectItem value="DOCK">DOCK</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            {opType === 'PDRA' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="mb-1.5 block">{t(ns + '.fields.planning')}</Label>
                                        <Select
                                            value={planId}
                                            onValueChange={setPlanId}
                                            disabled={loadingPlannings}
                                        >
                                            <SelectTrigger>
                                                {loadingPlannings ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                                    planId ? <SelectValue /> : <SelectValue placeholder={
                                                        clientPlannings.length === 0
                                                            ? t(ns + '.placeholders.noPlanningAvailable')
                                                            : t(ns + '.placeholders.selectPlanning')
                                                    } />
                                                )}
                                            </SelectTrigger>
                                            <SelectContent>
                                                {clientPlannings.map((p) => {
                                                    const isActive = !p.planning_active || p.planning_active === 'Y';
                                                    return (
                                                        <SelectItem key={p.planning_id} value={String(p.planning_id)} disabled={!isActive} className={cn(!isActive && 'opacity-50')}>
                                                            {p.planning_name}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block">{t(ns + '.fields.missionPlanning')}</Label>
                                        <Select
                                            value={missionPlanningId}
                                            onValueChange={setMissionPlanningId}
                                            disabled={loadingMissionPlannings}
                                        >
                                            <SelectTrigger>
                                                {loadingMissionPlannings ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                                    missionPlanningId ? <SelectValue /> : <SelectValue placeholder={
                                                        missionPlannings.length === 0
                                                            ? t(ns + '.placeholders.noMissionPlanningAvailable')
                                                            : t(ns + '.placeholders.selectMissionPlanning')
                                                    } />
                                                )}
                                            </SelectTrigger>
                                            <SelectContent>
                                                {missionPlannings.map((m) => {
                                                    const isActive = !m.mission_planning_active || m.mission_planning_active === 'Y';
                                                    return (
                                                        <SelectItem key={m.mission_planning_id} value={String(m.mission_planning_id)} disabled={!isActive} className={cn(!isActive && 'opacity-50')}>
                                                            {m.mission_planning_name}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.lucProcedure')}</Label>
                                    <Select value={lucProcedureId} onValueChange={setLucProcedureId} disabled={loadingMissionOptions}>
                                        <SelectTrigger>
                                            {loadingMissionOptions ? <Loader2 className="h-4 w-4 animate-spin" /> : lucProcedureId ? <SelectValue /> : <SelectValue placeholder={t(ns + '.placeholders.selectDot')} />}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lucProcedures.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.location')}</Label>
                                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t(ns + '.placeholders.location')} />
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.groupLabel')}</Label>
                                    <Input value={groupLabel} onChange={(e) => setGroupLabel(e.target.value)} placeholder={t(ns + '.placeholders.groupLabel')} />
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.notes')}</Label>
                                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t(ns + '.placeholders.notes')} />
                                </div>
                            </div>
                            {logSerialNumber && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900 p-2 rounded">
                                    <Fingerprint className="h-4 w-4" />
                                    <span>{t(ns + '.info.detectedSerialNumber')}: {logSerialNumber}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <div>
                                <Label className="mb-1.5 block">{t(ns + '.fields.pilotInCommand')} <span className="text-red-500">*</span></Label>
                                <Select value={pilotId} onValueChange={setPilotId} disabled={loadingPilots}>
                                    <SelectTrigger>
                                        {loadingPilots ? <Loader2 className="h-4 w-4 animate-spin" /> : pilotId ? <SelectValue /> : <SelectValue placeholder={t(ns + '.placeholders.selectPilot')} />}
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pilots.map((p) => <SelectItem key={p.user_id} value={String(p.user_id)}>{p.first_name} {p.last_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="mb-1.5 block">{t(ns + '.fields.visualObservers')}</Label>
                                <Select
                                    value={visualObserverIds.length > 0 ? visualObserverIds[0] : ''}
                                    onValueChange={(v) => setVisualObserverIds([v])}
                                    disabled={loadingPilots}
                                >
                                    <SelectTrigger>
                                        {loadingPilots ? <Loader2 className="h-4 w-4 animate-spin" /> : visualObserverIds.length > 0 ? <SelectValue /> : <SelectValue placeholder={t(ns + '.placeholders.selectVisualObserver')} />}
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pilots.filter(p => String(p.user_id) !== pilotId).map((p) => <SelectItem key={p.user_id} value={String(p.user_id)}>{p.first_name} {p.last_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isRecurrent"
                                    checked={isRecurrent}
                                    onChange={(e) => handleRecurrentToggle(e.target.checked)}
                                    className="h-4 w-4"
                                />
                                <Label htmlFor="isRecurrent" className="text-sm cursor-pointer">{t(ns + '.fields.recurrent')}</Label>
                            </div>
                            {isRecurrent && (
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label className="mb-1.5 block">{t(ns + '.fields.recurrentStartDate')}</Label>
                                        <Input type="date" value={recurrentStartDate} onChange={(e) => handleRecurrentStartDateChange(e.target.value)} />
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block">{t(ns + '.fields.recurrentEndDate')}</Label>
                                        <Input type="date" value={recurrentEndDate} onChange={(e) => handleRecurrentEndDateChange(e.target.value)} className={recurrentDateError ? 'border-red-500' : ''} />
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block">{t(ns + '.fields.recurrentTime')}</Label>
                                        <Input type="time" value={recurrentTime} onChange={(e) => setRecurrentTime(e.target.value)} />
                                    </div>
                                </div>
                            )}
                            {recurrentDateError && (
                                <p className="text-red-500 text-xs mt-1">{recurrentDateError}</p>
                            )}
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.client')}</Label>
                                    <p className="text-sm font-medium">{clients.find(c => String(c.client_id) === clientId)?.client_name || '—'}</p>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.platform')}</Label>
                                    <p className="text-sm font-medium">{platform}</p>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.drone')}</Label>
                                    <p className="text-sm font-medium">{drones.find(d => String(d.tool_id) === vehicleId)?.tool_name || '—'}</p>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.missionCode')}</Label>
                                    <p className="text-sm font-medium">{missionCode || '—'}</p>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.category')}</Label>
                                    <p className="text-sm font-medium">{categories.find(c => String(c.id) === categoryId)?.name || '—'}</p>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.type')}</Label>
                                    <p className="text-sm font-medium">{types.find(t => String(t.id) === typeId)?.name || '—'}</p>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.opType')}</Label>
                                    <p className="text-sm font-medium">{opType}</p>
                                </div>
                                {opType === 'PDRA' && (
                                    <>
                                        <div>
                                            <Label className="mb-1.5 block">{t(ns + '.fields.flightMode')}</Label>
                                            <p className="text-sm font-medium">{flightMode}</p>
                                        </div>
                                        <div>
                                            <Label className="mb-1.5 block">{t(ns + '.fields.planning')}</Label>
                                            <p className="text-sm font-medium">{selectedPlan?.planning_name || '—'}</p>
                                        </div>
                                        <div>
                                            <Label className="mb-1.5 block">{t(ns + '.fields.missionPlanning')}</Label>
                                            <p className="text-sm font-medium">{selectedMissionPlanning?.mission_planning_name || '—'}</p>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.lucProcedure')}</Label>
                                    <p className="text-sm font-medium">{lucProcedures.find(p => String(p.id) === lucProcedureId)?.name || '—'}</p>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.location')}</Label>
                                    <p className="text-sm font-medium">{location || '—'}</p>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.groupLabel')}</Label>
                                    <p className="text-sm font-medium">{groupLabel || '—'}</p>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t(ns + '.fields.pilotInCommand')}</Label>
                                    <p className="text-sm font-medium">{pilotLabel || '—'}</p>
                                </div>
                                {isRecurrent && (
                                    <>
                                        <div>
                                            <Label className="mb-1.5 block">{t(ns + '.fields.recurrentStartDate')}</Label>
                                            <p className="text-sm font-medium">{recurrentStartDate || '—'}</p>
                                        </div>
                                        <div>
                                            <Label className="mb-1.5 block">{t(ns + '.fields.recurrentEndDate')}</Label>
                                            <p className="text-sm font-medium">{recurrentEndDate || '—'}</p>
                                        </div>
                                        <div>
                                            <Label className="mb-1.5 block">{t(ns + '.fields.recurrentTime')}</Label>
                                            <p className="text-sm font-medium">{recurrentTime || '—'}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t flex items-center justify-between shrink-0">
                    <Button
                        variant="outline"
                        onClick={() => setStep(step - 1)}
                        disabled={step === 1 || submitting}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        {t('common.back')}
                    </Button>
                    <div className="flex items-center gap-2">
                        {step === 5 && (
                            <Button
                                variant="outline"
                                onClick={() => setStep(4)}
                                disabled={submitting}
                            >
                                {t('common.edit')}
                            </Button>
                        )}
                        <Button
                            onClick={step === 5 ? handleSubmit : () => setStep(step + 1)}
                            disabled={!canNext() || submitting}
                            className='bg-violet-600 hover:bg-violet-500 cursor-pointer'
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {step === 5 ? t(ns+'.buttons.import') : t(ns+'.buttons.next')}
                            {step !== 5 && <ChevronRight className="h-4 w-4 ml-1" />}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
