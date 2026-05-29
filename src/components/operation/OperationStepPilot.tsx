'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTimeInTz } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { inputCls, labelCls, scCls, siCls, ReviewRow, SectionTitle } from './OperationModalHelpers'
import { FlightMode, GenericOption, LucOption, OpType, PilotOption } from './OperationModalTypes'

interface SummaryData {
    clientName?: string
    opType: OpType
    droneLabel?: string
    planName?: string
    flightMode: FlightMode
    missionCode: string
    missionName: string
    scheduledStart: string
    timezone: string
    typeId: string
    categoryId: string
    types: GenericOption[]
    categories: GenericOption[]
    lucLabel?: string
    pilotName?: string
    location: string
}

interface Props {
    pilots: PilotOption[]
    pilotId: string
    onPilotChange: (id: string) => void
    visualObserverIds?: string[]
    onVisualObserverChange?: (ids: string[]) => void
    loadingOptions?: boolean
    summary: SummaryData
    isDark: boolean
}

export function OperationStepPilot({ pilots, pilotId, onPilotChange, visualObserverIds = [], onVisualObserverChange, loadingOptions = false, summary, isDark }: Props) {
    const { t } = useTranslation()

    const toggleObserver = (id: string) => {
        if (!onVisualObserverChange) return
        if (visualObserverIds.includes(id)) {
            onVisualObserverChange(visualObserverIds.filter(v => v !== id))
        } else {
            onVisualObserverChange([...visualObserverIds, id])
        }
    }

    return (
        <div className="space-y-4">
            <SectionTitle isDark={isDark}>{t('operations.newOperation.pilot.sectionTitle')}</SectionTitle>

            <div className="max-w-xs">
                <Label className={labelCls(isDark)}>{t('operations.newOperation.pilot.pilotLabel')} <span className="text-red-500">*</span></Label>
                {loadingOptions ? (
                    <Skeleton className="h-9 w-full rounded-md" />
                ) : (
                    <Select value={pilotId} onValueChange={id => { onPilotChange(id); onVisualObserverChange?.(visualObserverIds.filter(v => v !== id)) }}>
                        <SelectTrigger className={inputCls(isDark)}><SelectValue placeholder={t('operations.newOperation.pilot.selectPilot')} /></SelectTrigger>
                        <SelectContent className={scCls(isDark)}>
                            {pilots.map(p => (
                                <SelectItem key={p.user_id} value={String(p.user_id)} className={siCls(isDark)}>
                                    {p.first_name} {p.last_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            <div>
                <Label className={labelCls(isDark)}>
                    {t('operations.newOperation.pilot.visualObserversLabel')}
                    <span className={`ml-1 text-[11px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                        {t('operations.newOperation.pilot.visualObserversOptional')}
                    </span>
                </Label>
                {loadingOptions ? (
                    <div className="mt-1 space-y-1.5">
                        <Skeleton className="h-8 w-full rounded-md" />
                        <Skeleton className="h-8 w-full rounded-md" />
                        <Skeleton className="h-8 w-3/4 rounded-md" />
                    </div>
                ) : !pilotId ? (
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {t('operations.newOperation.pilot.visualObserversDisabled')}
                    </p>
                ) : (
                    <div className={`mt-1 rounded-md border max-h-36 overflow-y-auto ${isDark ? 'border-slate-600 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
                        {pilots.length === 0 && (
                            <p className={`text-xs px-3 py-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {t('operations.newOperation.pilot.noPilots')}
                            </p>
                        )}
                        {pilots.map(p => {
                            const id = String(p.user_id)
                            const isPrimary = id === pilotId
                            const isChecked = visualObserverIds.includes(id)
                            return (
                                <label
                                    key={p.user_id}
                                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-xs transition-colors ${
                                        isPrimary
                                            ? 'opacity-40 cursor-not-allowed'
                                            : isDark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        disabled={isPrimary}
                                        checked={isChecked}
                                        onChange={() => !isPrimary && toggleObserver(id)}
                                        className="accent-violet-600 shrink-0"
                                    />
                                    <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                                        {p.first_name} {p.last_name}
                                    </span>
                                    {isPrimary && (
                                        <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {t('operations.newOperation.pilot.primaryPilotNote')}
                                        </span>
                                    )}
                                </label>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className={cn('rounded-lg border p-4 space-y-2 text-sm', isDark ? 'border-slate-600 bg-slate-700/30' : 'border-border bg-muted/20')}>
                <p className={cn('text-xs font-semibold uppercase tracking-wide pb-2 border-b', isDark ? 'text-slate-400 border-slate-600' : 'text-muted-foreground')}>
                    {t('operations.newOperation.pilot.summaryTitle')}
                </p>
                <ReviewRow label={t('operations.newOperation.pilot.summaryClient')} value={summary.clientName} isDark={isDark} />
                <ReviewRow label={t('operations.newOperation.pilot.summaryOpType')} value={summary.opType} isDark={isDark} />
                <ReviewRow label={t('operations.newOperation.pilot.summaryDrone')} value={summary.droneLabel} isDark={isDark} />
                {summary.opType === 'PDRA' && <ReviewRow label={t('operations.newOperation.pilot.summaryMissionPlan')} value={summary.planName} isDark={isDark} />}
                {summary.opType === 'PDRA' && <ReviewRow label={t('operations.newOperation.pilot.summaryFlightMode')} value={summary.flightMode} isDark={isDark} />}
                {summary.missionCode && <ReviewRow label={t('operations.newOperation.pilot.summaryMissionId')} value={summary.missionCode} isDark={isDark} />}
                <ReviewRow label={t('operations.newOperation.pilot.summaryMissionName')} value={summary.missionName} isDark={isDark} />
                <ReviewRow label={t('operations.newOperation.pilot.summaryStart')} value={summary.scheduledStart ? formatDateTimeInTz(summary.scheduledStart, summary.timezone) : undefined} isDark={isDark} />
                {summary.typeId && <ReviewRow label={t('operations.newOperation.pilot.summaryType')} value={summary.types.find(type => String(type.id) === summary.typeId)?.label} isDark={isDark} />}
                {summary.categoryId && <ReviewRow label={t('operations.newOperation.pilot.summaryCategory')} value={summary.categories.find(c => String(c.id) === summary.categoryId)?.label} isDark={isDark} />}
                <ReviewRow label={t('operations.newOperation.pilot.summaryProcedure')} value={summary.lucLabel} isDark={isDark} />
                {pilotId && <ReviewRow label={t('operations.newOperation.pilot.summaryPilot')} value={summary.pilotName} isDark={isDark} />}
                {summary.location && <ReviewRow label={t('operations.newOperation.pilot.summaryLocation')} value={summary.location} isDark={isDark} />}
            </div>
        </div>
    )
}
