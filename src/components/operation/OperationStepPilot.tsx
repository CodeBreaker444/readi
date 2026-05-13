'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    summary: SummaryData
    isDark: boolean
}

export function OperationStepPilot({ pilots, pilotId, onPilotChange, summary, isDark }: Props) {
    const { t } = useTranslation()

    return (
        <div className="space-y-4">
            <SectionTitle isDark={isDark}>{t('operations.newOperation.pilot.sectionTitle')}</SectionTitle>

            <div className="max-w-xs">
                <Label className={labelCls(isDark)}>{t('operations.newOperation.pilot.pilotLabel')} <span className="text-red-500">*</span></Label>
                <Select value={pilotId} onValueChange={onPilotChange}>
                    <SelectTrigger className={inputCls(isDark)}><SelectValue placeholder={t('operations.newOperation.pilot.selectPilot')} /></SelectTrigger>
                    <SelectContent className={scCls(isDark)}>
                        {pilots.map(p => (
                            <SelectItem key={p.user_id} value={String(p.user_id)} className={siCls(isDark)}>
                                {p.first_name} {p.last_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
