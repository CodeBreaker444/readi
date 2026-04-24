'use client'

import { Operation } from '@/app/operations/table/page'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTimezone } from '@/components/TimezoneProvider'
import { cn, formatDateTimeInTz } from '@/lib/utils'
import axios from 'axios'
import {
    AlertTriangle,
    CalendarClock,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    RefreshCw,
    Settings,
    User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'


interface Client { client_id: number; client_name: string; client_code: string }
interface Drone { tool_id: number; tool_code: string; tool_name: string; in_maintenance?: boolean }
interface PlanningOption { planning_id: number; planning_name: string; fk_client_id: number; client_name: string }
interface GenericOption { id: number; label: string }
interface LucOption { id: number; label: string; steps?: any }
interface PilotOption { user_id: number; first_name: string; last_name: string }
interface ConflictEvent { id: string; title: string; start: string; end: string }

type OpType = 'OPEN' | 'PDRA'
type FlightMode = 'RC' | 'DOCK'

export interface NewOperationModalProps {
    open: boolean
    onClose: () => void
    onSuccess: () => void
    isDark: boolean
    editOperation?: Operation | null
    onSaved?: (op: Operation) => void
}

const DAYS_OF_WEEK = [
    { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
    { value: 0, label: 'Sun' },
]

const STEPS = [
    { id: 1, label: 'Client', icon: User },
    { id: 2, label: 'Drone & Mission', icon: Settings },
    { id: 3, label: 'Scheduler', icon: CalendarClock },
    { id: 4, label: 'Pilot', icon: User },
]


export function NewOperationModal({ open, onClose, onSuccess, isDark, editOperation, onSaved }: NewOperationModalProps) {
    const isEdit = !!editOperation
    const { timezone } = useTimezone()
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)

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
    const [typeId, setTypeId] = useState('')
    const [categories, setCategories] = useState<GenericOption[]>([])
    const [categoryId, setCategoryId] = useState('')
    const [lucProcedures, setLucProcedures] = useState<LucOption[]>([])
    const [lucId, setLucId] = useState('')
    const [missionCode, setMissionCode] = useState('')
    const [missionName, setMissionName] = useState('')
    const [scheduledStart, setScheduledStart] = useState('')
    const [scheduledEnd, setScheduledEnd] = useState('')
    const [location, setLocation] = useState('')
    const [notes, setNotes] = useState('')
    const [conflicts, setConflicts] = useState<ConflictEvent[]>([])
    const [loadingConflicts, setLoadingConflicts] = useState(false)
    const [conflictChecked, setConflictChecked] = useState(false)
    const [isRecurring, setIsRecurring] = useState(false)
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
    const [recurUntil, setRecurUntil] = useState('')
    const [missionGroupLabel, setMissionGroupLabel] = useState('')

    const [pilots, setPilots] = useState<PilotOption[]>([])
    const [pilotId, setPilotId] = useState('')
    const [distanceFlown, setDistanceFlown] = useState('')
    const [loadingOptions, setLoadingOptions] = useState(false)
    const [existingMissionCodes, setExistingMissionCodes] = useState<Set<string>>(new Set())
    const [generatingId, setGeneratingId] = useState(false)

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
            setMissionCode(generateMissionId(codes))
        } catch {
            setMissionCode(generateMissionId(existingMissionCodes))
        } finally {
            setGeneratingId(false)
        }
    }

    useEffect(() => {
        if (!open) { resetForm(); return }

        setLoadingClients(true)
        axios.get('/api/operation/import/options?type=clients')
            .then(r => setClients(r.data.clients ?? []))
            .catch(() => toast.error('Failed to load clients'))
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
                    console.log('drones:',res.data.tools);
                    setDrones((res.data.tools ?? []).map((t: any) => ({
                        tool_id: t.tool_id,
                        tool_code: t.tool_code,
                        tool_name: t.tool_name,
                        in_maintenance: t.in_maintenance,
                    })))
                }
            })
            .catch(() => toast.error('Failed to load options'))
            .finally(() => setLoadingOptions(false))
    }, [open])

    useEffect(() => {
        if (!open || !editOperation) return
        setDroneId(editOperation.fk_tool_id?.toString() ?? '')
        setTypeId(editOperation.fk_mission_type_id?.toString() ?? '')
        setCategoryId(editOperation.fk_mission_category_id?.toString() ?? '')
        setLucId(editOperation.fk_luc_procedure_id?.toString() ?? '')
        setMissionCode(editOperation.mission_code ?? '')
        setMissionName(editOperation.mission_name ?? '')
        setScheduledStart(editOperation.scheduled_start?.slice(0, 16) ?? '')
        setScheduledEnd(editOperation.actual_end?.slice(0, 16) ?? '')
        setLocation(editOperation.location ?? '')
        setNotes(editOperation.notes ?? '')
        setPilotId(editOperation.fk_pilot_user_id?.toString() ?? '')
        setPlanId(editOperation.fk_planning_id?.toString() ?? '')
        setOpType(editOperation.fk_planning_id ? 'PDRA' : 'OPEN')
        setDistanceFlown(editOperation.distance_flown != null ? String(editOperation.distance_flown) : '')
        setIsRecurring(false)
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
            .catch(() => toast.error('Failed to load drones'))
            .finally(() => setLoadingDrones(false))
    }, [clientId])

    useEffect(() => {
        if (step === 3 && !missionCode) {
            refreshMissionId()
        }
    }, [step])

    useEffect(() => {
        if (step !== 3 || !droneId || !scheduledStart) {
            setConflicts([])
            setConflictChecked(false)
            return
        }
        let cancelled = false
        setLoadingConflicts(true)
        setConflictChecked(false)
        axios.get('/api/operation/calendar')
            .then(res => {
                if (cancelled) return
                const events: any[] = res.data.data ?? []
                const s = new Date(scheduledStart).getTime()
                const e = scheduledEnd ? new Date(scheduledEnd).getTime() : s + 3_600_000
                const found = events.filter(ev => {
                    if (String(ev.operation?.fk_tool_id) !== droneId) return false
                    if (isEdit && ev.operation?.pilot_mission_id === editOperation?.pilot_mission_id) return false
                    const evS = new Date(ev.start).getTime()
                    const evE = ev.end ? new Date(ev.end).getTime() : evS + 3_600_000
                    return s < evE && e > evS
                })
                setConflicts(found)
                setConflictChecked(true)
            })
            .catch(() => { if (!cancelled) setConflictChecked(true) })
            .finally(() => { if (!cancelled) setLoadingConflicts(false) })
        return () => { cancelled = true }
    }, [step, droneId, scheduledStart, scheduledEnd])

    function resetForm() {
        setStep(1)
        setClientId(''); setOpType('OPEN'); setDroneId(''); setPlanId('')
        setFlightMode('RC'); setTypeId(''); setCategoryId(''); setLucId('')
        setMissionCode(''); setMissionName(''); setScheduledStart(''); setScheduledEnd('')
        setLocation(''); setNotes(''); setPilotId(''); setDistanceFlown('')
        setIsRecurring(false); setDaysOfWeek([]); setRecurUntil(''); setMissionGroupLabel('')
        setConflicts([]); setConflictChecked(false)
        setDrones([]); setClients([]); setPlannings([])
        setTypes([]); setCategories([]); setLucProcedures([]); setPilots([])
        setExistingMissionCodes(new Set()); setGeneratingId(false)
    }

    const clientPlannings = plannings.filter(p => String(p.fk_client_id) === clientId)

    const canNext = () => {
        if (step === 1) return isEdit || !!clientId
        if (step === 2) {
            if (!droneId) return false
            if (opType === 'PDRA' && !planId) return false
            return true
        }
        if (step === 3) {
            if (!missionCode.trim() || !scheduledStart || !lucId) return false
            if (isRecurring && (daysOfWeek.length === 0 || !recurUntil)) return false
            return true
        }
        if (step === 4) return !!pilotId
        return true
    }

    async function handleSubmit() {
        if (!canNext() || !pilotId) return
        setIsSubmitting(true)
        try {
            if (isEdit && editOperation) {
                const payload = {
                    mission_code: missionCode.trim(),
                    mission_name: missionName.trim(),
                    scheduled_start: scheduledStart || undefined,
                    actual_end: scheduledEnd || undefined,
                    fk_pilot_user_id: parseInt(pilotId),
                    fk_tool_id: droneId ? parseInt(droneId) : null,
                    fk_mission_type_id: typeId ? parseInt(typeId) : null,
                    fk_mission_category_id: categoryId ? parseInt(categoryId) : null,
                    fk_planning_id: planId ? parseInt(planId) : null,
                    location: location || undefined,
                    notes: notes || undefined,
                    distance_flown: distanceFlown !== '' ? parseFloat(distanceFlown) : null,
                }
                const res = await axios.put(`/api/operation/${editOperation.pilot_mission_id}`, payload)
                toast.success('Operation updated successfully')
                onSaved?.(res.data)
                onSuccess()
                onClose()
                return
            }

            const selectedLuc = lucProcedures.find(p => String(p.id) === lucId)
            const payload = {
                mission_code: missionCode.trim(),
                mission_name: missionName.trim(),
                scheduled_start: scheduledStart,
                scheduled_end: scheduledEnd || undefined,
                fk_pilot_user_id: parseInt(pilotId),
                fk_tool_id: droneId ? parseInt(droneId) : null,
                fk_mission_type_id: typeId ? parseInt(typeId) : null,
                fk_mission_category_id: categoryId ? parseInt(categoryId) : null,
                fk_planning_id: planId ? parseInt(planId) : null,
                fk_luc_procedure_id: parseInt(lucId),
                luc_procedure_steps: selectedLuc?.steps ?? null,
                location: location || undefined,
                notes: notes || undefined,
                distance_flown: distanceFlown !== '' ? parseFloat(distanceFlown) : null,
                status_name: 'Scheduled',
                ...(isRecurring && {
                    is_recurring: true,
                    days_of_week: daysOfWeek,
                    recur_until: recurUntil,
                    mission_group_label: missionGroupLabel || undefined,
                }),
            }
            const res = await axios.post('/api/operation/calendar/create', payload)
            if (!res.data.success) throw new Error(res.data.error ?? 'Failed to create operation')
            toast.success('Operation created successfully')
            onSuccess()
            onClose()
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.message || (isEdit ? 'Failed to update operation' : 'Failed to create operation'))
        } finally {
            setIsSubmitting(false)
        }
    }

    const selectedClient = clients.find(c => String(c.client_id) === clientId)
    const selectedDrone = drones.find(d => String(d.tool_id) === droneId)
    const selectedPlan = clientPlannings.find(p => String(p.planning_id) === planId)
    const selectedPilot = pilots.find(p => String(p.user_id) === pilotId)
    const selectedLuc = lucProcedures.find(p => String(p.id) === lucId)

    const inputCls = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400' : ''
    const labelCls = `mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`
    const scCls = isDark ? 'bg-slate-700 border-slate-600 text-white' : ''
    const siCls = isDark ? 'focus:bg-slate-600 text-white' : ''

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className={cn('max-w-2xl gap-0 p-0 overflow-hidden', isDark && 'bg-slate-800 border-slate-700 text-white')}>
                <DialogHeader className={cn('px-6 pt-6 pb-4 border-b', isDark ? 'border-slate-700' : 'border-gray-100')}>
                    <DialogTitle className={cn('text-base font-semibold', isDark && 'text-white')}>
                        {isEdit ? 'Edit Operation' : 'New Operation'}
                    </DialogTitle>
                </DialogHeader>

                {/* Step bar */}
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
                                        <div className={cn('h-0.5 flex-1 mt-[-14px] mx-1 transition-all', done ? 'bg-emerald-400' : 'bg-muted')} />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Card content */}
                <div className="px-6 py-5 min-h-[300px] max-h-[60vh] overflow-y-auto overflow-x-hidden">

                    {step === 1 && (
                        <div className="space-y-4">
                            <SectionTitle isDark={isDark}>Choose Client</SectionTitle>
                            {loadingClients ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading clients…
                                </div>
                            ) : (
                                <div className="max-w-xs">
                                    <Label className={labelCls}>Client <span className="text-red-500">*</span></Label>
                                    <Select value={clientId} onValueChange={setClientId}>
                                        <SelectTrigger className={inputCls}>
                                            <SelectValue placeholder="Select client…" />
                                        </SelectTrigger>
                                        <SelectContent className={scCls}>
                                            {clients.map(c => (
                                                <SelectItem key={c.client_id} value={String(c.client_id)} className={siCls}>
                                                    [{c.client_code}] {c.client_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {selectedClient && (
                                <div className={cn('rounded-md border px-4 py-3 max-w-xs', isDark ? 'border-slate-600 bg-slate-700/40' : 'bg-muted/30')}>
                                    <p className="text-xs text-muted-foreground">Selected</p>
                                    <p className={cn('font-medium text-sm mt-0.5', isDark && 'text-white')}>{selectedClient.client_name}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <SectionTitle isDark={isDark}>Drone &amp; Mission</SectionTitle>

                            <div>
                                <Label className={labelCls}>Operation Type <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2 mt-1">
                                    {(['OPEN', 'PDRA'] as OpType[]).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => { setOpType(t); setPlanId(''); setFlightMode('RC') }}
                                            className={cn(
                                                'px-4 py-2 rounded-md text-sm font-semibold border transition-colors',
                                                opType === t
                                                    ? 'bg-violet-600 border-violet-600 text-white'
                                                    : isDark
                                                        ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                                                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                                <p className={cn('text-xs mt-1.5', isDark ? 'text-slate-400' : 'text-muted-foreground')}>
                                    {opType === 'OPEN'
                                        ? 'Pilot flies with RC — no mission plan required.'
                                        : 'Pilot flies under risk analysis — mission plan required.'}
                                </p>
                            </div>

                            {/* Drone */}
                            {(() => {
                                const allInMaintenance = drones.length > 0 && drones.every(d => d.in_maintenance)
                                return (
                                    <div>
                                        <Label className={labelCls}>Drone System <span className="text-red-500">*</span></Label>
                                        <Select value={droneId} onValueChange={v => { setDroneId(v); setPlanId('') }} disabled={loadingDrones}>
                                            <SelectTrigger className={inputCls}>
                                                <SelectValue placeholder={
                                                    loadingDrones ? 'Loading…'
                                                        : drones.length === 0 ? 'No drones assigned to this client'
                                                            : allInMaintenance ? 'All drones are in maintenance'
                                                                : 'Select drone…'
                                                } />
                                            </SelectTrigger>
                                            <SelectContent className={scCls}>
                                                {drones.map(d => (
                                                    <SelectItem key={d.tool_id} value={String(d.tool_id)} disabled={d.in_maintenance} className={siCls}>
                                                        <span className="flex items-center gap-2">
                                                            <span>{d.tool_code} — {d.tool_name}</span>
                                                            {d.in_maintenance && (
                                                                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 leading-none">
                                                                    MAINTENANCE
                                                                </span>
                                                            )}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {allInMaintenance && (
                                            <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                                All drones assigned to this client are currently under maintenance.
                                            </p>
                                        )}
                                    </div>
                                )
                            })()}

                            {/* PDRA-only fields */}
                            {opType === 'PDRA' && (
                                <>
                                    <div>
                                        <Label className={labelCls}>
                                            Mission Plan <span className="text-red-500">*</span>
                                            {droneId && clientPlannings.length === 0 && (
                                                <span className="ml-1 text-[11px] text-amber-500 font-normal">— no plans for this client</span>
                                            )}
                                        </Label>
                                        <Select
                                            value={planId}
                                            onValueChange={setPlanId}
                                            disabled={loadingOptions || clientPlannings.length === 0}
                                        >
                                            <SelectTrigger className={inputCls}>
                                                <SelectValue placeholder={
                                                    loadingOptions ? 'Loading…'
                                                        : clientPlannings.length === 0 ? 'No plans available'
                                                            : 'Select mission plan…'
                                                } />
                                            </SelectTrigger>
                                            <SelectContent className={scCls}>
                                                {clientPlannings.map(p => (
                                                    <SelectItem key={p.planning_id} value={String(p.planning_id)} className={siCls}>
                                                        {p.planning_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className={labelCls}>Flight Mode</Label>
                                        <div className="flex gap-2 mt-1">
                                            {([
                                                { value: 'RC', label: 'RC (Remote Control)' },
                                                { value: 'DOCK', label: 'DOCK (Docking Station)' },
                                            ] as { value: FlightMode; label: string }[]).map(fm => (
                                                <button
                                                    key={fm.value}
                                                    type="button"
                                                    onClick={() => setFlightMode(fm.value)}
                                                    className={cn(
                                                        'px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors',
                                                        flightMode === fm.value
                                                            ? 'bg-sky-600 border-sky-600 text-white'
                                                            : isDark
                                                                ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                                                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                                                    )}
                                                >
                                                    {fm.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-3">
                            <SectionTitle isDark={isDark}>Scheduler</SectionTitle>

                            <div className="max-w-xs">
                                <Label className={labelCls}>Mission ID <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        value={missionCode}
                                        onChange={e => setMissionCode(e.target.value.toUpperCase())}
                                        placeholder="Auto-generated"
                                        className={cn(inputCls, 'font-mono tracking-widest uppercase')}
                                        maxLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={refreshMissionId}
                                        disabled={generatingId || isEdit}
                                        title={isEdit ? 'Mission ID cannot be changed' : 'Regenerate ID'}
                                        className={cn(
                                            'shrink-0 p-2 rounded-md border transition-colors',
                                            isDark
                                                ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                                                : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                                        )}
                                    >
                                        <RefreshCw className={cn('h-4 w-4', generatingId && 'animate-spin')} />
                                    </button>
                                </div>
                            </div>

                            <div className="max-w-xs">
                                <Label className={labelCls}>Start Date/Time <span className="text-red-500">*</span></Label>
                                <Input type="datetime-local" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} className={inputCls} />
                            </div>

                            {/* Recurring toggle */}
                            {!isEdit && <div className={cn('rounded-lg border p-3 space-y-3', isDark ? 'border-slate-600 bg-slate-700/30' : 'border-slate-200 bg-slate-50/60')}>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="is_recurring"
                                        checked={isRecurring}
                                        onCheckedChange={v => { setIsRecurring(!!v); setDaysOfWeek([]); setRecurUntil('') }}
                                        className="border-sky-500 data-[state=checked]:bg-sky-600"
                                    />
                                    <label htmlFor="is_recurring" className={cn('flex items-center gap-1.5 text-sm font-medium cursor-pointer', isDark ? 'text-slate-200' : 'text-slate-700')}>
                                        <RefreshCw className="h-3.5 w-3.5 text-sky-500" />
                                        Recurring (weekly)
                                    </label>
                                </div>
                                {isRecurring && (
                                    <div className="space-y-3 pl-1">
                                        <div>
                                            <Label className={cn(labelCls, 'text-xs')}>Days of week <span className="text-red-500">*</span></Label>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {DAYS_OF_WEEK.map(day => {
                                                    const checked = daysOfWeek.includes(day.value)
                                                    return (
                                                        <button key={day.value} type="button"
                                                            onClick={() => setDaysOfWeek(prev => checked ? prev.filter(d => d !== day.value) : [...prev, day.value])}
                                                            className={cn('px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors',
                                                                checked ? 'bg-sky-600 border-sky-600 text-white'
                                                                    : isDark ? 'bg-slate-600 border-slate-500 text-slate-300 hover:bg-slate-500'
                                                                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                                                            )}>
                                                            {day.label}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className={cn(labelCls, 'text-xs')}>Repeat until <span className="text-red-500">*</span></Label>
                                                <Input type="date" value={recurUntil} onChange={e => setRecurUntil(e.target.value)} className={inputCls} />
                                            </div>
                                            <div>
                                                <Label className={cn(labelCls, 'text-xs')}>Group label <span className="text-[10px] text-muted-foreground font-normal">(optional)</span></Label>
                                                <Input value={missionGroupLabel} onChange={e => setMissionGroupLabel(e.target.value)} placeholder="e.g. Weekly patrol" className={inputCls} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>}

                            {/* Conflict feedback */}
                            {loadingConflicts && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Checking for conflicts…
                                </div>
                            )}
                            {!loadingConflicts && conflictChecked && conflicts.length > 0 && (
                                <div className={cn('rounded-md border px-3 py-2.5 space-y-1', isDark ? 'border-amber-700 bg-amber-900/20' : 'border-amber-200 bg-amber-50')}>
                                    <div className="flex items-center gap-1.5">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                        <p className={cn('text-xs font-semibold', isDark ? 'text-amber-400' : 'text-amber-700')}>
                                            {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} found for this drone
                                        </p>
                                    </div>
                                    {conflicts.map(c => (
                                        <p key={c.id} className={cn('text-xs pl-5', isDark ? 'text-amber-400/80' : 'text-amber-600')}>
                                            • {c.title} ({formatDateTimeInTz(c.start, timezone)}{c.end ? ` → ${formatDateTimeInTz(c.end, timezone)}` : ''})
                                        </p>
                                    ))}
                                </div>
                            )}
                            {!loadingConflicts && conflictChecked && conflicts.length === 0 && scheduledStart && (
                                <div className={cn('rounded-md border px-3 py-2 flex items-center gap-1.5', isDark ? 'border-emerald-700 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50')}>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <p className={cn('text-xs font-medium', isDark ? 'text-emerald-400' : 'text-emerald-700')}>No conflicts detected</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className={labelCls}>Mission Type</Label>
                                    <Select value={typeId} onValueChange={setTypeId} disabled={loadingOptions}>
                                        <SelectTrigger className={inputCls}>
                                            <SelectValue placeholder="Select type…" />
                                        </SelectTrigger>
                                        <SelectContent className={scCls}>
                                            {types.map(t => <SelectItem key={t.id} value={String(t.id)} className={siCls}>{t.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className={labelCls}>Category</Label>
                                    <Select value={categoryId} onValueChange={setCategoryId} disabled={loadingOptions}>
                                        <SelectTrigger className={inputCls}>
                                            <SelectValue placeholder="Select category…" />
                                        </SelectTrigger>
                                        <SelectContent className={scCls}>
                                            {categories.map(c => <SelectItem key={c.id} value={String(c.id)} className={siCls}>{c.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className={labelCls}>Status</Label>
                                    <Input value="Scheduled" disabled className={cn(inputCls, 'opacity-60 cursor-not-allowed')} />
                                </div>
                                <div>
                                    <Label className={labelCls}>Procedure <span className="text-red-500">*</span></Label>
                                    <Select value={lucId} onValueChange={setLucId}>
                                        <SelectTrigger className={inputCls}>
                                            <SelectValue placeholder={lucProcedures.length === 0 ? 'None available' : 'Select procedure…'} />
                                        </SelectTrigger>
                                        <SelectContent className={scCls}>
                                            {lucProcedures.map(p => <SelectItem key={p.id} value={String(p.id)} className={siCls}>{p.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2">
                                    <Label className={labelCls}>Mission Name <span className="text-[10px] text-muted-foreground font-normal">(optional)</span></Label>
                                    <Input value={missionName} onChange={e => setMissionName(e.target.value)} placeholder="e.g. Survey North Zone" className={inputCls} />
                                </div>
                                {isEdit && (
                                    <div className="col-span-2">
                                        <Label className={labelCls}>Distance Flown (m) <span className="text-[10px] text-muted-foreground font-normal">(optional)</span></Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={distanceFlown}
                                            onChange={e => setDistanceFlown(e.target.value)}
                                            placeholder="e.g. 1500"
                                            className={inputCls}
                                        />
                                    </div>
                                )}
                                <div className="col-span-2">
                                    <Label className={labelCls}>Location <span className="text-[10px] text-muted-foreground font-normal">(optional)</span></Label>
                                    <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Zone A" className={inputCls} />
                                </div>
                            </div>

                            <div>
                                <Label className={labelCls}>Notes <span className="text-[10px] text-muted-foreground font-normal">(optional)</span></Label>
                                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" className={inputCls} />
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <SectionTitle isDark={isDark}>Pilot in Command</SectionTitle>

                            <div className="max-w-xs">
                                <Label className={labelCls}>Pilot <span className="text-red-500">*</span></Label>
                                <Select value={pilotId} onValueChange={setPilotId}>
                                    <SelectTrigger className={inputCls}><SelectValue placeholder="Select pilot…" /></SelectTrigger>
                                    <SelectContent className={scCls}>
                                        {pilots.map(p => (
                                            <SelectItem key={p.user_id} value={String(p.user_id)} className={siCls}>
                                                {p.first_name} {p.last_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Mission summary */}
                            <div className={cn('rounded-lg border p-4 space-y-2 text-sm', isDark ? 'border-slate-600 bg-slate-700/30' : 'border-border bg-muted/20')}>
                                <p className={cn('text-xs font-semibold uppercase tracking-wide pb-2 border-b', isDark ? 'text-slate-400 border-slate-600' : 'text-muted-foreground')}>
                                    Mission Summary
                                </p>
                                <ReviewRow label="Client" value={selectedClient?.client_name} isDark={isDark} />
                                <ReviewRow label="Op. Type" value={opType} isDark={isDark} />
                                <ReviewRow label="Drone" value={selectedDrone ? `${selectedDrone.tool_code} — ${selectedDrone.tool_name}` : undefined} isDark={isDark} />
                                {opType === 'PDRA' && <ReviewRow label="Mission Plan" value={selectedPlan?.planning_name} isDark={isDark} />}
                                {opType === 'PDRA' && <ReviewRow label="Flight Mode" value={flightMode} isDark={isDark} />}
                                {missionCode && <ReviewRow label="Mission ID" value={missionCode} isDark={isDark} />}
                                <ReviewRow label="Mission Name" value={missionName} isDark={isDark} />
                                <ReviewRow label="Start" value={scheduledStart ? formatDateTimeInTz(scheduledStart, timezone) : undefined} isDark={isDark} />
                                {typeId && <ReviewRow label="Type" value={types.find(t => String(t.id) === typeId)?.label} isDark={isDark} />}
                                {categoryId && <ReviewRow label="Category" value={categories.find(c => String(c.id) === categoryId)?.label} isDark={isDark} />}
                                <ReviewRow label="Procedure" value={selectedLuc?.label} isDark={isDark} />
                                {pilotId && <ReviewRow label="Pilot" value={selectedPilot ? `${selectedPilot.first_name} ${selectedPilot.last_name}` : undefined} isDark={isDark} />}
                                {location && <ReviewRow label="Location" value={location} isDark={isDark} />}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer navigation */}
                <div className={cn('flex items-center justify-between px-6 pb-6 pt-2 border-t', isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-muted/20')}>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => step === 1 ? onClose() : setStep(s => s - 1)}
                        disabled={isSubmitting}
                        className={cn('gap-1', isDark && 'border-slate-600 text-slate-300 hover:bg-slate-700')}
                    >
                        {step === 1 ? 'Cancel' : <><ChevronLeft className="h-4 w-4" /> Previous</>}
                    </Button>

                    {step < 4 ? (
                        <Button
                            size="sm"
                            onClick={() => setStep(s => s + 1)}
                            disabled={!canNext()}
                            className="gap-1 bg-violet-600 hover:bg-violet-700 text-white"
                        >
                            Next <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !pilotId || !missionCode.trim() || !lucId || !scheduledStart}
                            className="gap-2 cursor-pointer bg-violet-600 hover:bg-violet-700 text-white min-w-[160px]"
                        >
                            {isSubmitting
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> {isEdit ? 'Saving…' : 'Creating…'}</>
                                : isEdit ? 'Save Changes' : 'Create Operation'
                            }
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}


function SectionTitle({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
    return (
        <h4 className={cn('text-sm font-semibold border-b pb-2 mb-3', isDark ? 'text-slate-200 border-slate-700' : 'text-foreground')}>
            {children}
        </h4>
    )
}

function ReviewRow({ label, value, isDark }: { label: string; value?: string; isDark: boolean }) {
    if (!value) return null
    return (
        <div className="flex gap-3">
            <span className={cn('w-28 shrink-0 text-xs', isDark ? 'text-slate-400' : 'text-muted-foreground')}>{label}</span>
            <span className={cn('text-xs font-medium', isDark && 'text-slate-200')}>{value}</span>
        </div>
    )
}
