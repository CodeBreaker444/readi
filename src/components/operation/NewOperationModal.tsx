'use client'

import { Operation } from '@/app/operations/table/page'
import { useTimezone } from '@/components/TimezoneProvider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmergencyResponsePlan } from '@/config/types/erp'
import { cn } from '@/lib/utils'
import axios from 'axios'
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    FileUp,
    Loader2,
    Settings,
    Shield,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { EditMissionLogTab } from './EditMissionLogTab'
import { OperationErpTab } from './OperationErpTab'
import { isoToLocalInput } from './OperationModalHelpers'
import {
    Client,
    ConflictEvent,
    Drone,
    FlightMode,
    GenericOption,
    LucOption,
    OpType,
    PilotOption,
    PlanningOption,
    SchedulerFormData,
    STEPS,
} from './OperationModalTypes'
import { OperationStepClient } from './OperationStepClient'
import { OperationStepDrone } from './OperationStepDrone'
import { OperationStepPilot } from './OperationStepPilot'
import { OperationStepScheduler } from './OperationStepScheduler'
import { PostFlightTab, type MissionResultOption, type PostFlightState } from './PostFlightTab'

export interface NewOperationModalProps {
    open: boolean
    onClose: () => void
    onSuccess: () => void
    isDark: boolean
    editOperation?: Operation | null
    onSaved?: (op: Operation) => void
}

type EditTab = 'data' | 'execution' | 'log' | 'postFlight'

const EDIT_TABS = [
    { id: 'data' as const,       labelKey: 'operations.newOperation.tabs.missionData',      icon: Settings },
    { id: 'execution' as const,  labelKey: 'operations.newOperation.tabs.missionExecution', icon: Shield },
    { id: 'log' as const,        labelKey: 'operations.newOperation.tabs.missionLog',        icon: FileUp },
    { id: 'postFlight' as const, labelKey: 'operations.newOperation.tabs.postFlight',        icon: ClipboardList },
]

export function NewOperationModal({ open, onClose, onSuccess, isDark, editOperation, onSaved }: NewOperationModalProps) {
    const isEdit = !!editOperation
    const { timezone } = useTimezone()
    const { t } = useTranslation()

    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
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
    const [flightMode, setFlightMode] = useState<FlightMode>('RC')

    const [types, setTypes] = useState<GenericOption[]>([])
    const [categories, setCategories] = useState<GenericOption[]>([])
    const [lucProcedures, setLucProcedures] = useState<LucOption[]>([])
    const [loadingOptions, setLoadingOptions] = useState(false)
    const [generatingId, setGeneratingId] = useState(false)
    const [existingMissionCodes, setExistingMissionCodes] = useState<Set<string>>(new Set())
    const [schedulerForm, setSchedulerForm] = useState<SchedulerFormData>({
        missionCode: '', scheduledStart: '', scheduledEnd: '',
        missionName: '', location: '', notes: '', distanceFlown: '',
        typeId: '', categoryId: '', lucId: '',
        isRecurring: false, daysOfWeek: [], recurUntil: '', missionGroupLabel: '',
    })

    const [conflicts, setConflicts] = useState<ConflictEvent[]>([])
    const [loadingConflicts, setLoadingConflicts] = useState(false)
    const [conflictChecked, setConflictChecked] = useState(false)

    const [pilots, setPilots] = useState<PilotOption[]>([])
    const [pilotId, setPilotId] = useState('')

    const [erps, setErps] = useState<EmergencyResponsePlan[]>([])
    const [loadingErps, setLoadingErps] = useState(false)

    const [loadingPostFlight, setLoadingPostFlight] = useState(false)
    const [submittingPostFlight, setSubmittingPostFlight] = useState(false)
    const [resultOptions, setResultOptions] = useState<MissionResultOption[]>([])
    const [postFlightFromLog] = useState(false)
    const [postFlight, setPostFlight] = useState<PostFlightState>({
        actual_end: '', result_id: null, flight_duration_min: '', distance_m: '',
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
                setPilots((res.data.pilots ?? []).map((p: any) => ({
                    user_id: p.user_id,
                    first_name: p.first_name ?? '',
                    last_name: p.last_name ?? '',
                })))
                setPlannings(res.data.plannings ?? [])
                if (editOperation) {
                    setDrones((res.data.tools ?? []).map((t: any) => ({
                        tool_id: t.tool_id, tool_code: t.tool_code,
                        tool_name: t.tool_name, in_maintenance: t.in_maintenance,
                    })))
                }
            })
            .catch(() => toast.error(t('operations.newOperation.toast.loadOptionsError')))
            .finally(() => setLoadingOptions(false))
    }, [open])

    useEffect(() => {
        if (!open || !editOperation) return
        setDroneId(editOperation.fk_tool_id?.toString() ?? '')
        setPilotId(editOperation.fk_pilot_user_id?.toString() ?? '')
        setPlanId(editOperation.fk_planning_id?.toString() ?? '')
        setOpType(editOperation.fk_planning_id ? 'PDRA' : 'OPEN')
        setSchedulerForm({
            missionCode: editOperation.mission_code ?? '',
            scheduledStart: editOperation.scheduled_start?.slice(0, 16) ?? '',
            scheduledEnd: editOperation.actual_end?.slice(0, 16) ?? '',
            missionName: editOperation.mission_name ?? '',
            location: editOperation.location ?? '',
            notes: editOperation.notes ?? '',
            distanceFlown: editOperation.distance_flown != null ? String(editOperation.distance_flown) : '',
            typeId: editOperation.fk_mission_type_id?.toString() ?? '',
            categoryId: editOperation.fk_mission_category_id?.toString() ?? '',
            lucId: editOperation.fk_luc_procedure_id?.toString() ?? '',
            isRecurring: false, daysOfWeek: [], recurUntil: '', missionGroupLabel: '',
        })
        setStep(2)
    }, [editOperation, open])

    useEffect(() => {
        if (!clientId) {
            if (!isEdit) { setDrones([]); setDroneId(''); setPlanId('') }
            return
        }
        setLoadingDrones(true)
        axios.get(`/api/operation/import/options?type=drones&client_id=${clientId}`)
            .then(r => setDrones(r.data.drones ?? []))
            .catch(() => toast.error(t('operations.newOperation.toast.loadOptionsError')))
            .finally(() => setLoadingDrones(false))
    }, [clientId])

    useEffect(() => {
        if (step === 3 && !schedulerForm.missionCode) refreshMissionId()
    }, [step])

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
                const s = new Date(schedulerForm.scheduledStart).getTime()
                const e = schedulerForm.scheduledEnd ? new Date(schedulerForm.scheduledEnd).getTime() : s + 3_600_000
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
        setClientId(''); setOpType('OPEN'); setDroneId(''); setPlanId(''); setFlightMode('RC')
        setPilotId(''); setDrones([]); setClients([]); setPlannings([])
        setTypes([]); setCategories([]); setLucProcedures([]); setPilots([])
        setExistingMissionCodes(new Set()); setGeneratingId(false)
        setConflicts([]); setConflictChecked(false)
        setErps([]); setResultOptions([])
        setSchedulerForm({
            missionCode: '', scheduledStart: '', scheduledEnd: '',
            missionName: '', location: '', notes: '', distanceFlown: '',
            typeId: '', categoryId: '', lucId: '',
            isRecurring: false, daysOfWeek: [], recurUntil: '', missionGroupLabel: '',
        })
        setPostFlight({
            actual_end: '', result_id: null, flight_duration_min: '', distance_m: '',
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
        if (step === 2) return !!droneId && (opType !== 'PDRA' || !!planId)
        if (step === 3) {
            if (!schedulerForm.missionCode.trim() || !schedulerForm.scheduledStart || !schedulerForm.lucId) return false
            if (schedulerForm.isRecurring && (schedulerForm.daysOfWeek.length === 0 || !schedulerForm.recurUntil)) return false
            return true
        }
        if (step === 4) return !!pilotId
        return true
    }

    const clientPlannings = plannings.filter(p => String(p.fk_client_id) === clientId)


    async function handleSubmit() {
        if (!canNext() || !pilotId) return
        setIsSubmitting(true)
        try {
            if (isEdit && editOperation) {
                const payload = {
                    mission_code: schedulerForm.missionCode.trim(),
                    mission_name: schedulerForm.missionName.trim(),
                    scheduled_start: schedulerForm.scheduledStart || undefined,
                    actual_end: schedulerForm.scheduledEnd || undefined,
                    fk_pilot_user_id: parseInt(pilotId),
                    fk_tool_id: droneId ? parseInt(droneId) : null,
                    fk_client_id: clientId ? parseInt(clientId) : null,
                    fk_mission_type_id: schedulerForm.typeId ? parseInt(schedulerForm.typeId) : null,
                    fk_mission_category_id: schedulerForm.categoryId ? parseInt(schedulerForm.categoryId) : null,
                    fk_planning_id: planId ? parseInt(planId) : null,
                    location: schedulerForm.location || undefined,
                    notes: schedulerForm.notes || undefined,
                    distance_flown: schedulerForm.distanceFlown !== '' ? parseFloat(schedulerForm.distanceFlown) : null,
                }
                const res = await axios.put(`/api/operation/${editOperation.pilot_mission_id}`, payload)
                toast.success(t('operations.newOperation.toast.updateSuccess'))
                onSaved?.(res.data)
                onSuccess(); onClose()
                return
            }

            const selectedLuc = lucProcedures.find(p => String(p.id) === schedulerForm.lucId)
            const payload = {
                mission_code: schedulerForm.missionCode.trim(),
                mission_name: schedulerForm.missionName.trim(),
                scheduled_start: schedulerForm.scheduledStart,
                scheduled_end: schedulerForm.scheduledEnd || undefined,
                fk_pilot_user_id: parseInt(pilotId),
                fk_tool_id: droneId ? parseInt(droneId) : null,
                fk_client_id: clientId ? parseInt(clientId) : null,
                fk_mission_type_id: schedulerForm.typeId ? parseInt(schedulerForm.typeId) : null,
                fk_mission_category_id: schedulerForm.categoryId ? parseInt(schedulerForm.categoryId) : null,
                fk_planning_id: planId ? parseInt(planId) : null,
                fk_luc_procedure_id: parseInt(schedulerForm.lucId),
                luc_procedure_steps: selectedLuc?.steps ?? null,
                location: schedulerForm.location || undefined,
                notes: schedulerForm.notes || undefined,
                distance_flown: schedulerForm.distanceFlown !== '' ? parseFloat(schedulerForm.distanceFlown) : null,
                status_name: 'Scheduled',
                ...(schedulerForm.isRecurring && {
                    is_recurring: true,
                    days_of_week: schedulerForm.daysOfWeek,
                    recur_until: schedulerForm.recurUntil,
                    mission_group_label: schedulerForm.missionGroupLabel || undefined,
                }),
            }
            const res = await axios.post('/api/operation/calendar/create', payload)
            if (!res.data.success) throw new Error(res.data.error ?? t('operations.newOperation.toast.createError'))
            toast.success(t('operations.newOperation.toast.createSuccess'))
            onSuccess(); onClose()
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.message || (isEdit ? t('operations.newOperation.toast.updateError') : t('operations.newOperation.toast.createError')))
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleSubmitPostFlight() {
        if (!editOperation) return
        const payload: Record<string, unknown> = {
            mission_id: editOperation.pilot_mission_id,
            flight_duration: postFlight.flight_duration_min ? parseInt(postFlight.flight_duration_min, 10) : null,
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


    const selectedClient = clients.find(c => String(c.client_id) === clientId)
    const selectedDrone = drones.find(d => String(d.tool_id) === droneId)
    const selectedPlan = clientPlannings.find(p => String(p.planning_id) === planId)
    const selectedPilot = pilots.find(p => String(p.user_id) === pilotId)
    const selectedLuc = lucProcedures.find(p => String(p.id) === schedulerForm.lucId)


    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className={cn('max-w-4xl gap-0 p-0 overflow-hidden', isDark && 'bg-slate-800 border-slate-700 text-white')}>
                <DialogHeader className={cn('px-6 pt-6 pb-4 border-b', isDark ? 'border-slate-700' : 'border-gray-100')}>
                    <DialogTitle className={cn('text-base font-semibold', isDark && 'text-white')}>
                        {isEdit ? t('operations.newOperation.editTitle') : t('operations.newOperation.title')}
                    </DialogTitle>
                </DialogHeader>

                {/* Edit tab bar */}
                {isEdit && (
                    <div className={cn('flex border-b overflow-x-auto', isDark ? 'border-slate-700' : 'border-gray-200')}>
                        {EDIT_TABS.map(tab => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setEditTab(tab.id)}
                                    className={cn(
                                        'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0',
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
                    <div className="px-6 pt-4 pb-2">
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
                                                'text-[10px] font-medium whitespace-nowrap',
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
                <div className="px-6 py-5 h-[60vh] overflow-y-auto overflow-x-hidden">

                    {(!isEdit || editTab === 'data') && step === 1 && (
                        <OperationStepClient
                            clients={clients}
                            clientId={clientId}
                            onClientChange={setClientId}
                            loadingClients={loadingClients}
                            isDark={isDark}
                        />
                    )}

                    {(!isEdit || editTab === 'data') && step === 2 && (
                        <OperationStepDrone
                            opType={opType}
                            onOpTypeChange={t => { setOpType(t); setPlanId(''); setFlightMode('RC') }}
                            droneId={droneId}
                            onDroneChange={id => { setDroneId(id); setPlanId('') }}
                            drones={drones}
                            loadingDrones={loadingDrones}
                            planId={planId}
                            onPlanChange={setPlanId}
                            clientPlannings={clientPlannings}
                            flightMode={flightMode}
                            onFlightModeChange={setFlightMode}
                            loadingOptions={loadingOptions}
                            isDark={isDark}
                        />
                    )}

                    {(!isEdit || editTab === 'data') && step === 3 && (
                        <OperationStepScheduler
                            form={schedulerForm}
                            onChange={handleSchedulerChange}
                            isEdit={isEdit}
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
                        />
                    )}

                    {(!isEdit || editTab === 'data') && step === 4 && (
                        <OperationStepPilot
                            pilots={pilots}
                            pilotId={pilotId}
                            onPilotChange={setPilotId}
                            isDark={isDark}
                            summary={{
                                clientName: selectedClient?.client_name,
                                opType,
                                droneLabel: selectedDrone ? `${selectedDrone.tool_code} — ${selectedDrone.tool_name}` : undefined,
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
                            }}
                        />
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
                        />
                    )}
                </div>

                {/* Footer — data tab (step navigation) */}
                {(!isEdit || editTab === 'data') && (
                    <div className={cn('flex items-center justify-between px-6 pb-6 pt-2 border-t', isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-muted/20')}>
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
                                disabled={isSubmitting || !pilotId || !schedulerForm.missionCode.trim() || !schedulerForm.lucId || !schedulerForm.scheduledStart}
                                className="gap-2 cursor-pointer bg-violet-600 hover:bg-violet-700 text-white min-w-40"
                            >
                                {isSubmitting
                                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {isEdit ? t('operations.newOperation.buttons.saving') : t('operations.newOperation.buttons.creating')}</>
                                    : isEdit ? t('operations.newOperation.buttons.saveChanges') : t('operations.newOperation.buttons.createOperation')
                                }
                            </Button>
                        )}
                    </div>
                )}

                {/* Footer — other edit tabs */}
                {isEdit && editTab !== 'data' && (
                    <div className={cn('flex items-center justify-end gap-2 px-6 pb-6 pt-2 border-t', isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-muted/20')}>
                        <Button variant="outline" size="sm" onClick={onClose} className={cn(isDark && 'border-slate-600 text-slate-300 hover:bg-slate-700')}>
                            {t('operations.newOperation.buttons.close')}
                        </Button>
                        {editTab === 'postFlight' && (
                            <Button
                                size="sm"
                                onClick={handleSubmitPostFlight}
                                disabled={submittingPostFlight || loadingPostFlight}
                                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                            >
                                {submittingPostFlight
                                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('operations.newOperation.buttons.saving')}</>
                                    : t('operations.newOperation.buttons.savePostFlight')
                                }
                            </Button>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
