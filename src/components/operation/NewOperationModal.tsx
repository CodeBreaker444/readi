'use client'

import { Operation } from '@/app/operations/table/page'
import { useTimezone } from '@/components/TimezoneProvider'
import type { FlightWaypoint } from '@/components/control-center/FlightPathMap'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmergencyResponsePlan } from '@/config/types/erp'
import { DFLIGHT_CIRCLE_MAX_RADIUS_M } from '@/config/types/operation'
import { toastWithDcc } from '@/lib/dcc-toast'
import { showDFlightErrorToast } from '@/lib/dflight-toast'
import { serialInList } from '@/lib/serial-number'
import { cn, localInputToUtcIso, utcToLocalInput } from '@/lib/utils'
import axios from 'axios'
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Clock,
    MapPin,
    Plane,
    ShieldCheck,
    ClipboardList,
    FileUp,
    Loader2,
    Settings,
    Shield,
    Wrench,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { EditMissionLogTab } from './EditMissionLogTab'
import { OperationErpTab } from './OperationErpTab'
import { OperationMaintenanceTab, type OperationMaintenanceTabHandle } from './OperationMaintenanceTab'
import { isoToLocalInput } from './OperationModalHelpers'
import {
    Client,
    ConflictEvent,
    Drone,
    FlightMode,
    GenericOption,
    LucOption,
    MissionPlanningOption,
    OpType,
    PilotOption,
    PlanningOption,
    SchedulerFormData,
    STEPS,
    UspaceOption,
    droneListLabel
} from './OperationModalTypes'
import type { DFlightCircle } from './DFlightCircleMap'
import { OperationStepClient } from './OperationStepClient'
import { OperationStepDrone } from './OperationStepDrone'
import { OperationStepPilot } from './OperationStepPilot'
import { OperationStepScheduler } from './OperationStepScheduler'
import { PostFlightTab, type MissionResultOption, type PostFlightState } from './PostFlightTab'

export interface NewOperationCreatePrefill {
    missionCode?: string | null
    scheduledStart?: string | null
    scheduledEnd?: string | null
    distanceFlown?: number | null
}

/** Flight request a new mission is created for (Flight Requests → Link to Mission → Create new). */
export interface FlightRequestMissionContext {
    request_id: number
    external_mission_id: string
    client_id: number | null
    client_name: string | null
    mission_type: string | null
    target: string | null
    priority: string | null
    notes: string | null
    operator: string | null
    start_datetime: string | null
    received_at: string
    latitude: number | null
    longitude: number | null
    localization: Record<string, any> | null
    zone_validated: boolean | null
    matched_tool_id: number | null
    matched_tool_code: string | null
    distance_m: number | null
    /** Client systems with operation zones: covering ones first (nearest first), then the rest. */
    zoned_tool_ids?: number[]
    /** Systems whose zones cover the request location (no OPM approval needed). */
    covering_tool_ids?: number[]
}

export interface NewOperationModalProps {
    open: boolean
    onClose: () => void
    onSuccess: () => void
    isDark: boolean
    editOperation?: Operation | null
    onSaved?: (op: Operation) => void
    logSerialNumber?: string | null
    createPrefill?: NewOperationCreatePrefill | null
    /** Creating a mission for a flight request: prefills the form, shows its details and links it on save. */
    flightRequest?: FlightRequestMissionContext | null
}

type EditTab = 'data' | 'execution' | 'log' | 'postFlight' | 'maintenance'

const EDIT_TABS = [
    { id: 'data' as const,        labelKey: 'operations.newOperation.tabs.missionData',        icon: Settings },
    { id: 'execution' as const,   labelKey: 'operations.newOperation.tabs.missionExecution',   icon: Shield },
    { id: 'log' as const,         labelKey: 'operations.newOperation.tabs.missionLog',          icon: FileUp },
    { id: 'postFlight' as const,  labelKey: 'operations.newOperation.tabs.postFlight',          icon: ClipboardList },
    { id: 'maintenance' as const, labelKey: 'operations.newOperation.tabs.maintenance',         icon: Wrench },
]

export function NewOperationModal({ open, onClose, onSuccess, isDark, editOperation, onSaved, logSerialNumber, createPrefill, flightRequest }: NewOperationModalProps) {
    const isEdit = !!editOperation
    const fr = !isEdit ? flightRequest ?? null : null
    // The matched system is pre-selected once, after the client's drones load.
    const frToolPicked = useRef(false)
    const { timezone } = useTimezone()
    const { t } = useTranslation()

    const skipDroneReset = useRef(false)
    const maintRef = useRef<OperationMaintenanceTabHandle>(null)

    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    // Pilot-created missions need OPM approval; null until the final step loads it.
    const [approval, setApproval] = useState<{ required: boolean; department: string | null; opmCount: number; zoneValidated?: boolean } | null>(null)
    const [submittingMaint, setSubmittingMaint] = useState(false)
    const [editTab, setEditTab] = useState<EditTab>('data')

    const [clients, setClients] = useState<Client[]>([])
    const [clientId, setClientId] = useState('')
    const [loadingClients, setLoadingClients] = useState(false)

    const [opType, setOpType] = useState<OpType>('OPEN')
    const [drones, setDrones] = useState<Drone[]>([])
    const [droneId, setDroneId] = useState('')
    const [loadingDrones, setLoadingDrones] = useState(false)
    const [plannings, setPlannings] = useState<PlanningOption[]>([])
    const [planId, setPlanId] = useState('')
    const [missionPlannings, setMissionPlannings] = useState<MissionPlanningOption[]>([])
    const [missionPlanningId, setMissionPlanningId] = useState('')
    const [loadingMissionPlannings, setLoadingMissionPlannings] = useState(false)
    const [flightMode, setFlightMode] = useState<FlightMode>('RC')

    const [types, setTypes] = useState<GenericOption[]>([])
    const [categories, setCategories] = useState<GenericOption[]>([])
    const [lucProcedures, setLucProcedures] = useState<LucOption[]>([])
    const [loadingOptions, setLoadingOptions] = useState(false)
    const [generatingId, setGeneratingId] = useState(false)
    const [existingMissionCodes, setExistingMissionCodes] = useState<Set<string>>(new Set())
    const [schedulerForm, setSchedulerForm] = useState<SchedulerFormData>({
        missionCode: '', scheduledStart: '', scheduledEnd: '',
        missionName: '', location: '', locationLat: '', locationLng: '', locationPseudoName: '',
        notes: '', distanceFlown: '',
        typeId: '', categoryId: '', lucId: '', groupLabel: '',
    })

    const [conflicts, setConflicts] = useState<ConflictEvent[]>([])
    const [loadingConflicts, setLoadingConflicts] = useState(false)
    const [conflictChecked, setConflictChecked] = useState(false)

    const [pilots, setPilots] = useState<PilotOption[]>([])
    const [currentUser, setCurrentUser] = useState<{ id: number; role: string } | null>(null)
    const [pilotId, setPilotId] = useState('')
    const [visualObserverIds, setVisualObserverIds] = useState<string[]>([])

    const [uspaces, setUspaces] = useState<UspaceOption[]>([])
    const [uspaceId, setUspaceId] = useState('')
    const [loadingUspaces, setLoadingUspaces] = useState(false)
    const [dFlightEnabled, setDFlightEnabled] = useState(false)
    const [skipDFlight, setSkipDFlight] = useState(false)
    const [uspaceError, setUspaceError] = useState('')
    const [circle, setCircle] = useState<DFlightCircle | null>(null)
    const [uspaceFocus, setUspaceFocus] = useState<{ lat: number; lng: number } | null>(null)

    const [isRecurrent, setIsRecurrent] = useState(false)
    const [recurrentDays, setRecurrentDays] = useState<number[]>([])
    const [recurrentEndDate, setRecurrentEndDate] = useState('')
    const [recurrentDateError, setRecurrentDateError] = useState('')

    const validateRecurrentDates = () => {
        if (!isRecurrent) return true
        if (!schedulerForm.scheduledStart || !recurrentEndDate || recurrentDays.length === 0) {
            setRecurrentDateError(t('operations.importOperation.errors.datesRequired'))
            return false
        }
        if (recurrentDateError) return false
        return true
    }

    const handleRecurrentToggle = (checked: boolean) => {
        setIsRecurrent(checked)
        if (!checked) {
            setRecurrentDateError('')
        }
    }

    const [erps, setErps] = useState<EmergencyResponsePlan[]>([])
    const [loadingErps, setLoadingErps] = useState(false)

    const [erpGroups, setErpGroups] = useState<import('@/config/types/erp').LocationGroup[]>([])
    const [erpGroupId, setErpGroupId] = useState('')
    const [loadingErpGroups, setLoadingErpGroups] = useState(false)

    const [loadingPostFlight, setLoadingPostFlight] = useState(false)
    const [submittingPostFlight, setSubmittingPostFlight] = useState(false)
    const [resultOptions, setResultOptions] = useState<MissionResultOption[]>([])
    const [postFlightFromLog] = useState(false)
    const [flightWaypoints, setFlightWaypoints] = useState<FlightWaypoint[]>([])
    const [loadingWaypoints, setLoadingWaypoints] = useState(false)
    const [postFlight, setPostFlight] = useState<PostFlightState>({
        actual_start: '', actual_end: '', result_id: null, flight_duration_min: '', distance_m: '',
        battery_charge_start: '', battery_charge_end: '',
        incident_flag: false, rth_unplanned: false, link_loss: false, deviation_flag: false,
        weather_temp: '', notes: '',
    })


    useEffect(() => {
        if (!open) { resetForm(); return }

        setLoadingClients(true)
        axios.get('/api/operation/import/options?type=clients')
            .then(r => setClients(r.data.clients ?? []))
            .catch(() => toast.error(t('operations.newOperation.toast.loadClientsError')))
            .finally(() => setLoadingClients(false))

        setLoadingErpGroups(true)
        axios.get('/api/erp/location-group/list')
            .then(res => setErpGroups(res.data.data ?? []))
            .catch(() => {})
            .finally(() => setLoadingErpGroups(false))

        setLoadingUspaces(true)
        axios.get('/api/operation/dflight/uspace-list')
            .then(res => {
                setDFlightEnabled(!!res.data.enabled)
                setUspaces(res.data.uspaces ?? [])
                setUspaceError(res.data.error ?? '')
            })
            .catch(() => { setDFlightEnabled(false); setUspaces([]); setUspaceError('') })
            .finally(() => setLoadingUspaces(false))

        setLoadingOptions(true)
        axios.get('/api/operation/options')
            .then(res => {
                setTypes((res.data.types ?? []).map((t: any) => ({ id: t.mission_type_id, label: t.type_name })))
                setCategories((res.data.categories ?? []).map((c: any) => ({ id: c.category_id, label: c.category_name })))
                setLucProcedures((res.data.lucProcedures ?? []).map((p: any) => ({
                    id: p.procedure_id,
                    label: `${p.procedure_code} — ${p.procedure_name}`,
                    steps: p.procedure_steps,
                })))
                setCurrentUser(res.data.current_user ?? null)
                setPilots((res.data.pilots ?? []).map((p: any) => ({
                    user_id: p.user_id,
                    first_name: p.first_name ?? '',
                    last_name: p.last_name ?? '',
                    department: p.department ?? null,
                })))
                setPlannings(res.data.plannings ?? [])
                // Only use all-tools fallback when the operation has no client assigned
                if (editOperation && !editOperation.fk_client_id) {
                    setDrones((res.data.tools ?? []).map((t: any) => ({
                        tool_id: t.tool_id, tool_code: t.tool_code,
                        tool_name: t.tool_name, in_maintenance: t.in_maintenance,
                        is_non_operational: t.is_non_operational,
                        drone_components: t.drone_components ?? [],
                    })))
                }
            })
            .catch(() => toast.error(t('operations.newOperation.toast.loadOptionsError')))
            .finally(() => setLoadingOptions(false))
    }, [open])

    useEffect(() => {
        if (!uspaceId) { setUspaceFocus(null); return }
        const selected = uspaces.find(u => u.id === uspaceId)
        if (!selected) { setUspaceFocus(null); return }

        // Prefer the U-space's actual registered boundary (what D-Flight validates
        // a drawn circle against) over a free-text guess of its name — a town-name
        // geocode can land far from the real zone and make an in-bounds-looking
        // circle still get rejected as "outside U-space constraint".
        if (selected.boundary && selected.boundary.length > 0) {
            const points = selected.boundary.flat()
            setUspaceFocus({
                lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
                lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
            })
            return
        }

        if (!selected.name) { setUspaceFocus(null); return }
        let cancelled = false
        axios.get('/api/operation/dflight/geocode-uspace', { params: { name: selected.name } })
            .then(res => { if (!cancelled) setUspaceFocus(res.data.location ?? null) })
            .catch(() => { if (!cancelled) setUspaceFocus(null) })
        return () => { cancelled = true }
    }, [uspaceId, uspaces])

    useEffect(() => {
        if (!open || !editOperation) return
        // Prevent the clientId change from resetting droneId/planId on initial load
        if (editOperation.fk_client_id) skipDroneReset.current = true
        setClientId(editOperation.fk_client_id?.toString() ?? '')
        setDroneId(editOperation.fk_tool_id?.toString() ?? '')
        setPilotId(editOperation.fk_pilot_user_id?.toString() ?? '')
        setVisualObserverIds((editOperation.visual_observer_ids ?? []).map(o => String(o.user_id)))
        setPlanId(editOperation.fk_planning_id?.toString() ?? '')
        setOpType((editOperation.op_type as OpType) || (editOperation.fk_planning_id ? 'PDRA' : 'OPEN'))
        setFlightMode(editOperation.flight_mode === 'DOCK' ? 'DOCK' : 'RC')
        setErpGroupId(editOperation.fk_erp_group_id?.toString() ?? '')
        setUspaceId(editOperation.uspace_id ?? '')
        setSkipDFlight(!!editOperation.dflight_skip_authorization)
        setCircle(
            editOperation.dflight_trajectory_data?.type === 'circle'
                ? { lat: editOperation.dflight_trajectory_data.center.lat, lng: editOperation.dflight_trajectory_data.center.lng, radiusM: editOperation.dflight_trajectory_data.radius_m }
                : null
        )
        setSchedulerForm({
            missionCode: editOperation.mission_code ?? '',
            scheduledStart: utcToLocalInput(editOperation.scheduled_start, timezone),
            scheduledEnd: utcToLocalInput(editOperation.actual_end, timezone),
            missionName: editOperation.mission_name ?? '',
            location: editOperation.location ?? '',
            locationLat: editOperation.location_latitude != null ? String(editOperation.location_latitude) : '',
            locationLng: editOperation.location_longitude != null ? String(editOperation.location_longitude) : '',
            locationPseudoName: editOperation.location_pseudo_name ?? '',
            notes: editOperation.notes ?? '',
            distanceFlown: editOperation.distance_flown != null ? String(editOperation.distance_flown) : '',
            typeId: editOperation.fk_mission_type_id?.toString() ?? '',
            categoryId: editOperation.fk_mission_category_id?.toString() ?? '',
            lucId: editOperation.fk_luc_procedure_id?.toString() ?? '',
            groupLabel: editOperation.mission_group_label ?? '',
        })
        setStep(1)
    }, [editOperation, open])

    // Seed mission code, start,and end distance from a flight log when this
    // mission is being created specifically to attach that log (control-center flow).
    useEffect(() => {
        if (!open || isEdit || !createPrefill) return
        setSchedulerForm(prev => ({
            ...prev,
            missionCode: createPrefill.missionCode || prev.missionCode,
            scheduledStart: createPrefill.scheduledStart ? utcToLocalInput(createPrefill.scheduledStart, timezone) : prev.scheduledStart,
            scheduledEnd: createPrefill.scheduledEnd ? utcToLocalInput(createPrefill.scheduledEnd, timezone) : prev.scheduledEnd,
            distanceFlown: createPrefill.distanceFlown != null ? String(createPrefill.distanceFlown) : prev.distanceFlown,
        }))
    }, [open, isEdit, createPrefill])

    // OPM approval may depend on the system (zone-validated flight requests skip it).
    useEffect(() => { if (fr) setApproval(null) }, [droneId])

    // Pre-select the PIC themselves (they are the only pilot they can choose).
    useEffect(() => {
        if (!open || isEdit || !fr || currentUser?.role !== 'PIC' || pilotId) return
        if (pilots.some(p => p.user_id === currentUser.id)) setPilotId(String(currentUser.id))
    }, [open, isEdit, fr?.request_id, currentUser, pilots, pilotId])

    // Prefill from the flight request: client, start time, location and target.
    useEffect(() => {
        if (!open || !fr) return
        frToolPicked.current = false
        if (fr.client_id) setClientId(String(fr.client_id))
        setSchedulerForm(prev => ({
            ...prev,
            missionName: prev.missionName || fr.target || fr.mission_type || fr.external_mission_id,
            scheduledStart: fr.start_datetime ? utcToLocalInput(fr.start_datetime, timezone) : prev.scheduledStart,
            locationLat: fr.latitude != null ? String(fr.latitude) : prev.locationLat,
            locationLng: fr.longitude != null ? String(fr.longitude) : prev.locationLng,
            locationPseudoName: prev.locationPseudoName || fr.external_mission_id,
            notes: prev.notes || [`Flight request ${fr.external_mission_id}`, fr.notes].filter(Boolean).join(' — '),
        }))
    }, [open, fr?.request_id])

    useEffect(() => {
        if (!fr?.matched_tool_id || frToolPicked.current || droneId) return
        if (drones.some(d => d.tool_id === fr.matched_tool_id)) {
            frToolPicked.current = true
            setDroneId(String(fr.matched_tool_id))
        }
    }, [drones, fr?.matched_tool_id, droneId])

    useEffect(() => {
        if (!clientId) {
            setDrones([]); setDroneId(''); setPlanId(''); setMissionPlanningId('')
            return
        }
        // On initial edit load the ref is set — fetch drones but keep pre-filled selections
        const keepSelections = skipDroneReset.current
        skipDroneReset.current = false
        if (!keepSelections) { setDroneId(''); setPlanId('') }
        setLoadingDrones(true)
        axios.get(`/api/operation/import/options?type=drones&client_id=${clientId}`)
            .then(r => {
                const all: Drone[] = r.data.drones ?? []
                // For a flight request, only the client's systems with operation zones (covering ones first).
                const zoned = fr?.zoned_tool_ids ?? []
                setDrones(zoned.length
                    ? zoned.map(id => all.find(d => d.tool_id === id)).filter((d): d is Drone => !!d)
                    : all)
            })
            .catch(() => toast.error(t('operations.newOperation.toast.loadOptionsError')))
            .finally(() => setLoadingDrones(false))
    }, [clientId])

    useEffect(() => {
        if (!planId || opType !== 'PDRA') {
            setMissionPlannings([]); setMissionPlanningId('')
            return
        }
        setLoadingMissionPlannings(true)
        axios.post('/api/evaluation/planning/logbook', { p_id: parseInt(planId) })
            .then(r => {
                const missions = (r.data.data ?? []) as MissionPlanningOption[]
                setMissionPlannings(missions)
                if (missions.length > 0 && !missionPlanningId) {
                    setMissionPlanningId(String(missions[0].mission_planning_id))
                }
            })
            .catch(() => toast.error(t('operations.newOperation.toast.loadOptionsError')))
            .finally(() => setLoadingMissionPlannings(false))
    }, [planId, opType])

    useEffect(() => {
        if (step === 3 && !schedulerForm.missionCode) refreshMissionId()
    }, [step])

    useEffect(() => {
        if (step !== 4 || isEdit || approval) return
        axios.get('/api/operation/approvals/eligibility', {
            params: fr && droneId ? { flight_request_id: fr.request_id, tool_id: droneId } : undefined,
        })
            .then(({ data }) => setApproval({ required: !!data.required, department: data.department ?? null, opmCount: data.opmCount ?? 0, zoneValidated: !!data.zone_validated }))
            .catch(() => {})
    }, [step, isEdit, approval])

    useEffect(() => {
        if (step !== 3 || !droneId || !schedulerForm.scheduledStart) {
            setConflicts([]); setConflictChecked(false); return
        }
        let cancelled = false
        setLoadingConflicts(true); setConflictChecked(false)
        axios.get('/api/operation/calendar')
            .then(res => {
                if (cancelled) return
                const events: any[] = res.data.data ?? []
                const s = new Date(localInputToUtcIso(schedulerForm.scheduledStart, timezone)!).getTime()
                const endIso = localInputToUtcIso(schedulerForm.scheduledEnd, timezone)
                const e = endIso ? new Date(endIso).getTime() : s + 3_600_000
                setConflicts(events.filter(ev => {
                    if (String(ev.operation?.fk_tool_id) !== droneId) return false
                    if (isEdit && ev.operation?.pilot_mission_id === editOperation?.pilot_mission_id) return false
                    const evS = new Date(ev.start).getTime()
                    const evE = ev.end ? new Date(ev.end).getTime() : evS + 3_600_000
                    return s < evE && e > evS
                }))
                setConflictChecked(true)
            })
            .catch(() => { if (!cancelled) setConflictChecked(true) })
            .finally(() => { if (!cancelled) setLoadingConflicts(false) })
        return () => { cancelled = true }
    }, [step, droneId, schedulerForm.scheduledStart, schedulerForm.scheduledEnd])

    useEffect(() => {
        if (!isEdit || editTab !== 'execution') return
        setLoadingErps(true)
        axios.get('/api/erp/list')
            .then(res => setErps(res.data.data ?? []))
            .catch(() => toast.error(t('operations.newOperation.toast.loadErpsError')))
            .finally(() => setLoadingErps(false))
    }, [editTab, isEdit])

    useEffect(() => {
        if (!isEdit || editTab !== 'postFlight' || !editOperation) return
        setLoadingPostFlight(true)
        axios.get(`/api/operation/board/post-flight?mission_id=${editOperation.pilot_mission_id}`)
            .then(res => {
                if (res.data.code === 1 && res.data.data) {
                    const { flight, result_options } = res.data.data
                    setResultOptions(result_options ?? [])
                    setPostFlight({
                        actual_start: isoToLocalInput(flight?.actual_start),
                        actual_end: isoToLocalInput(flight?.actual_end),
                        result_id: flight?.fk_mission_result_type_id ?? null,
                        flight_duration_min: flight?.flight_duration != null ? String(flight.flight_duration) : '',
                        distance_m: flight?.distance_flown != null ? String(flight.distance_flown) : '',
                        battery_charge_start: flight?.battery_charge_start != null ? String(flight.battery_charge_start) : '',
                        battery_charge_end: flight?.battery_charge_end != null ? String(flight.battery_charge_end) : '',
                        incident_flag: flight?.incident_flag ?? false,
                        rth_unplanned: flight?.rth_unplanned ?? false,
                        link_loss: flight?.link_loss ?? false,
                        deviation_flag: flight?.deviation_flag ?? false,
                        weather_temp: flight?.weather_temperature != null ? String(flight.weather_temperature) : '',
                        notes: flight?.notes ?? '',
                    })
                }
            })
            .catch(() => toast.error(t('operations.newOperation.toast.loadPostFlightError')))
            .finally(() => setLoadingPostFlight(false))
    }, [editTab, isEdit, editOperation])

    useEffect(() => {
        if (!isEdit || editTab !== 'postFlight' || !editOperation) return
        setLoadingWaypoints(true)
        axios.get(`/api/operation/board/flight-logs/waypoints?mission_id=${editOperation.pilot_mission_id}`)
            .then(res => setFlightWaypoints(res.data?.data?.waypoints ?? []))
            .catch(() => setFlightWaypoints([]))
            .finally(() => setLoadingWaypoints(false))
    }, [editTab, isEdit, editOperation])


    function generateMissionId(exclude: Set<string>): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let id: string
        let attempts = 0
        do {
            id = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
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
            setSchedulerForm(prev => ({ ...prev, missionCode: generateMissionId(codes) }))
        } catch {
            setSchedulerForm(prev => ({ ...prev, missionCode: generateMissionId(existingMissionCodes) }))
        } finally {
            setGeneratingId(false)
        }
    }

    function resetForm() {
        setStep(1); setEditTab('data'); setIsSubmitting(false)
        setClientId(''); setOpType('OPEN'); setDroneId(''); setPlanId(''); setMissionPlanningId(''); setFlightMode('RC')
        setPilotId(''); setVisualObserverIds([]); setDrones([]); setClients([]); setPlannings([])
        setMissionPlannings([]); setLoadingMissionPlannings(false)
        setTypes([]); setCategories([]); setLucProcedures([]); setPilots([])
        setExistingMissionCodes(new Set()); setGeneratingId(false)
        setConflicts([]); setConflictChecked(false)
        setErps([]); setResultOptions([])
        setFlightWaypoints([]); setLoadingWaypoints(false)
        setErpGroupId(''); setErpGroups([]); setLoadingErpGroups(false)
        setUspaceId(''); setUspaces([]); setLoadingUspaces(false); setDFlightEnabled(false); setSkipDFlight(false); setUspaceError('')
        setCircle(null); setUspaceFocus(null)
        setIsRecurrent(false); setRecurrentDays([]); setRecurrentEndDate(''); setRecurrentDateError('')
        setSchedulerForm({
            missionCode: '', scheduledStart: '', scheduledEnd: '',
            missionName: '', location: '', locationLat: '', locationLng: '', locationPseudoName: '',
            notes: '', distanceFlown: '',
            typeId: '', categoryId: '', lucId: '', groupLabel: '',
        })
        setPostFlight({
            actual_start: '', actual_end: '', result_id: null, flight_duration_min: '', distance_m: '',
            battery_charge_start: '', battery_charge_end: '',
            incident_flag: false, rth_unplanned: false, link_loss: false, deviation_flag: false,
            weather_temp: '', notes: '',
        })
    }

    function handleSchedulerChange<K extends keyof SchedulerFormData>(field: K, value: SchedulerFormData[K]) {
        setSchedulerForm(prev => ({ ...prev, [field]: value }))
    }

    function handlePostFlightChange<K extends keyof PostFlightState>(field: K, value: PostFlightState[K]) {
        setPostFlight(prev => ({ ...prev, [field]: value }))
    }

    const canNext = () => {
        if (step === 1) return isEdit || !!clientId
        if (step === 2) {
            if (!droneId) return false
            if (logSerialNumber) {
                const selected = drones.find(d => String(d.tool_id) === droneId)
                if (!serialInList(selected?.drone_serial_numbers, logSerialNumber)) return false
            }
            if (opType === 'PDRA') {
                if (!planId) return false
                const selected = clientPlannings.find(p => String(p.planning_id) === planId)
                if (selected && selected.planning_active === 'N') return false
            }
            return true
        }
        if (step === 3) {
            if (!schedulerForm.missionCode.trim() || !schedulerForm.lucId) return false
            if (!schedulerForm.typeId || !schedulerForm.categoryId) return false
            if (!schedulerForm.scheduledStart) return false
            if (isRecurrent && !validateRecurrentDates()) return false
            return true
        }
        if (step === 4) {
            if (!pilotId) return false
            if (uspaceRequired && !uspaceId) return false
            if (circleRequired && (!circle || circle.radiusM > circleMaxRadiusM)) return false
            return true
        }
        return true
    }

    const uspaceRequired = dFlightEnabled && !skipDFlight && ['PDRA', 'OPEN', 'STS-01', 'STS-02', 'NO-STD'].includes(opType)
    const circleRequired = dFlightEnabled && !skipDFlight && ['OPEN', 'STS-01', 'STS-02', 'NO-STD'].includes(opType)
    // D-Flight rejects h_buffer beyond the selected U-space's own registered
    // protection_buffers_horizontal constraint, independent of geometry — cap
    // the drawable/submittable radius to whichever limit is tighter.
    const circleMaxRadiusM = Math.min(
        DFLIGHT_CIRCLE_MAX_RADIUS_M,
        uspaces.find(u => u.id === uspaceId)?.maxHBufferM ?? DFLIGHT_CIRCLE_MAX_RADIUS_M,
    )

    const clientPlannings = plannings
        .filter(p => String(p.fk_client_id) === clientId)
        .sort((a, b) => {
            const aActive = !a.planning_active || a.planning_active === 'Y' ? 0 : 1
            const bActive = !b.planning_active || b.planning_active === 'Y' ? 0 : 1
            return aActive - bActive
        })


    async function handleSubmit() {
        if (!canNext() || !pilotId) return
        setIsSubmitting(true)
        try {
            if (isEdit && editOperation) {
                const payload = {
                    mission_code: schedulerForm.missionCode.trim(),
                    mission_name: schedulerForm.missionName.trim(),
                    scheduled_start: localInputToUtcIso(schedulerForm.scheduledStart, timezone),
                    actual_end: localInputToUtcIso(schedulerForm.scheduledEnd, timezone),
                    fk_pilot_user_id: parseInt(pilotId),
                    fk_tool_id: droneId ? parseInt(droneId) : null,
                    fk_client_id: clientId ? parseInt(clientId) : null,
                    fk_mission_type_id: schedulerForm.typeId ? parseInt(schedulerForm.typeId) : null,
                    fk_mission_category_id: schedulerForm.categoryId ? parseInt(schedulerForm.categoryId) : null,
                    fk_planning_id: planId ? parseInt(planId) : null,
                    fk_mission_planning_id: missionPlanningId ? parseInt(missionPlanningId) : null,
                    fk_erp_group_id: erpGroupId && erpGroupId !== 'none' ? parseInt(erpGroupId) : null,
                    location: schedulerForm.location || undefined,
                    location_latitude: schedulerForm.locationLat !== '' ? parseFloat(schedulerForm.locationLat) : null,
                    location_longitude: schedulerForm.locationLng !== '' ? parseFloat(schedulerForm.locationLng) : null,
                    location_pseudo_name: schedulerForm.locationPseudoName.trim() || null,
                    notes: schedulerForm.notes || undefined,
                    distance_flown: schedulerForm.distanceFlown !== '' ? parseFloat(schedulerForm.distanceFlown) : null,
                    flight_mode: opType === 'PDRA' ? flightMode : null,
                    op_type: opType,
                    mission_group_label: schedulerForm.groupLabel.trim() || null,
                    uspace_id: skipDFlight ? null : (uspaceId || null),
                    ...(dFlightEnabled && { dflight_skip_authorization: skipDFlight }),
                    dflight_trajectory_data: circleRequired && circle
                        ? { type: 'circle' as const, center: { lat: circle.lat, lng: circle.lng }, radius_m: circle.radiusM }
                        : null,
                }
                const res = await axios.put(`/api/operation/${editOperation.pilot_mission_id}`, payload)
                toast.success(t('operations.newOperation.toast.updateSuccess'))
                onSaved?.(res.data)
                onSuccess(); onClose()
                return
            }

            const payload = {
                mission_code: schedulerForm.missionCode.trim(),
                mission_name: schedulerForm.missionName.trim(),
                scheduled_start: localInputToUtcIso(schedulerForm.scheduledStart, timezone),
                actual_end: localInputToUtcIso(schedulerForm.scheduledEnd, timezone),
                fk_pilot_user_id: parseInt(pilotId),
                fk_tool_id: droneId ? parseInt(droneId) : null,
                fk_client_id: clientId ? parseInt(clientId) : null,
                fk_mission_type_id: schedulerForm.typeId ? parseInt(schedulerForm.typeId) : null,
                fk_mission_category_id: schedulerForm.categoryId ? parseInt(schedulerForm.categoryId) : null,
                fk_planning_id: planId ? parseInt(planId) : null,
                fk_mission_planning_id: missionPlanningId ? parseInt(missionPlanningId) : null,
                fk_luc_procedure_id: parseInt(schedulerForm.lucId),
                fk_erp_group_id: erpGroupId && erpGroupId !== 'none' ? parseInt(erpGroupId) : null,
                location: schedulerForm.location || undefined,
                location_latitude: schedulerForm.locationLat !== '' ? parseFloat(schedulerForm.locationLat) : null,
                location_longitude: schedulerForm.locationLng !== '' ? parseFloat(schedulerForm.locationLng) : null,
                location_pseudo_name: schedulerForm.locationPseudoName.trim() || null,
                notes: schedulerForm.notes || undefined,
                distance_flown: schedulerForm.distanceFlown !== '' ? parseFloat(schedulerForm.distanceFlown) : null,
                flight_mode: opType === 'PDRA' ? flightMode : null,
                op_type: opType,
                mission_group_label: schedulerForm.groupLabel.trim() || undefined,
                uspace_id: skipDFlight ? undefined : (uspaceId || undefined),
                ...(dFlightEnabled && skipDFlight && { dflight_skip_authorization: true }),
                dflight_trajectory_data: circleRequired && circle
                    ? { type: 'circle' as const, center: { lat: circle.lat, lng: circle.lng }, radius_m: circle.radiusM }
                    : undefined,
                // A mission created to attach an already-flown log is inherently
                // completed, not scheduled for the future.
                status_name: createPrefill ? 'COMPLETED' : 'PLANNED',
                ...(visualObserverIds.length > 0 && { visual_observer_ids: visualObserverIds.map(Number) }),
                ...(fr && { flight_request_id: fr.request_id }),
                ...(isRecurrent && {
                    is_recurrent: true,
                    recurrent_days_of_week: recurrentDays,
                    recurrent_end_date: recurrentEndDate || undefined,
                }),
            }
            const res = await axios.post('/api/operation', payload)
            if (!res.data.success) throw new Error(res.data.error ?? t('operations.newOperation.toast.createError'))
            
            // Show appropriate success message for recurrent missions
            if (fr) {
                if (res.data.flight_request?.linked) toast.success(t('operations.flightRequestMission.createdLinked', { request: fr.external_mission_id }))
                else toast.warning(t('operations.flightRequestMission.linkFailed', { error: res.data.flight_request?.error ?? '' }))
            }
            if (res.data.approval_required) {
                toast.success(t('operations.opmApproval.submittedToast'))
            } else if (res.data.created_missions && res.data.created_missions.length > 1) {
                toast.success(t('operations.newOperation.toast.createRecurrentSuccess', { count: res.data.created_missions.length }))
            } else {
                toast.success(t('operations.newOperation.toast.createSuccess'))
            }

            // Mission creation itself succeeded — D-Flight authorization is a
            // separate, non-fatal step, so surface its failure alongside the
            // success toast rather than blocking on it.
            const dflightErrors: Array<{ missionCode: string; message: string }> = res.data.dflight_errors ?? []
            dflightErrors.forEach(e => {
                showDFlightErrorToast(t('operations.newOperation.toast.dflightAuthError', { missionCode: e.missionCode }), e.message)
            })

            onSaved?.(res.data)
            onSuccess(); onClose()
        } catch (err: any) {
            const data = err.response?.data
            const fallback = isEdit ? t('operations.newOperation.toast.updateError') : t('operations.newOperation.toast.createError')

            // a readable description from field-level validation errors
            const fieldErrors: Record<string, string[]> | undefined = data?.errors
            const fieldDescription = fieldErrors
                ? Object.entries(fieldErrors)
                    .filter(([, msgs]) => (msgs as string[]).length > 0)
                    .map(([field, msgs]) => `${field.replace(/_/g, ' ')}: ${(msgs as string[])[0]}`)
                    .join('\n')
                : undefined

            const title = data?.errorTitle || data?.error || err.message || fallback

            const errorMessage = fieldDescription ? `${title}\n\n${fieldDescription}` : title

            toastWithDcc({ title: errorMessage, variant: 'error' }, data?.dcc)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleSubmitPostFlight() {
        if (!editOperation) return
        const payload: Record<string, unknown> = {
            mission_id: editOperation.pilot_mission_id,
            flight_duration: postFlight.flight_duration_min ? parseInt(postFlight.flight_duration_min, 10) : null,
            actual_start: postFlight.actual_start ? new Date(postFlight.actual_start).toISOString() : null,
            actual_end: postFlight.actual_end ? new Date(postFlight.actual_end).toISOString() : null,
            distance_flown: postFlight.distance_m ? parseFloat(postFlight.distance_m) : null,
            battery_charge_start: postFlight.battery_charge_start ? parseFloat(postFlight.battery_charge_start) : null,
            battery_charge_end: postFlight.battery_charge_end ? parseFloat(postFlight.battery_charge_end) : null,
            incident_flag: postFlight.incident_flag,
            rth_unplanned: postFlight.rth_unplanned,
            link_loss: postFlight.link_loss,
            deviation_flag: postFlight.deviation_flag,
            weather_temperature: postFlight.weather_temp ? parseFloat(postFlight.weather_temp) : null,
            notes: postFlight.notes || null,
            fk_mission_result_type_id: postFlight.result_id,
        }
        setSubmittingPostFlight(true)
        try {
            const { data } = await axios.post('/api/operation/board/post-flight', payload)
            if (data.code === 1) {
                toast.success(t('operations.newOperation.toast.postFlightSuccess'))
                onSuccess(); onClose()
            } else {
                toast.error(data.message || t('operations.newOperation.toast.postFlightError'))
            }
        } catch (e: any) {
            toast.error(e.response?.data?.message ?? t('operations.newOperation.toast.postFlightError'))
        } finally {
            setSubmittingPostFlight(false)
        }
    }


    const clientsForSelect = (isEdit && editOperation?.fk_client_id && !clients.some(c => c.client_id === editOperation.fk_client_id))
        ? [...clients, { client_id: editOperation.fk_client_id, client_name: editOperation.client_name ?? '', client_code: '' }]
        : clients

    const selectedClient = clientsForSelect.find(c => String(c.client_id) === clientId)
    const selectedDrone = drones.find(d => String(d.tool_id) === droneId)
    const selectedPlan = clientPlannings.find(p => String(p.planning_id) === planId)
    // A PIC creating a mission for a flight request can only fly it themselves (managers included).
    const pilotSelfOnly = !!fr && currentUser?.role === 'PIC'
    const pilotOptions = pilotSelfOnly ? pilots.filter(p => p.user_id === currentUser!.id) : pilots
    const selectedPilot = pilots.find(p => String(p.user_id) === pilotId)
    const selectedLuc = lucProcedures.find(p => String(p.id) === schedulerForm.lucId)


    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className={cn('max-w-[calc(100%-1rem)] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl gap-0 p-0 overflow-hidden max-h-[95dvh] flex flex-col', isDark && 'bg-slate-800 border-slate-700 text-white')}>
                <DialogHeader className={cn('px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 border-b shrink-0', isDark ? 'border-slate-700' : 'border-gray-100')}>
                    <DialogTitle className={cn('text-base font-semibold', isDark && 'text-white')}>
                        {isEdit ? t('operations.newOperation.editTitle') : t('operations.newOperation.title')}
                    </DialogTitle>
                </DialogHeader>

                {fr && (
                    <div className={cn('px-4 sm:px-6 py-3 border-b shrink-0 text-xs', isDark ? 'border-slate-700 bg-violet-500/10' : 'border-gray-100 bg-violet-50')}>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Plane className="h-3.5 w-3.5 text-violet-500" />
                            <span className={cn('font-semibold', isDark ? 'text-violet-300' : 'text-violet-700')}>{t('operations.flightRequestMission.header')}</span>
                            <span className="font-mono font-semibold">{fr.external_mission_id}</span>
                            {fr.client_name && <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>· {fr.client_name}</span>}
                            {fr.priority && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-600">{fr.priority}</span>}
                        </div>
                        <div className={cn('mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1', isDark ? 'text-slate-300' : 'text-gray-600')}>
                            <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">
                                    {fr.latitude != null && fr.longitude != null
                                        ? `${fr.latitude.toFixed(6)}, ${fr.longitude.toFixed(6)}`
                                        : fr.localization?.highway
                                            ? `${fr.localization.highway}${fr.localization.kmStart !== undefined ? ` km ${fr.localization.kmStart}–${fr.localization.kmEnd ?? ''}` : ''}`
                                            : '—'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                                <ShieldCheck className={cn('h-3.5 w-3.5 shrink-0', fr.zone_validated ? 'text-green-500' : 'text-slate-400')} />
                                <span className="truncate">
                                    {t('operations.flightRequestMission.nearestSystem')}: {fr.matched_tool_code ?? '—'}
                                    {fr.distance_m != null && ` (${(fr.distance_m / 1000).toFixed(1)} km)`}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{t('operations.flightRequestMission.requestedFor')}: {fr.start_datetime ? utcToLocalInput(fr.start_datetime, timezone).replace('T', ' ') : '—'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Clock className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                <span className="truncate">{t('operations.flightRequestMission.receivedAt')}: {utcToLocalInput(fr.received_at, timezone).replace('T', ' ')}</span>
                            </div>
                        </div>
                        {(fr.target || fr.mission_type) && (
                            <div className={cn('mt-1', isDark ? 'text-slate-400' : 'text-gray-500')}>
                                {[fr.mission_type, fr.target, fr.operator].filter(Boolean).join(' · ')}
                            </div>
                        )}
                    </div>
                )}

                {/* Edit tab bar */}
                {isEdit && (
                    <div className={cn('flex border-b overflow-x-auto scrollbar-thin shrink-0', isDark ? 'border-slate-700' : 'border-gray-200')}>
                        {EDIT_TABS.map(tab => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setEditTab(tab.id)}
                                    className={cn(
                                        'flex flex-1 items-center justify-center cursor-pointer gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                                        editTab === tab.id
                                            ? 'border-violet-600 text-violet-600'
                                            : isDark
                                                ? 'border-transparent text-slate-400 hover:text-slate-200'
                                                : 'border-transparent text-slate-500 hover:text-slate-800'
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {t(tab.labelKey)}
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Step progress bar — data tab only */}
                {(!isEdit || editTab === 'data') && (
                    <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 shrink-0">
                        <div className="flex items-center gap-0">
                            {STEPS.map((s, i) => {
                                const Icon = s.icon
                                const done = step > s.id
                                const active = step === s.id
                                return (
                                    <div key={s.id} className="flex items-center flex-1">
                                        <div className="flex flex-col items-center gap-1 flex-1">
                                            <div className={cn(
                                                'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                                                done ? 'bg-emerald-600 text-white'
                                                    : active ? 'bg-violet-600 text-white ring-4 ring-violet-100 dark:ring-violet-900'
                                                        : 'bg-muted text-muted-foreground'
                                            )}>
                                                {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                            </div>
                                            <span className={cn(
                                                'text-[9px] sm:text-[10px] font-medium text-center sm:whitespace-nowrap',
                                                active ? 'text-violet-600' : done ? 'text-emerald-600' : 'text-muted-foreground'
                                            )}>
                                                {s.label}
                                            </span>
                                        </div>
                                        {i < STEPS.length - 1 && (
                                            <div className={cn('h-0.5 flex-1 -mt-3.5 mx-1 transition-all', done ? 'bg-emerald-400' : 'bg-muted')} />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Tab content */}
                <div className="px-4 sm:px-6 py-4 sm:py-5 flex-none shrink min-h-0 h-[60dvh] overflow-y-auto scrollbar-thin overflow-x-hidden">

                    {(!isEdit || editTab === 'data') && step === 1 && (
                        <OperationStepClient
                            clients={clientsForSelect}
                            clientId={clientId}
                            onClientChange={setClientId}
                            loadingClients={loadingClients}
                            isDark={isDark}
                            disabled={!!fr?.client_id}
                        />
                    )}

                    {(!isEdit || editTab === 'data') && step === 2 && (
                        <OperationStepDrone
                            opType={opType}
                            onOpTypeChange={t => { setOpType(t); setPlanId(''); setMissionPlanningId(''); setFlightMode('RC') }}
                            droneId={droneId}
                            onDroneChange={id => { setDroneId(id); setPlanId(''); setMissionPlanningId('') }}
                            drones={drones}
                            loadingDrones={loadingDrones}
                            planId={planId}
                            onPlanChange={setPlanId}
                            clientPlannings={clientPlannings}
                            missionPlannings={missionPlannings}
                            missionPlanningId={missionPlanningId}
                            onMissionPlanningChange={setMissionPlanningId}
                            loadingMissionPlannings={loadingMissionPlannings}
                            flightMode={flightMode}
                            onFlightModeChange={setFlightMode}
                            loadingOptions={loadingOptions}
                            isDark={isDark}
                            erpGroups={erpGroups}
                            erpGroupId={erpGroupId}
                            onErpGroupChange={setErpGroupId}
                            loadingErpGroups={loadingErpGroups}
                            selectedPlanName={editOperation?.planning_name ?? undefined}
                            logSerialNumber={logSerialNumber}
                        />
                    )}

                    {(!isEdit || editTab === 'data') && step === 3 && (
                        <OperationStepScheduler
                            form={schedulerForm}
                            onChange={handleSchedulerChange}
                            isEdit={isEdit}
                            statusName={isEdit
                                ? (editOperation?.status_name ?? '')
                                : (createPrefill
                                    ? t('operations.newOperation.scheduler.completed')
                                    : t('operations.newOperation.scheduler.scheduled'))}
                            generatingId={generatingId}
                            onRefreshMissionId={refreshMissionId}
                            loadingConflicts={loadingConflicts}
                            conflictChecked={conflictChecked}
                            conflicts={conflicts}
                            timezone={timezone}
                            types={types}
                            categories={categories}
                            lucProcedures={lucProcedures}
                            loadingOptions={loadingOptions}
                            isDark={isDark}
                            isRecurrent={isRecurrent}
                            onRecurrentToggle={handleRecurrentToggle}
                            recurrentDays={recurrentDays}
                            onRecurrentDaysChange={setRecurrentDays}
                            recurrentEndDate={recurrentEndDate}
                            onRecurrentEndDateChange={setRecurrentEndDate}
                            onRecurrentDateErrorChange={setRecurrentDateError}
                            toolId={droneId ? Number(droneId) : undefined}
                            systemLocation={
                                selectedDrone?.tool_latitude != null && selectedDrone?.tool_longitude != null
                                    ? { latitude: selectedDrone.tool_latitude, longitude: selectedDrone.tool_longitude, name: selectedDrone.tool_location_name }
                                    : null
                            }
                        />
                    )}

                    {(!isEdit || editTab === 'data') && step === 4 && (
                        <OperationStepPilot
                            pilots={pilotOptions}
                            observerOptions={pilots}
                            pilotId={pilotId}
                            onPilotChange={setPilotId}
                            visualObserverIds={visualObserverIds}
                            onVisualObserverChange={setVisualObserverIds}
                            loadingOptions={loadingOptions}
                            uspaces={uspaces}
                            uspaceId={uspaceId}
                            onUspaceChange={setUspaceId}
                            loadingUspaces={loadingUspaces}
                            dFlightEnabled={uspaceRequired}
                            showSkipDFlight={dFlightEnabled}
                            skipDFlight={skipDFlight}
                            onSkipDFlightChange={setSkipDFlight}
                            uspaceError={uspaceError}
                            circle={circle}
                            onCircleChange={setCircle}
                            circleMaxRadiusM={circleMaxRadiusM}
                            circleFocusCenter={uspaceFocus}
                            uspaceBoundary={uspaces.find(u => u.id === uspaceId)?.boundary ?? null}
                            isDark={isDark}
                            summary={{
                                clientName: selectedClient?.client_name,
                                opType,
                                droneLabel: selectedDrone ? droneListLabel(selectedDrone) : undefined,
                                planName: selectedPlan?.planning_name,
                                flightMode,
                                missionCode: schedulerForm.missionCode,
                                missionName: schedulerForm.missionName,
                                scheduledStart: schedulerForm.scheduledStart,
                                timezone,
                                typeId: schedulerForm.typeId,
                                categoryId: schedulerForm.categoryId,
                                types,
                                categories,
                                lucLabel: selectedLuc?.label,
                                pilotName: selectedPilot ? `${selectedPilot.first_name} ${selectedPilot.last_name}` : undefined,
                                location: schedulerForm.location,
                                locationPseudoName: schedulerForm.locationPseudoName || undefined,
                                uspaceLabel: uspaces.find(u => u.id === uspaceId)?.name ?? (uspaceId || undefined),
                            }}
                        />
                    )}

                    {!isEdit && step === 4 && fr && approval?.zoneValidated && (
                        <div className={cn('mx-4 my-2 sm:mx-6 mb-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs', isDark ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-green-200 bg-green-50 text-green-700')}>
                            <ShieldCheck className="h-4 w-4 shrink-0 mt-px" />
                            <span>{t('operations.flightRequestMission.noOpmNeeded')}</span>
                        </div>
                    )}
                    {!isEdit && step === 4 && approval?.required && (
                        <div
                            className={cn(
                                'mt-4 flex items-start gap-2 rounded-lg border p-3 text-xs',
                                approval.opmCount > 0
                                    ? isDark ? 'border-sky-500/30 bg-sky-500/10 text-sky-300' : 'border-sky-200 bg-sky-50 text-sky-800'
                                    : isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-800',
                            )}
                        >
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <p className="font-semibold">{t('operations.opmApproval.modal.title')}</p>
                                <p>
                                    {approval.opmCount > 0
                                        ? t('operations.opmApproval.modal.willBeSubmitted', { department: approval.department, count: approval.opmCount })
                                        : approval.department
                                            ? t('operations.opmApproval.modal.noOpm', { department: approval.department })
                                            : t('operations.opmApproval.modal.noDepartment')}
                                </p>
                            </div>
                        </div>
                    )}

                    {isEdit && editTab === 'execution' && (
                        <OperationErpTab erps={erps} loadingErps={loadingErps} isDark={isDark} />
                    )}

                    {isEdit && editTab === 'log' && editOperation && (
                        <EditMissionLogTab missionId={editOperation.pilot_mission_id} isDark={isDark} />
                    )}

                    {isEdit && editTab === 'postFlight' && (
                        <PostFlightTab
                            data={postFlight}
                            resultOptions={resultOptions}
                            loading={loadingPostFlight}
                            fromLog={postFlightFromLog}
                            isDark={isDark}
                            onChange={handlePostFlightChange}
                            waypoints={flightWaypoints}
                            loadingWaypoints={loadingWaypoints}
                        />
                    )}

                    {isEdit && editTab === 'maintenance' && editOperation && (
                        <OperationMaintenanceTab
                            ref={maintRef}
                            toolId={editOperation.fk_tool_id ?? 0}
                            missionId={editOperation.pilot_mission_id}
                            active={editTab === 'maintenance'}
                            isDark={isDark}
                            onSuccess={onSuccess}
                            onSubmittingChange={setSubmittingMaint}
                        />
                    )}
                </div>

                {/* Footer — data tab (step navigation) */}
                {(!isEdit || editTab === 'data') && (
                    <div className={cn('flex items-center justify-between gap-2 px-4 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-2 border-t shrink-0', isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-muted/20')}>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => step === 1 ? onClose() : setStep(s => s - 1)}
                            disabled={isSubmitting}
                            className={cn('gap-1', isDark && 'border-slate-600 text-slate-300 hover:bg-slate-700')}
                        >
                            {step === 1 ? t('operations.newOperation.buttons.cancel') : <><ChevronLeft className="h-4 w-4" /> {t('operations.newOperation.buttons.previous')}</>}
                        </Button>
                        {step < 4 ? (
                            <Button
                                size="sm"
                                onClick={() => setStep(s => s + 1)}
                                disabled={!canNext()}
                                className="gap-1 bg-violet-600 hover:bg-violet-700 text-white"
                            >
                                {t('operations.newOperation.buttons.next')} <ChevronRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !pilotId || !schedulerForm.missionCode.trim() || !schedulerForm.lucId || !schedulerForm.typeId || !schedulerForm.categoryId || !schedulerForm.scheduledStart || (uspaceRequired && !uspaceId) || (circleRequired && (!circle || circle.radiusM > circleMaxRadiusM))}
                                className="gap-2 cursor-pointer bg-violet-600 hover:bg-violet-700 text-white sm:min-w-40"
                            >
                                {isSubmitting
                                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {isEdit ? t('operations.newOperation.buttons.saving') : t('operations.newOperation.buttons.creating')}</>
                                    : isEdit ? t('operations.newOperation.buttons.saveChanges')
                                        : approval?.required ? t('operations.opmApproval.modal.submitButton') : t('operations.newOperation.buttons.createOperation')
                                }
                            </Button>
                        )}
                    </div>
                )}

                {/* Footer — other edit tabs */}
                {isEdit && editTab !== 'data' && (
                    <div className={cn('flex items-center justify-end gap-2 px-4 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-2 border-t shrink-0', isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-muted/20')}>
                        <Button variant="outline" size="sm" onClick={onClose} className={cn(isDark && 'border-slate-600 text-slate-300 hover:bg-slate-700')}>
                            {t('operations.newOperation.buttons.close')}
                        </Button>
                        {editTab === 'postFlight' && (
                            <Button
                                size="sm"
                                onClick={handleSubmitPostFlight}
                                disabled={submittingPostFlight || loadingPostFlight || !!(postFlight.actual_start && postFlight.actual_end && postFlight.actual_end < postFlight.actual_start)}
                                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                            >
                                {submittingPostFlight
                                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('operations.newOperation.buttons.saving')}</>
                                    : t('operations.newOperation.buttons.savePostFlight')
                                }
                            </Button>
                        )}
                        {editTab === 'maintenance' && (
                            <Button
                                size="sm"
                                onClick={() => maintRef.current?.submit()}
                                disabled={submittingMaint}
                                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                            >
                                {submittingMaint
                                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('operations.newOperation.buttons.saving')}</>
                                    : t('operations.newOperation.buttons.saveMaintenance')
                                }
                            </Button>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
