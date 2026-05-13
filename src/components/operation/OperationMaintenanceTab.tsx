'use client'

import { Badge } from '@/components/ui/badge'
import { useTimezone } from '@/components/TimezoneProvider'
import { cn, formatDateInTz } from '@/lib/utils'
import axios from 'axios'
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, Loader2, Plane } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Skeleton } from '../ui/skeleton'

interface ComponentInfo {
    component_id: number
    component_type: string | null
    component_code: string | null
    serial_number: string | null
    current_hours: number
    current_flights: number
    current_days: number
    limit_hour: number
    limit_flight: number
    limit_day: number
    maintenance_cycle_type: string
    last_maintenance_date: string | null
    status: 'OK' | 'ALERT' | 'DUE'
    trigger: string[]
    battery_cycle_ratio: number
}

interface SystemData {
    tool_id: number
    tool_code: string
    tool_name: string
    system_status: 'OK' | 'ALERT' | 'DUE'
    components: ComponentInfo[]
}

interface ComponentInput {
    component_id: number
    add_flights: number
    add_hours: number
}

interface Props {
    toolId: number
    missionId: number
    active: boolean
    isDark: boolean
    onSuccess: () => void
    onSubmittingChange: (submitting: boolean) => void
}

export interface OperationMaintenanceTabHandle {
    submit: () => void
}

const STATUS_CONFIG = {
    OK: {
        dark: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        light: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        bar: 'bg-emerald-500',
    },
    ALERT: {
        dark: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        light: 'bg-amber-50 text-amber-600 border-amber-200',
        dot: 'bg-amber-500',
        bar: 'bg-amber-400',
    },
    DUE: {
        dark: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        light: 'bg-rose-50 text-rose-600 border-rose-200',
        dot: 'bg-rose-500',
        bar: 'bg-rose-500',
    },
}

function hhmmToMinutes(hhmm: number) {
    const h = Math.floor(hhmm)
    const m = Math.round((hhmm - h) * 100)
    return h * 60 + m
}

function addHhmmHours(a: number, b: number) {
    const total = hhmmToMinutes(a) + hhmmToMinutes(b)
    return Math.floor(total / 60) + (total % 60) / 100
}

function formatHhmmHours(v: number) {
    const h = Math.floor(v)
    const m = Math.round((v - h) * 100)
    return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function ProgressBar({ current, limit, label, icon: Icon, status, isDark, isHours }: {
    current: number; limit: number; label: string; icon: React.ElementType
    status: 'OK' | 'ALERT' | 'DUE'; isDark: boolean; isHours?: boolean
}) {
    if (!limit || limit <= 0) return null
    const pct = Math.min(100, (current / limit) * 100)
    const cfg = STATUS_CONFIG[status]
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-1.5">
                <Icon className={cn('h-3 w-3', isDark ? 'text-slate-500' : 'text-slate-400')} />
                <span className={cn('text-[10px] uppercase tracking-wider font-medium', isDark ? 'text-slate-500' : 'text-slate-400')}>{label}</span>
            </div>
            <div className={cn('h-1.5 w-full rounded-full overflow-hidden', isDark ? 'bg-slate-700' : 'bg-slate-100')}>
                <div className={cn('h-full rounded-full transition-all', cfg.bar)} style={{ width: `${pct}%` }} />
            </div>
            <p className={cn('text-xs tabular-nums', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {isHours ? formatHhmmHours(current) : current}
                <span className={isDark ? 'text-slate-600' : 'text-slate-400'}> / {isHours ? formatHhmmHours(limit) : limit}</span>
            </p>
        </div>
    )
}

export const OperationMaintenanceTab = forwardRef<OperationMaintenanceTabHandle, Props>(
    function OperationMaintenanceTab({ toolId, missionId, active, isDark, onSuccess, onSubmittingChange }, ref) {
        const { t } = useTranslation()
        const { timezone } = useTimezone()

        const [loading, setLoading] = useState(false)
        const [systemData, setSystemData] = useState<SystemData | null>(null)
        const [inputs, setInputs] = useState<Record<number, ComponentInput>>({})
        const [hoursRaw, setHoursRaw] = useState<Record<number, string>>({})

        const loadData = useCallback(async () => {
            if (!toolId) return
            setLoading(true)
            try {
                const { data } = await axios.get(`/api/operation/board/maintenance-cycle?tool_id=${toolId}`)
                if (data.code === 1 && data.data) {
                    const sys = data.data as SystemData
                    setSystemData(sys)
                    const init: Record<number, ComponentInput> = {}
                    const initRaw: Record<number, string> = {}
                    for (const c of sys.components) {
                        init[c.component_id] = { component_id: c.component_id, add_flights: 0, add_hours: 0 }
                        initRaw[c.component_id] = ''
                    }
                    setInputs(init)
                    setHoursRaw(initRaw)
                }
            } catch {
                toast.error(t('operations.board.toast.loadError'))
            } finally {
                setLoading(false)
            }
        }, [toolId, t])

        useEffect(() => {
            if (active && toolId > 0) loadData()
        }, [active, toolId, loadData])

        const handleHoursChange = (compId: number, raw: string) => {
            if (raw === '') {
                setHoursRaw(p => ({ ...p, [compId]: '' }))
                setInputs(p => ({ ...p, [compId]: { ...p[compId], add_hours: 0 } }))
                return
            }
            if (!/^\d{0,3}(\.\d{0,2})?$/.test(raw)) return
            if (raw.includes('.')) {
                const min = raw.split('.')[1]
                if (min && min.length === 2 && parseInt(min, 10) > 59) return
            }
            const num = parseFloat(raw) || 0
            if (num > 999.59) return
            const comp = systemData?.components.find(c => c.component_id === compId)
            if (comp && comp.limit_hour > 0) {
                const remaining = hhmmToMinutes(comp.limit_hour) - hhmmToMinutes(comp.current_hours)
                if (hhmmToMinutes(num) > remaining) return
            }
            setHoursRaw(p => ({ ...p, [compId]: raw }))
            setInputs(p => ({ ...p, [compId]: { ...p[compId], add_hours: num } }))
        }

        const handleToggleFlight = (compId: number) => {
            setInputs(p => ({
                ...p,
                [compId]: { ...p[compId], add_flights: p[compId]?.add_flights === 1 ? 0 : 1 },
            }))
        }

        const handleSubmit = async () => {
            if (!systemData) return
            const components = Object.values(inputs).filter(i => i.add_flights > 0 || i.add_hours > 0)
            if (components.length === 0) { onSuccess(); return }
            onSubmittingChange(true)
            try {
                const { data } = await axios.post('/api/operation/board/maintenance-cycle/update', {
                    tool_id: toolId, mission_id: missionId, components,
                })
                if (data.code === 1) {
                    toast.success(t('operations.newOperation.toast.updateSuccess'))
                    onSuccess()
                } else {
                    toast.error(t('operations.board.toast.statusUpdateFailed'))
                }
            } catch {
                toast.error(t('operations.board.toast.statusUpdateFailed'))
            } finally {
                onSubmittingChange(false)
            }
        }

        useImperativeHandle(ref, () => ({ submit: handleSubmit }))

        const hasComponents = systemData && systemData.components.length > 0

        if (loading) {
            return (
                <div className="space-y-3">
                    {[0, 1, 2].map(i => (
                        <div key={i} className={cn('rounded-xl border p-4 space-y-4', isDark ? 'border-white/[0.06] bg-slate-900/40' : 'border-slate-200 bg-white')}>
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-40 rounded" />
                                <Skeleton className="h-4 w-12 rounded-full" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[0, 1, 2].map(j => <Skeleton key={j} className="h-12 w-full rounded-lg" />)}
                            </div>
                        </div>
                    ))}
                </div>
            )
        }

        if (!toolId) {
            return (
                <div className="py-12 text-center">
                    <Loader2 className={cn('mx-auto mb-3 h-8 w-8', isDark ? 'text-slate-600' : 'text-slate-300')} />
                    <p className={cn('text-sm', isDark ? 'text-slate-500' : 'text-slate-400')}>
                        No drone assigned to this operation.
                    </p>
                </div>
            )
        }

        if (!hasComponents) {
            return (
                <div className="py-12 text-center">
                    <CheckCircle2 className={cn('mx-auto mb-3 h-8 w-8', isDark ? 'text-slate-600' : 'text-slate-300')} />
                    <p className={cn('text-sm', isDark ? 'text-slate-500' : 'text-slate-400')}>
                        {t('operations.missionComplete.maintenance.noComponents')}
                    </p>
                </div>
            )
        }

        const sysCfg = STATUS_CONFIG[systemData!.system_status]

        return (
            <div className="space-y-4">
                {/* System status badge */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className={cn('text-sm font-medium', isDark ? 'text-slate-200' : 'text-slate-800')}>
                            {systemData!.tool_code}{systemData!.tool_name ? ` — ${systemData!.tool_name}` : ''}
                        </p>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] font-medium px-2 py-0.5', isDark ? sysCfg.dark : sysCfg.light)}>
                        <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full inline-block', sysCfg.dot)} />
                        System {systemData!.system_status}
                    </Badge>
                </div>

                {/* Component cards */}
                {systemData!.components.map(comp => {
                    const cfg = STATUS_CONFIG[comp.status]
                    const inp = inputs[comp.component_id]
                    const ratio = comp.battery_cycle_ratio ?? 1
                    const effectiveCycles = Math.round((inp?.add_flights || 0) * ratio * 100) / 100
                    const previewFlights = Math.round((comp.current_flights + effectiveCycles) * 100) / 100
                    const previewHours = addHhmmHours(comp.current_hours, inp?.add_hours || 0)

                    const lastMaintLabel = (() => {
                        if (!comp.last_maintenance_date) return t('common.never')
                        const days = Math.floor((Date.now() - new Date(comp.last_maintenance_date).getTime()) / 86400000)
                        if (days === 0) return t('common.today')
                        if (days === 1) return t('common.yesterday')
                        if (days < 30) return t('common.daysAgo', { count: days })
                        return formatDateInTz(comp.last_maintenance_date, timezone)
                    })()

                    return (
                        <div key={comp.component_id} className={cn('rounded-xl border p-4 transition-colors', isDark ? 'border-white/[0.06] bg-slate-900/40' : 'border-slate-200 bg-white')}>
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')}>
                                        {comp.component_type ?? 'Component'}
                                    </span>
                                    {comp.component_code && (
                                        <span className={cn('text-[11px] font-medium', isDark ? 'text-slate-300' : 'text-slate-700')}>{comp.component_code}</span>
                                    )}
                                    {comp.serial_number && (
                                        <span className={cn('text-[10px] font-mono', isDark ? 'text-slate-500' : 'text-slate-400')}>SN: {comp.serial_number}</span>
                                    )}
                                </div>
                                <Badge variant="outline" className={cn('text-[9px] font-medium px-1.5 py-0', isDark ? cfg.dark : cfg.light)}>
                                    <span className={cn('mr-1 h-1 w-1 rounded-full inline-block', cfg.dot)} /> {comp.status}
                                </Badge>
                            </div>

                            {/* Last maintenance */}
                            <p className={cn('text-[10px] mb-3', isDark ? 'text-slate-600' : 'text-slate-400')}>
                                {t('operations.missionComplete.maintenance.lastUpdated')}{' '}
                                <span className={cn('font-medium', isDark ? 'text-slate-400' : 'text-slate-500')}>{lastMaintLabel}</span>
                            </p>

                            {/* Progress bars */}
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                {comp.limit_flight > 0 && (
                                    <ProgressBar
                                        current={previewFlights}
                                        limit={comp.limit_flight}
                                        label={ratio !== 1 ? 'Cycles' : t('operations.missionComplete.maintenance.flights')}
                                        icon={Plane}
                                        status={comp.status}
                                        isDark={isDark}
                                    />
                                )}
                                {comp.limit_hour > 0 && (
                                    <ProgressBar
                                        current={previewHours}
                                        limit={comp.limit_hour}
                                        label={t('operations.missionComplete.maintenance.hours')}
                                        icon={Clock}
                                        status={comp.status}
                                        isDark={isDark}
                                        isHours
                                    />
                                )}
                                {comp.limit_day > 0 && (
                                    <ProgressBar
                                        current={comp.current_days}
                                        limit={comp.limit_day}
                                        label={t('operations.missionComplete.maintenance.days')}
                                        icon={CalendarDays}
                                        status={comp.status}
                                        isDark={isDark}
                                    />
                                )}
                            </div>

                            {/* Usage inputs */}
                            {(comp.limit_flight > 0 || comp.limit_hour > 0) && (
                                <div className={cn('rounded-lg border p-3', isDark ? 'border-white/[0.04] bg-slate-800/40' : 'border-slate-100 bg-slate-50/80')}>
                                    <p className={cn('text-[10px] uppercase tracking-wider font-medium mb-2', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                        {t('operations.missionComplete.maintenance.addUsage')}
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        {comp.limit_flight > 0 && (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleFlight(comp.component_id)}
                                                        className={cn(
                                                            'h-7 px-3 rounded-md text-xs font-semibold border transition-colors',
                                                            inp?.add_flights === 1
                                                                ? isDark ? 'border-violet-500 bg-violet-500/20 text-violet-300' : 'border-violet-500 bg-violet-50 text-violet-700'
                                                                : isDark ? 'border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                        )}
                                                    >
                                                        +1 {t('operations.missionComplete.maintenance.flights')}
                                                    </button>
                                                    {inp?.add_flights > 0 && (
                                                        <span className={cn('text-[10px] tabular-nums', isDark ? 'text-slate-400' : 'text-slate-500')}>
                                                            {comp.current_flights} → {previewFlights}
                                                        </span>
                                                    )}
                                                </div>
                                                {ratio !== 1 && (
                                                    <p className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                                        1 flight = {ratio} cycle{ratio !== 1 ? 's' : ''}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {comp.limit_hour > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className={cn('text-[10px] font-medium', isDark ? 'text-slate-400' : 'text-slate-500')}>
                                                    {t('operations.missionComplete.maintenance.hours')}
                                                </span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder="0.00"
                                                    value={hoursRaw[comp.component_id] ?? ''}
                                                    onChange={e => handleHoursChange(comp.component_id, e.target.value)}
                                                    className={cn(
                                                        'h-7 w-20 rounded-md text-xs font-semibold border text-center tabular-nums outline-none transition-colors',
                                                        isDark
                                                            ? 'border-slate-600 bg-slate-700 text-slate-200 placeholder:text-slate-600 focus:border-violet-500'
                                                            : 'border-slate-200 bg-white text-slate-700 placeholder:text-slate-300 focus:border-violet-500'
                                                    )}
                                                />
                                                <span className={cn('text-[9px] uppercase tracking-wider', isDark ? 'text-slate-600' : 'text-slate-400')}>
                                                    {t('operations.missionComplete.maintenance.hmin')}
                                                </span>
                                                {inp?.add_hours > 0 && (
                                                    <span className={cn('text-[10px] tabular-nums', isDark ? 'text-slate-400' : 'text-slate-500')}>
                                                        {formatHhmmHours(comp.current_hours)} → {formatHhmmHours(previewHours)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* DUE warning */}
                            {comp.status === 'DUE' && (
                                <div className={cn('mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px]', isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-600 border border-rose-200')}>
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    <span>{t('operations.missionComplete.maintenance.overdue')}</span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }
)
