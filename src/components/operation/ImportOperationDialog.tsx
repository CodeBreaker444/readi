'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import { Operation } from '@/config/types/operation';
import { serialInList } from '@/lib/serial-number';
import axios from 'axios';
import { ImportClientStep } from './ImportClientStep';
import { ImportConfirmStep } from './ImportConfirmStep';
import { ImportLogFileStep } from './ImportLogFileStep';
import { ImportMissionDataStep } from './ImportMissionDataStep';
import { ImportPilotStep } from './ImportPilotStep';
import { isoToLocalInput } from './OperationModalHelpers';
import { ImportStepIndicator } from './ImportStepIndicator';
import { MissionPlanningOption, OpType, PlanningOption } from './OperationModalTypes';
import { PilotQualificationsSheet } from './PilotQualificationsSheet';
import { ChevronLeft, ChevronRight, FileUp, Loader2 } from 'lucide-react';
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

const FLIGHTS_PAGE_SIZE = 20;

export default function ImportOperationDialog({ open, onClose, onSaved }: ImportOperationDialogProps) {
    const { t } = useTranslation();
    const { isDark } = useTheme();
    const ns = 'operations.importOperation';

    const [step, setStep]             = useState(1);
    const [qualTarget, setQualTarget] = useState<{ id: number; name: string } | null>(null);
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
    const [flightsFetched, setFlightsFetched] = useState(false);
    const [flightSearchQuery, setFlightSearchQuery] = useState('');
    const [logSerialNumber, setLogSerialNumber] = useState<string | null>(null);
    const [loadingSerialNumber, setLoadingSerialNumber] = useState(false);
    const [vehicleId,   setVehicleId]   = useState('');
    const [missionCode, setMissionCode] = useState('');
    const [categoryId,  setCategoryId]  = useState('');
    const [typeId,      setTypeId]      = useState('');
    const [opType,      setOpType]      = useState<OpType>('OPEN');
    const [flightMode,  setFlightMode]  = useState<'RC' | 'DOCK'>('RC');
    const [planId,      setPlanId]      = useState('');
    const [missionPlanningId, setMissionPlanningId] = useState('');
    const [lucProcedureId, setLucProcedureId] = useState('');
    const [location,    setLocation]    = useState('');
    const [groupLabel,  setGroupLabel]  = useState('');
    const [notes,       setNotes]       = useState('');
    const [pilotId,     setPilotId]     = useState('');
    const [visualObserverIds, setVisualObserverIds] = useState<string[]>([]);
    const [missionStartDate, setMissionStartDate] = useState('');
    const [isRecurrent, setIsRecurrent] = useState(false);
    const [recurrentDays, setRecurrentDays] = useState<number[]>([]);
    const [recurrentEndDate, setRecurrentEndDate] = useState('');
    const [recurrentDateError, setRecurrentDateError] = useState('');
    const [generatingId, setGeneratingId] = useState(false);
    const [existingMissionCodes, setExistingMissionCodes] = useState<Set<string>>(new Set());

    const handleOpTypeChange = (newOpType: OpType) => {
        setOpType(newOpType);
        // Reset PDRA-specific fields when switching away from PDRA
        if (newOpType !== 'PDRA') {
            setPlanId('');
            setMissionPlanningId('');
            setFlightMode('RC');
        }
    };

    const handleRecurrentEndDateChange = (value: string) => {
        setRecurrentEndDate(value);
        // Validate that end date is not before the mission's start date
        const startDateOnly = missionStartDate ? missionStartDate.slice(0, 10) : '';
        if (value && startDateOnly && new Date(value) < new Date(startDateOnly)) {
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
        if (!missionStartDate || !recurrentEndDate || recurrentDays.length === 0) return false;
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
            if (isRecurrent && !validateRecurrentDates()) return false;
            return true;
        }
        if (step === 4) {
            if (!pilotId) return false;
            return true;
        }
        return true;
    };

    const matchingDrone = logSerialNumber
        ? drones.find((d) => serialInList(d.drone_serial_numbers, logSerialNumber))
        : undefined;

    const filteredFlights = flightSearchQuery.trim()
        ? flights.filter((f) => {
            const q = flightSearchQuery.trim().toLowerCase();
            return (f.flight_name ?? f.flight_id).toLowerCase().includes(q)
                || (f.drone_name ?? '').toLowerCase().includes(q);
        })
        : flights;

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
        setFlightPage(1); setFlightTotal(0); setFlightSearchQuery(''); setFlightsFetched(false);
        setLogSerialNumber(null); setLoadingSerialNumber(false);
        setDrones([]); setPlannings([]); setMissionPlannings([]); setCategories([]); setTypes([]); setPilots([]); setLucProcedures([]);
        setLoadingClients(false); setLoadingDrones(false); setLoadingMissionOptions(false); setLoadingPlannings(false); setLoadingMissionPlannings(false); setLoadingPilots(false);
        setMissionStartDate('');
        setIsRecurrent(false); setRecurrentDays([]); setRecurrentEndDate(''); setRecurrentDateError('');
    }

    const fetchFlytbaseFlights = useCallback(async (page = 1) => {
        if (!organizationId) return;
        setLoadingFlights(true);
        setFlights([]);
        setSelectedFlightId('');
        setFlightsError('');
        setFlightsFetched(true);
        setFlightSearchQuery('');
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
        setFlights([]);
        setSelectedFlightId('');
        setFlightsError('');
        setFlightsFetched(false);
        setFlightPage(1);
        setFlightTotal(0);
        setFlightSearchQuery('');
    }, [organizationId, fbWindow]);

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

    useEffect(() => {
        if (platform === 'FLYTBASE' && selectedFlightId) {
            const flight = flights.find((f) => f.flight_id === selectedFlightId);
            if (flight?.start_time) {
                setMissionStartDate(isoToLocalInput(new Date(flight.start_time).toISOString()));
                return;
            }
        }
        setMissionStartDate('');
    }, [selectedFlightId, platform, flights]);

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

            formData.append('op_type', opType);

            formData.append('mission_result', '1');

            formData.append('mission_luc_procedure', lucProcedureId);

            formData.append('mission_location', location);

            formData.append('mission_group_label', groupLabel);

            formData.append('mission_notes', notes);

            formData.append('pilot_id', pilotId);

            visualObserverIds.forEach(id => formData.append('visual_observer_ids', id));

            formData.append('is_recurrent', String(isRecurrent));

            if (isRecurrent) {
                formData.append('mission_start_date', missionStartDate);
                formData.append('recurrent_end_date', recurrentEndDate);
                recurrentDays.forEach((day) => formData.append('recurrent_days_of_week', String(day)));
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
    const selectedClientObj = clients.find((c) => String(c.client_id) === clientId);
    const selectedPilot    = pilots.find((p) => String(p.user_id) === pilotId);
    const pilotLabel       = selectedPilot ? `${selectedPilot.first_name} ${selectedPilot.last_name}` : '';
    const selectedPlan     = clientPlannings.find((p) => String(p.planning_id) === planId);
    const selectedMissionPlanning = missionPlannings.find((m) => String(m.mission_planning_id) === missionPlanningId);

    return (
        <>
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl gap-0 p-0 overflow-hidden max-h-[90vh] flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                        <FileUp className="h-5 w-5 text-violet-600" />
                        {t(ns + '.dialogTitle')}
                    </DialogTitle>
                </DialogHeader>

                <ImportStepIndicator step={step} t={t} ns={ns} />

                <div className="px-6 py-4 flex-1 overflow-y-auto min-h-0">
                    <div className="min-h-[400px]">
                        {step === 1 && (
                            <ImportClientStep
                                t={t}
                                ns={ns}
                                loadingClients={loadingClients}
                                clientId={clientId}
                                setClientId={setClientId}
                                clients={clients}
                                selectedClientObj={selectedClientObj}
                            />
                        )}

                        {step === 2 && (
                            <ImportLogFileStep
                                t={t}
                                ns={ns}
                                platform={platform}
                                setPlatform={setPlatform}
                                organizations={organizations}
                                organizationId={organizationId}
                                setOrganizationId={setOrganizationId}
                                loadingOrgs={loadingOrgs}
                                fbWindow={fbWindow}
                                setFbWindow={setFbWindow}
                                loadingFlights={loadingFlights}
                                fetchFlytbaseFlights={fetchFlytbaseFlights}
                                flightsFetched={flightsFetched}
                                flightSearchQuery={flightSearchQuery}
                                setFlightSearchQuery={setFlightSearchQuery}
                                filteredFlights={filteredFlights}
                                selectedFlightId={selectedFlightId}
                                setSelectedFlightId={setSelectedFlightId}
                                flightTotal={flightTotal}
                                flightPage={flightPage}
                                flightsError={flightsError}
                                logFile={logFile}
                                setLogFile={setLogFile}
                            />
                        )}

                        {step === 3 && (
                            <ImportMissionDataStep
                                t={t}
                                ns={ns}
                                vehicleId={vehicleId}
                                setVehicleId={setVehicleId}
                                loadingDrones={loadingDrones}
                                loadingSerialNumber={loadingSerialNumber}
                                drones={drones}
                                serialNotDetected={serialNotDetected}
                                serialNoMatch={serialNoMatch}
                                matchingDrone={matchingDrone}
                                logSerialNumber={logSerialNumber}
                                missionCode={missionCode}
                                setMissionCode={setMissionCode}
                                refreshMissionId={refreshMissionId}
                                generatingId={generatingId}
                                categoryId={categoryId}
                                setCategoryId={setCategoryId}
                                loadingMissionOptions={loadingMissionOptions}
                                categories={categories}
                                typeId={typeId}
                                setTypeId={setTypeId}
                                types={types}
                                opType={opType}
                                handleOpTypeChange={handleOpTypeChange}
                                flightMode={flightMode}
                                setFlightMode={setFlightMode}
                                planId={planId}
                                setPlanId={setPlanId}
                                loadingPlannings={loadingPlannings}
                                clientPlannings={clientPlannings}
                                missionPlanningId={missionPlanningId}
                                setMissionPlanningId={setMissionPlanningId}
                                loadingMissionPlannings={loadingMissionPlannings}
                                missionPlannings={missionPlannings}
                                lucProcedureId={lucProcedureId}
                                setLucProcedureId={setLucProcedureId}
                                lucProcedures={lucProcedures}
                                location={location}
                                setLocation={setLocation}
                                groupLabel={groupLabel}
                                setGroupLabel={setGroupLabel}
                                notes={notes}
                                setNotes={setNotes}
                                missionStartDate={missionStartDate}
                                setMissionStartDate={setMissionStartDate}
                                isRecurrent={isRecurrent}
                                handleRecurrentToggle={handleRecurrentToggle}
                                recurrentDays={recurrentDays}
                                setRecurrentDays={setRecurrentDays}
                                recurrentEndDate={recurrentEndDate}
                                handleRecurrentEndDateChange={handleRecurrentEndDateChange}
                                recurrentDateError={recurrentDateError}
                            />
                        )}

                        {step === 4 && (
                            <ImportPilotStep
                                t={t}
                                ns={ns}
                                pilotId={pilotId}
                                setPilotId={setPilotId}
                                loadingPilots={loadingPilots}
                                pilots={pilots}
                                setQualTarget={setQualTarget}
                                visualObserverIds={visualObserverIds}
                                setVisualObserverIds={setVisualObserverIds}
                            />
                        )}

                        {step === 5 && (
                            <ImportConfirmStep
                                t={t}
                                ns={ns}
                                clientId={clientId}
                                clients={clients}
                                platform={platform}
                                vehicleId={vehicleId}
                                drones={drones}
                                missionCode={missionCode}
                                categoryId={categoryId}
                                categories={categories}
                                typeId={typeId}
                                types={types}
                                opType={opType}
                                flightMode={flightMode}
                                selectedPlan={selectedPlan}
                                selectedMissionPlanning={selectedMissionPlanning}
                                lucProcedureId={lucProcedureId}
                                lucProcedures={lucProcedures}
                                location={location}
                                groupLabel={groupLabel}
                                pilotLabel={pilotLabel}
                                missionStartDate={missionStartDate}
                                isRecurrent={isRecurrent}
                                recurrentDays={recurrentDays}
                                recurrentEndDate={recurrentEndDate}
                            />
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
        <PilotQualificationsSheet
            open={!!qualTarget}
            onOpenChange={(o) => !o && setQualTarget(null)}
            pilotId={qualTarget?.id ?? null}
            pilotName={qualTarget?.name ?? ''}
            isDark={isDark}
        />
        </>
    );
}
