'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDateTimeInTz } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { BadgeCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { inputCls, labelCls, scCls, siCls, ReviewRow, SectionTitle, SelectPaginationFooter, SELECT_PAGE_SIZE, usePagedItems } from './OperationModalHelpers'
import { FlightMode, GenericOption, LucOption, OpType, PilotOption, UspaceOption } from './OperationModalTypes'
import { PilotQualificationsSheet } from './PilotQualificationsSheet'
import dynamic from 'next/dynamic'
import type { DFlightCircle } from './DFlightCircleMap'

const DFlightCircleMap = dynamic(() => import('./DFlightCircleMap'), { ssr: false })

const CIRCLE_OP_TYPES: OpType[] = ['OPEN', 'STS-01', 'STS-02']

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
    uspaceLabel?: string
}

interface Props {
    pilots: PilotOption[]
    pilotId: string
    onPilotChange: (id: string) => void
    visualObserverIds?: string[]
    onVisualObserverChange?: (ids: string[]) => void
    loadingOptions?: boolean
    uspaces?: UspaceOption[]
    uspaceId?: string
    onUspaceChange?: (id: string) => void
    loadingUspaces?: boolean
    dFlightEnabled?: boolean
    uspaceError?: string
    circle?: DFlightCircle | null
    onCircleChange?: (circle: DFlightCircle | null) => void
    circleMaxRadiusM?: number
    circleFocusCenter?: { lat: number; lng: number } | null
    summary: SummaryData
    isDark: boolean
}

export function OperationStepPilot({ pilots, pilotId, onPilotChange, visualObserverIds = [], onVisualObserverChange, loadingOptions = false, uspaces = [], uspaceId = '', onUspaceChange, loadingUspaces = false, dFlightEnabled = false, uspaceError = '', circle = null, onCircleChange, circleMaxRadiusM = 250, circleFocusCenter = null, summary, isDark }: Props) {
    const { t } = useTranslation()
    const [qualTarget, setQualTarget] = useState<{ id: number; name: string } | null>(null)
    const pilotsPaging = usePagedItems(pilots)

    const toggleObserver = (id: string) => {
        if (!onVisualObserverChange) return
        if (visualObserverIds.includes(id)) {
            onVisualObserverChange(visualObserverIds.filter(v => v !== id))
        } else {
            onVisualObserverChange([...visualObserverIds, id])
        }
    }

    return (
        <TooltipProvider delayDuration={100}>
        <div className="space-y-4">
            <SectionTitle isDark={isDark}>{t('operations.newOperation.pilot.sectionTitle')}</SectionTitle>

            <div className="max-w-xs">
                <Label className={labelCls(isDark)}>{t('operations.newOperation.pilot.pilotLabel')} <span className="text-red-500">*</span></Label>
                {loadingOptions ? (
                    <Skeleton className="h-9 w-full rounded-md" />
                ) : (
                    <div className="flex items-center gap-1.5">
                        <Select value={pilotId} onValueChange={id => { onPilotChange(id); onVisualObserverChange?.(visualObserverIds.filter(v => v !== id)) }}>
                            <SelectTrigger className={cn(inputCls(isDark), 'flex-1')}><SelectValue placeholder={t('operations.newOperation.pilot.selectPilot')} /></SelectTrigger>
                            <SelectContent className={scCls(isDark)} position="popper" align="start" sideOffset={4}>
                                {pilotsPaging.paged.map(p => (
                                    <SelectItem key={p.user_id} value={String(p.user_id)} className={siCls(isDark)}>
                                        {p.first_name} {p.last_name}
                                    </SelectItem>
                                ))}
                                {pilotsPaging.showPagination && Array.from({ length: SELECT_PAGE_SIZE - pilotsPaging.paged.length }).map((_, i) => (
                                    <div key={`filler-${i}`} className="py-1.5 pr-8 pl-2 text-sm invisible" aria-hidden="true">&nbsp;</div>
                                ))}
                                {pilotsPaging.showPagination && (
                                    <SelectPaginationFooter
                                        page={pilotsPaging.page}
                                        totalPages={pilotsPaging.totalPages}
                                        onPageChange={pilotsPaging.setPage}
                                        previousLabel={t('common.previous')}
                                        nextLabel={t('common.next')}
                                        indicatorLabel={t('common.pageIndicator', { current: pilotsPaging.page + 1, total: pilotsPaging.totalPages })}
                                        isDark={isDark}
                                    />
                                )}
                            </SelectContent>
                        </Select>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    disabled={!pilotId}
                                    aria-label={t('operations.newOperation.pilot.viewQualifications')}
                                    onClick={() => {
                                        const pilot = pilots.find(p => String(p.user_id) === pilotId)
                                        if (pilot) setQualTarget({ id: pilot.user_id, name: `${pilot.first_name} ${pilot.last_name}` })
                                    }}
                                    className={inputCls(isDark)}
                                >
                                    <BadgeCheck className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">{t('operations.newOperation.pilot.viewQualifications')}</TooltipContent>
                        </Tooltip>
                    </div>
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
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                aria-label={t('operations.newOperation.pilot.viewQualifications')}
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    setQualTarget({ id: p.user_id, name: `${p.first_name} ${p.last_name}` })
                                                }}
                                                className={cn('ml-auto shrink-0 p-1 rounded transition-colors', isDark ? 'hover:bg-slate-600 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600')}
                                            >
                                                <BadgeCheck className="h-3.5 w-3.5" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">{t('operations.newOperation.pilot.viewQualifications')}</TooltipContent>
                                    </Tooltip>
                                </label>
                            )
                        })}
                    </div>
                )}
            </div>

            {dFlightEnabled && (
                <div className="max-w-xs">
                    <Label className={labelCls(isDark)}>
                        {t('operations.newOperation.pilot.uspaceLabel')} <span className="text-red-500">*</span>
                    </Label>
                    {loadingUspaces ? (
                        <Skeleton className="h-9 w-full rounded-md" />
                    ) : (
                        <Select value={uspaceId} onValueChange={id => onUspaceChange?.(id)} disabled={uspaces.length === 0}>
                            <SelectTrigger className={inputCls(isDark)}>
                                <SelectValue placeholder={uspaces.length === 0
                                    ? t('operations.newOperation.pilot.noUspaces')
                                    : t('operations.newOperation.pilot.selectUspace')} />
                            </SelectTrigger>
                            <SelectContent className={scCls(isDark)} position="popper" align="start" sideOffset={4}>
                                {uspaces.map(u => (
                                    <SelectItem key={u.id} value={u.id} className={siCls(isDark)}>
                                        {u.id +'-'+ u.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {!loadingUspaces && uspaces.length === 0 && (
                        <p className="mt-1.5 text-xs text-red-500">
                            {uspaceError || t('operations.newOperation.pilot.noUspaces')}
                        </p>
                    )}
                </div>
            )}

            {dFlightEnabled && uspaceId && CIRCLE_OP_TYPES.includes(summary.opType) && (
                <div className="space-y-2">
                    <Label className={labelCls(isDark)}>
                        {t('operations.newOperation.pilot.circleLabel', { uspace: uspaces.find(u => u.id === uspaceId)?.name ?? uspaceId })}
                        <span className="text-red-500"> *</span>
                    </Label>
                    <DFlightCircleMap
                        value={circle}
                        onChange={c => onCircleChange?.(c)}
                        maxRadiusM={circleMaxRadiusM}
                        isDark={isDark}
                        focusCenter={circleFocusCenter}
                    />
                    {!circle && (
                        <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>{t('operations.newOperation.pilot.circleRequired')}</p>
                    )}
                </div>
            )}

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
                {summary.uspaceLabel && <ReviewRow label={t('operations.newOperation.pilot.summaryUspace')} value={summary.uspaceLabel} isDark={isDark} />}
                {circle && <ReviewRow label={t('operations.newOperation.pilot.summaryCircle')} value={`r=${Math.round(circle.radiusM)}m`} isDark={isDark} />}
            </div>

            <PilotQualificationsSheet
                open={!!qualTarget}
                onOpenChange={(o) => !o && setQualTarget(null)}
                pilotId={qualTarget?.id ?? null}
                pilotName={qualTarget?.name ?? ''}
                isDark={isDark}
            />
        </div>
        </TooltipProvider>
    )
}
