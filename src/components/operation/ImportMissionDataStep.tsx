'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Fingerprint, Loader2, RefreshCw } from 'lucide-react';
import { MissionPlanningOption, OpType, PlanningOption } from './OperationModalTypes';

interface DroneSystem {
    tool_id: number; tool_code: string; tool_name: string;
    in_maintenance?: boolean; maintenance_due?: boolean;
    is_non_operational?: boolean; is_dismissed?: boolean;
    drone_serial_numbers?: string[];
}
interface SelectOption { id: number; name: string }

interface ImportMissionDataStepProps {
    t: (key: string, opts?: any) => string;
    ns: string;

    vehicleId: string;
    setVehicleId: (v: string) => void;
    loadingDrones: boolean;
    loadingSerialNumber: boolean;
    drones: DroneSystem[];
    serialNotDetected: boolean;
    serialNoMatch: boolean;
    matchingDrone: DroneSystem | undefined;
    logSerialNumber: string | null;

    missionCode: string;
    setMissionCode: (v: string) => void;
    refreshMissionId: () => void;
    generatingId: boolean;

    categoryId: string;
    setCategoryId: (v: string) => void;
    loadingMissionOptions: boolean;
    categories: SelectOption[];

    typeId: string;
    setTypeId: (v: string) => void;
    types: SelectOption[];

    opType: OpType;
    handleOpTypeChange: (v: OpType) => void;

    flightMode: 'RC' | 'DOCK';
    setFlightMode: (v: 'RC' | 'DOCK') => void;

    planId: string;
    setPlanId: (v: string) => void;
    loadingPlannings: boolean;
    clientPlannings: PlanningOption[];

    missionPlanningId: string;
    setMissionPlanningId: (v: string) => void;
    loadingMissionPlannings: boolean;
    missionPlannings: MissionPlanningOption[];

    lucProcedureId: string;
    setLucProcedureId: (v: string) => void;
    lucProcedures: SelectOption[];

    location: string;
    setLocation: (v: string) => void;
    groupLabel: string;
    setGroupLabel: (v: string) => void;
    notes: string;
    setNotes: (v: string) => void;

    missionStartDate: string;
    setMissionStartDate: (v: string) => void;

    isRecurrent: boolean;
    handleRecurrentToggle: (checked: boolean) => void;
    recurrentDays: number[];
    setRecurrentDays: (days: number[]) => void;
    recurrentEndDate: string;
    handleRecurrentEndDateChange: (value: string) => void;
    recurrentDateError: string;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ImportMissionDataStep({
    t, ns,
    vehicleId, setVehicleId, loadingDrones, loadingSerialNumber, drones,
    serialNotDetected, serialNoMatch, matchingDrone, logSerialNumber,
    missionCode, setMissionCode, refreshMissionId, generatingId,
    categoryId, setCategoryId, loadingMissionOptions, categories,
    typeId, setTypeId, types,
    opType, handleOpTypeChange,
    flightMode, setFlightMode,
    planId, setPlanId, loadingPlannings, clientPlannings,
    missionPlanningId, setMissionPlanningId, loadingMissionPlannings, missionPlannings,
    lucProcedureId, setLucProcedureId, lucProcedures,
    location, setLocation, groupLabel, setGroupLabel, notes, setNotes,
    missionStartDate, setMissionStartDate,
    isRecurrent, handleRecurrentToggle,
    recurrentDays, setRecurrentDays,
    recurrentEndDate, handleRecurrentEndDateChange,
    recurrentDateError,
}: ImportMissionDataStepProps) {
    const toggleRecurrentDay = (day: number) => {
        setRecurrentDays(
            recurrentDays.includes(day) ? recurrentDays.filter((d) => d !== day) : [...recurrentDays, day]
        );
    };
    return (
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
                        <SelectTrigger><SelectValue>{opType}</SelectValue></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="OPEN">OPEN</SelectItem>
                            <SelectItem value="PDRA">PDRA</SelectItem>
                            <SelectItem value="STS-01">STS-01</SelectItem>
                            <SelectItem value="STS-02">STS-02</SelectItem>
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
                    <Label className="mb-1.5 block">{t(ns + '.fields.lucProcedure')} <span className="text-red-500">*</span></Label>
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
                <div>
                    <Label className="mb-1.5 block">{t(ns + '.fields.startDate')}</Label>
                    <Input type="datetime-local" value={missionStartDate} onChange={(e) => setMissionStartDate(e.target.value)} />
                    <p className="mt-1 text-[11px] text-muted-foreground">{t(ns + '.info.startDateHint')}</p>
                </div>
            </div>
            {logSerialNumber && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900 p-2 rounded">
                    <Fingerprint className="h-4 w-4" />
                    <span>{t(ns + '.info.detectedSerialNumber')}: {logSerialNumber}</span>
                </div>
            )}

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/20 p-3 space-y-3">
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
                    <div className="space-y-3">
                        <div>
                            <Label className="mb-1.5 block text-xs">{t(ns + '.fields.recurrentDays')}</Label>
                            <div className="flex gap-2 flex-wrap">
                                {WEEKDAY_LABELS.map((day, idx) => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleRecurrentDay(idx)}
                                        className={cn(
                                            'px-3 cursor-pointer py-1.5 rounded-md text-xs font-semibold transition-all',
                                            recurrentDays.includes(idx)
                                                ? 'bg-violet-600 text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                                        )}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="max-w-xs">
                            <Label className="mb-1.5 block text-xs">{t(ns + '.fields.recurrentEndDate')}</Label>
                            <Input type="date" value={recurrentEndDate} onChange={(e) => handleRecurrentEndDateChange(e.target.value)} className={recurrentDateError ? 'border-red-500' : ''} />
                        </div>
                    </div>
                )}
                {recurrentDateError && (
                    <p className="text-red-500 text-xs">{recurrentDateError}</p>
                )}
            </div>
        </div>
    );
}
