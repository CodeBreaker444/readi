'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LocationGroup } from '@/config/types/erp'
import { cn } from '@/lib/utils'
import { AlertTriangle, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { inputCls, labelCls, scCls, SectionTitle, siCls } from './OperationModalHelpers'
import { Drone, FlightMode, MissionPlanningOption, OpType, PlanningOption } from './OperationModalTypes'

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
    missionPlannings: MissionPlanningOption[]
    missionPlanningId: string
    onMissionPlanningChange: (id: string) => void
    loadingMissionPlannings: boolean
    selectedPlanName?: string
    flightMode: FlightMode
    onFlightModeChange: (m: FlightMode) => void
    loadingOptions: boolean
    isDark: boolean
    erpGroups: LocationGroup[]
    erpGroupId: string
    onErpGroupChange: (id: string) => void
    loadingErpGroups?: boolean
    /** Drone serial number pulled from an attached flight log, if this mission is being created to attach that log. */
    logSerialNumber?: string | null
}

export function OperationStepDrone({
    opType, onOpTypeChange, droneId, onDroneChange, drones, loadingDrones,
    planId, onPlanChange, clientPlannings, missionPlannings, missionPlanningId, onMissionPlanningChange, loadingMissionPlannings, selectedPlanName, flightMode, onFlightModeChange,
    loadingOptions, isDark, erpGroups, erpGroupId, onErpGroupChange, loadingErpGroups, logSerialNumber,
}: Props) {
    const { t } = useTranslation()
    const allInMaintenance = drones.length > 0 && drones.every(d => d.in_maintenance)
    const anyMaintenanceDue = drones.some(d => d.maintenance_due && !d.in_maintenance)
    const allNonOperational = drones.length > 0 && drones.every(d => d.is_non_operational || d.is_dismissed)
    const anyNonOperational = drones.some(d => d.is_non_operational || d.is_dismissed)
    const selectedDrone = drones.find(d => String(d.tool_id) === droneId)
    const selectedIsNonOp = (selectedDrone?.is_non_operational || selectedDrone?.is_dismissed) ?? false
    const selectedIsDismissed = selectedDrone?.is_dismissed ?? false
    // Only warn when we actually know the drone's serial number and it differs —
    // an unrecorded serial number isn't evidence of a mismatch, so stay silent.
    const selectedSnMismatch = !!(
        logSerialNumber &&
        selectedDrone?.drone_serial_number &&
        selectedDrone.drone_serial_number.trim().toLowerCase() !== logSerialNumber.trim().toLowerCase()
    )

    const planLabel = planId
        ? (clientPlannings.find(p => String(p.planning_id) === planId)?.planning_name ?? selectedPlanName)
        : undefined

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
                                'px-4 py-2 cursor-pointer rounded-md text-sm font-semibold border transition-colors',
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
                            <SelectItem
                                key={d.tool_id}
                                value={String(d.tool_id)}
                                disabled={!!d.is_non_operational || !!d.is_dismissed || !!d.in_maintenance}
                                className={cn(siCls(isDark), (d.is_non_operational || d.is_dismissed) ? 'opacity-50' : '')}
                            >
                                <span className="flex items-center gap-2">
                                    <span>{d.tool_code} — {d.tool_name}</span>
                                    {d.is_non_operational && (
                                        <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 leading-none">
                                            {t('operations.newOperation.drone.notOperationalTag')}
                                        </span>
                                    )}
                                    {!d.is_non_operational && d.is_dismissed && (
                                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 leading-none">
                                            {t('operations.newOperation.drone.dismissedTag')}
                                        </span>
                                    )}
                                    {!d.is_non_operational && !d.is_dismissed && d.in_maintenance && (
                                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 leading-none">
                                            {t('operations.newOperation.drone.maintenanceTag')}
                                        </span>
                                    )}
                                    {!d.is_non_operational && !d.is_dismissed && !d.in_maintenance && d.maintenance_due && (
                                        <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 leading-none">
                                            {t('operations.newOperation.drone.maintenanceDueTag')}
                                        </span>
                                    )}
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {selectedIsNonOp && !selectedIsDismissed && (
                    <div className={cn(
                        'mt-2 flex items-start gap-2 rounded-lg border px-3 py-2.5',
                        isDark ? 'border-red-800 bg-red-950/40' : 'border-red-200 bg-red-50'
                    )}>
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                        <p className={cn('text-xs leading-snug', isDark ? 'text-red-400' : 'text-red-700')}>
                            {t('operations.newOperation.drone.selectedNonOpWarningPre')}{' '}
                            <span className="font-semibold">{t('operations.newOperation.drone.notOperationalTag')}</span>{' '}
                            {t('operations.newOperation.drone.selectedNonOpWarningPost')}
                        </p>
                    </div>
                )}
                {selectedIsDismissed && (
                    <div className={cn(
                        'mt-2 flex items-start gap-2 rounded-lg border px-3 py-2.5',
                        isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'
                    )}>
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                        <p className={cn('text-xs leading-snug', isDark ? 'text-slate-400' : 'text-slate-600')}>
                            {t('operations.newOperation.drone.selectedDismissedWarningPre')}{' '}
                            <span className="font-semibold">{t('operations.newOperation.drone.dismissedTag')}</span>{' '}
                            {t('operations.newOperation.drone.selectedDismissedWarningPost')}
                        </p>
                    </div>
                )}
                {!selectedIsNonOp && allNonOperational && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {t('operations.newOperation.drone.allNonOperationalWarning')}
                    </p>
                )}
                {!selectedIsNonOp && anyNonOperational && !allNonOperational && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {t('operations.newOperation.drone.anyNonOperationalWarning')}
                    </p>
                )}
                {allInMaintenance && !anyNonOperational && (
                    <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {t('operations.newOperation.drone.allInMaintenanceWarning')}
                    </p>
                )}
                {anyMaintenanceDue && !allInMaintenance && !anyNonOperational && (
                    <p className="mt-1.5 text-xs text-orange-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {t('operations.newOperation.drone.maintenanceDueWarning')}
                    </p>
                )}
                {selectedSnMismatch && (
                    <div className={cn(
                        'mt-2 flex items-start gap-2 rounded-lg border px-3 py-2.5',
                        isDark ? 'border-amber-800 bg-amber-950/40' : 'border-amber-200 bg-amber-50'
                    )}>
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <p className={cn('text-xs leading-snug', isDark ? 'text-amber-400' : 'text-amber-700')}>
                            {t('operations.newOperation.drone.serialMismatchWarning', {
                                logSn: logSerialNumber,
                                droneSn: selectedDrone?.drone_serial_number,
                            })}
                        </p>
                    </div>
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
                                {clientPlannings.map(p => {
                                    const isActive = !p.planning_active || p.planning_active === 'Y'
                                    return (
                                        <SelectItem key={p.planning_id} value={String(p.planning_id)} disabled={!isActive} className={cn(siCls(isDark), !isActive && 'opacity-50')}>
                                            <span className="flex items-center gap-2">
                                                <span>{p.planning_name}</span>
                                                {!isActive && (
                                                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 leading-none">
                                                        Inactive
                                                    </span>
                                                )}
                                            </span>
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className={labelCls(isDark)}>
                            {t('operations.newOperation.drone.missionPlanning')} <span className="text-red-500">*</span>
                            {planId && missionPlannings.length === 0 && !loadingMissionPlannings && (
                                <span className="ml-1 text-[11px] text-amber-500 font-normal">{t('operations.newOperation.drone.noMissionsForPlan')}</span>
                            )}
                        </Label>
                        <Select
                            value={missionPlanningId}
                            onValueChange={onMissionPlanningChange}
                            disabled={loadingMissionPlannings || (missionPlannings.length === 0 && !missionPlanningId)}
                        >
                            <SelectTrigger className={inputCls(isDark)}>
                                <SelectValue placeholder={
                                    loadingMissionPlannings
                                        ? t('operations.newOperation.scheduler.missionIdPlaceholder')
                                        : missionPlannings.length === 0
                                            ? t('operations.newOperation.drone.noMissionsAvailable')
                                            : t('operations.newOperation.drone.selectMission')
                                } />
                            </SelectTrigger>
                            <SelectContent className={scCls(isDark)}>
                                {missionPlannings.map(m => {
                                    const isActive = !m.mission_planning_active || m.mission_planning_active === 'Y'
                                    return (
                                        <SelectItem key={m.mission_planning_id} value={String(m.mission_planning_id)} disabled={!isActive} className={cn(siCls(isDark), !isActive && 'opacity-50')}>
                                            <span className="flex items-center gap-2">
                                                <span>{m.mission_planning_code} — {m.mission_planning_desc}</span>
                                                {!isActive && (
                                                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 leading-none">
                                                        Inactive
                                                    </span>
                                                )}
                                            </span>
                                        </SelectItem>
                                    )
                                })}
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
                                        'px-3 py-1.5 cursor-pointer rounded-md text-xs font-semibold border transition-colors',
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
