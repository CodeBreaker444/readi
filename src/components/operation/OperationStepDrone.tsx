'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LocationGroup } from '@/config/types/erp'
import { cn } from '@/lib/utils'
import { AlertTriangle, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { inputCls, labelCls, scCls, siCls, SectionTitle } from './OperationModalHelpers'
import { Drone, FlightMode, OpType, PlanningOption } from './OperationModalTypes'

interface Props {
    opType: OpType
    onOpTypeChange: (t: OpType) => void
    droneId: string
    onDroneChange: (id: string) => void
    drones: Drone[]
    loadingDrones: boolean
    planId: string
    onPlanChange: (id: string) => void
    clientPlannings: PlanningOption[]
    /** Fallback plan name to display while plannings are loading (from editOperation.planning_name) */
    selectedPlanName?: string
    flightMode: FlightMode
    onFlightModeChange: (m: FlightMode) => void
    loadingOptions: boolean
    isDark: boolean
    erpGroups: LocationGroup[]
    erpGroupId: string
    onErpGroupChange: (id: string) => void
    loadingErpGroups?: boolean
}

export function OperationStepDrone({
    opType, onOpTypeChange, droneId, onDroneChange, drones, loadingDrones,
    planId, onPlanChange, clientPlannings, selectedPlanName, flightMode, onFlightModeChange,
    loadingOptions, isDark, erpGroups, erpGroupId, onErpGroupChange, loadingErpGroups,
}: Props) {
    const { t } = useTranslation()
    const allInMaintenance = drones.length > 0 && drones.every(d => d.in_maintenance)
    const anyMaintenanceDue = drones.some(d => d.maintenance_due && !d.in_maintenance)

    // Resolve plan label: use loaded data if available, else the fallback name from editOperation
    const planLabel = planId
        ? (clientPlannings.find(p => String(p.planning_id) === planId)?.planning_name ?? selectedPlanName)
        : undefined

    // Resolve ERP group label from loaded data
    const erpGroupLabel = (erpGroupId && erpGroupId !== 'none')
        ? erpGroups.find(g => String(g.group_id) === erpGroupId)?.name
        : undefined

    const selectedErpGroup = erpGroupId && erpGroupId !== 'none'
        ? erpGroups.find(g => String(g.group_id) === erpGroupId)
        : undefined

    return (
        <div className="space-y-4">
            <SectionTitle isDark={isDark}>{t('operations.newOperation.drone.sectionTitle')}</SectionTitle>

            <div>
                <Label className={labelCls(isDark)}>{t('operations.newOperation.drone.opTypeLabel')} <span className="text-red-500">*</span></Label>
                <div className="flex gap-2 mt-1">
                    {(['OPEN', 'PDRA'] as OpType[]).map(type => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => onOpTypeChange(type)}
                            className={cn(
                                'px-4 py-2 rounded-md text-sm font-semibold border transition-colors',
                                opType === type
                                    ? 'bg-violet-600 border-violet-600 text-white'
                                    : isDark
                                        ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                            )}
                        >
                            {type}
                        </button>
                    ))}
                </div>
                <p className={cn('text-xs mt-1.5', isDark ? 'text-slate-400' : 'text-muted-foreground')}>
                    {opType === 'OPEN'
                        ? t('operations.newOperation.drone.opTypeOpenDesc')
                        : t('operations.newOperation.drone.opTypePdraDesc')}
                </p>
            </div>

            <div>
                <Label className={labelCls(isDark)}>{t('operations.newOperation.drone.droneLabel')} <span className="text-red-500">*</span></Label>
                <Select value={droneId} onValueChange={onDroneChange} disabled={loadingDrones}>
                    <SelectTrigger className={inputCls(isDark)}>
                        <SelectValue placeholder={
                            loadingDrones ? t('operations.newOperation.scheduler.missionIdPlaceholder')
                                : drones.length === 0 ? t('operations.newOperation.drone.noDronesAssigned')
                                    : allInMaintenance ? t('operations.newOperation.drone.allInMaintenance')
                                        : t('operations.newOperation.drone.selectDrone')
                        } />
                    </SelectTrigger>
                    <SelectContent className={scCls(isDark)}>
                        {drones.map(d => (
                            <SelectItem key={d.tool_id} value={String(d.tool_id)} disabled={d.in_maintenance} className={siCls(isDark)}>
                                <span className="flex items-center gap-2">
                                    <span>{d.tool_code} — {d.tool_name}</span>
                                    {d.in_maintenance && (
                                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 leading-none">
                                            {t('operations.newOperation.drone.maintenanceTag')}
                                        </span>
                                    )}
                                    {!d.in_maintenance && d.maintenance_due && (
                                        <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 leading-none">
                                            {t('operations.newOperation.drone.maintenanceDueTag')}
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
                        {t('operations.newOperation.drone.allInMaintenanceWarning')}
                    </p>
                )}
                {anyMaintenanceDue && !allInMaintenance && (
                    <p className="mt-1.5 text-xs text-orange-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {t('operations.newOperation.drone.maintenanceDueWarning')}
                    </p>
                )}
            </div>

            {opType === 'PDRA' && (
                <>
                    <div>
                        <Label className={labelCls(isDark)}>
                            {t('operations.newOperation.drone.missionPlan')} <span className="text-red-500">*</span>
                            {droneId && clientPlannings.length === 0 && !loadingOptions && (
                                <span className="ml-1 text-[11px] text-amber-500 font-normal">{t('operations.newOperation.drone.noPlansForClient')}</span>
                            )}
                        </Label>
                        <Select
                            value={planId}
                            onValueChange={onPlanChange}
                            disabled={loadingOptions || (clientPlannings.length === 0 && !planLabel)}
                        >
                            <SelectTrigger className={inputCls(isDark)}>
                                {/* Explicit label bypasses Radix's async item-lookup so pre-filled values show correctly */}
                                <SelectValue placeholder={
                                    loadingOptions
                                        ? t('operations.newOperation.scheduler.missionIdPlaceholder')
                                        : clientPlannings.length === 0
                                            ? t('operations.newOperation.drone.noPlansAvailable')
                                            : t('operations.newOperation.drone.selectMissionPlan')
                                }>
                                    {planLabel || undefined}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className={scCls(isDark)}>
                                {clientPlannings.map(p => (
                                    <SelectItem key={p.planning_id} value={String(p.planning_id)} className={siCls(isDark)}>
                                        {p.planning_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className={labelCls(isDark)}>{t('operations.newOperation.drone.flightMode')}</Label>
                        <div className="flex gap-2 mt-1">
                            {([
                                { value: 'RC' as FlightMode, labelKey: 'operations.newOperation.drone.flightModeRC' },
                                { value: 'DOCK' as FlightMode, labelKey: 'operations.newOperation.drone.flightModeDock' },
                            ]).map(fm => (
                                <button
                                    key={fm.value}
                                    type="button"
                                    onClick={() => onFlightModeChange(fm.value)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors',
                                        flightMode === fm.value
                                            ? 'bg-sky-600 border-sky-600 text-white'
                                            : isDark
                                                ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                                    )}
                                >
                                    {t(fm.labelKey)}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Emergency Response Plan */}
            <div>
                <Label className={labelCls(isDark)}>
                    <span className="flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-violet-500" />
                        {t('operations.newOperation.drone.erpLabel')}
                        <span className={cn('text-[10px] font-normal', isDark ? 'text-slate-500' : 'text-muted-foreground')}>
                            {t('operations.newOperation.drone.erpOptional')}
                        </span>
                    </span>
                </Label>
                <Select value={erpGroupId} onValueChange={onErpGroupChange}>
                    <SelectTrigger className={inputCls(isDark)}>
                        <SelectValue placeholder={
                            loadingErpGroups
                                ? t('operations.newOperation.drone.erpLoading')
                                : erpGroups.length === 0
                                    ? t('operations.newOperation.drone.erpNoGroups')
                                    : t('operations.newOperation.drone.erpPlaceholder')
                        }>
                            {/* Provide explicit label so Radix shows it correctly even when options are loading */}
                            {erpGroupId && erpGroupId !== 'none'
                                ? (erpGroupLabel ?? (loadingErpGroups ? t('operations.newOperation.drone.erpLoading') : undefined))
                                : undefined}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className={scCls(isDark)}>
                        <SelectItem value="none" className={siCls(isDark)}>
                            <span className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
                                {t('operations.newOperation.drone.erpNone')}
                            </span>
                        </SelectItem>
                        {erpGroups.filter(g => g.is_active).map(g => (
                            <SelectItem key={g.group_id} value={String(g.group_id)} className={siCls(isDark)}>
                                <span className="flex items-center gap-1.5">
                                    {g.name}
                                    <span className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                        · {g.contacts.length} contact{g.contacts.length !== 1 ? 's' : ''}
                                    </span>
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {selectedErpGroup && (
                    <div className={cn(
                        'mt-1.5 px-3 py-2 rounded-md text-xs',
                        isDark ? 'bg-violet-900/20 text-violet-300' : 'bg-violet-50 text-violet-700'
                    )}>
                        <Shield className="inline h-3 w-3 mr-1" />
                        {t('operations.newOperation.drone.erpSummary', {
                            name: selectedErpGroup.name,
                            locations: selectedErpGroup.locations.length,
                            contacts: selectedErpGroup.contacts.length,
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
