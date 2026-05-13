'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateTimeInTz } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { inputCls, labelCls, scCls, siCls, SectionTitle } from './OperationModalHelpers'
import { ConflictEvent, DAYS_OF_WEEK, GenericOption, LucOption, SchedulerFormData } from './OperationModalTypes'

interface Props {
    form: SchedulerFormData
    onChange: <K extends keyof SchedulerFormData>(field: K, value: SchedulerFormData[K]) => void
    isEdit: boolean
    statusName?: string
    generatingId: boolean
    onRefreshMissionId: () => void
    loadingConflicts: boolean
    conflictChecked: boolean
    conflicts: ConflictEvent[]
    timezone: string
    types: GenericOption[]
    categories: GenericOption[]
    lucProcedures: LucOption[]
    loadingOptions: boolean
    isDark: boolean
}

export function OperationStepScheduler({
    form, onChange, isEdit, statusName, generatingId, onRefreshMissionId,
    loadingConflicts, conflictChecked, conflicts, timezone,
    types, categories, lucProcedures, loadingOptions, isDark,
}: Props) {
    const { t } = useTranslation()

    return (
        <div className="space-y-3">
            <SectionTitle isDark={isDark}>{t('operations.newOperation.scheduler.sectionTitle')}</SectionTitle>

            <div className="max-w-xs">
                <Label className={labelCls(isDark)}>{t('operations.newOperation.scheduler.missionIdLabel')} <span className="text-red-500">*</span></Label>
                <div className="flex gap-2 items-center">
                    <Input
                        value={form.missionCode}
                        onChange={e => onChange('missionCode', e.target.value.toUpperCase())}
                        placeholder={t('operations.newOperation.scheduler.missionIdPlaceholder')}
                        className={cn(inputCls(isDark), 'font-mono tracking-widest uppercase')}
                        maxLength={6}
                    />
                    <button
                        type="button"
                        onClick={onRefreshMissionId}
                        disabled={generatingId || isEdit}
                        title={isEdit ? t('operations.newOperation.scheduler.missionIdLocked') : t('operations.newOperation.scheduler.regenerateId')}
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
                <Label className={labelCls(isDark)}>{t('operations.newOperation.scheduler.startDateTime')} <span className="text-red-500">*</span></Label>
                <Input
                    type="datetime-local"
                    value={form.scheduledStart}
                    onChange={e => onChange('scheduledStart', e.target.value)}
                    className={inputCls(isDark)}
                />
            </div>

            {!isEdit && (
                <div className={cn('rounded-lg border p-3 space-y-3', isDark ? 'border-slate-600 bg-slate-700/30' : 'border-slate-200 bg-slate-50/60')}>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="is_recurring"
                            checked={form.isRecurring}
                            onCheckedChange={v => {
                                onChange('isRecurring', !!v)
                                onChange('daysOfWeek', [])
                                onChange('recurUntil', '')
                            }}
                            className="border-sky-500 data-[state=checked]:bg-sky-600"
                        />
                        <label htmlFor="is_recurring" className={cn('flex items-center gap-1.5 text-sm font-medium cursor-pointer', isDark ? 'text-slate-200' : 'text-slate-700')}>
                            <RefreshCw className="h-3.5 w-3.5 text-sky-500" />
                            {t('operations.newOperation.scheduler.recurring')}
                        </label>
                    </div>
                    {form.isRecurring && (
                        <div className="space-y-3 pl-1">
                            <div>
                                <Label className={cn(labelCls(isDark), 'text-xs')}>{t('operations.newOperation.scheduler.daysOfWeek')} <span className="text-red-500">*</span></Label>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {DAYS_OF_WEEK.map(day => {
                                        const checked = form.daysOfWeek.includes(day.value)
                                        return (
                                            <button key={day.value} type="button"
                                                onClick={() => onChange('daysOfWeek', checked
                                                    ? form.daysOfWeek.filter(d => d !== day.value)
                                                    : [...form.daysOfWeek, day.value]
                                                )}
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
                                    <Label className={cn(labelCls(isDark), 'text-xs')}>{t('operations.newOperation.scheduler.repeatUntil')} <span className="text-red-500">*</span></Label>
                                    <Input type="date" value={form.recurUntil} onChange={e => onChange('recurUntil', e.target.value)} className={inputCls(isDark)} />
                                </div>
                                <div>
                                    <Label className={cn(labelCls(isDark), 'text-xs')}>{t('operations.newOperation.scheduler.groupLabel')} <span className="text-[10px] text-muted-foreground font-normal">{t('operations.newOperation.scheduler.optional')}</span></Label>
                                    <Input value={form.missionGroupLabel} onChange={e => onChange('missionGroupLabel', e.target.value)} placeholder={t('operations.newOperation.scheduler.groupLabelPlaceholder')} className={inputCls(isDark)} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {loadingConflicts && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> {t('operations.newOperation.scheduler.checkingConflicts')}
                </div>
            )}
            {!loadingConflicts && conflictChecked && conflicts.length > 0 && (
                <div className={cn('rounded-md border px-3 py-2.5 space-y-1', isDark ? 'border-amber-700 bg-amber-900/20' : 'border-amber-200 bg-amber-50')}>
                    <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <p className={cn('text-xs font-semibold', isDark ? 'text-amber-400' : 'text-amber-700')}>
                            {t('operations.newOperation.scheduler.conflictsFound', { count: conflicts.length })}
                        </p>
                    </div>
                    {conflicts.map(c => (
                        <p key={c.id} className={cn('text-xs pl-5', isDark ? 'text-amber-400/80' : 'text-amber-600')}>
                            • {c.title} ({formatDateTimeInTz(c.start, timezone)}{c.end ? ` → ${formatDateTimeInTz(c.end, timezone)}` : ''})
                        </p>
                    ))}
                </div>
            )}
            {!loadingConflicts && conflictChecked && conflicts.length === 0 && form.scheduledStart && (
                <div className={cn('rounded-md border px-3 py-2 flex items-center gap-1.5', isDark ? 'border-emerald-700 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50')}>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <p className={cn('text-xs font-medium', isDark ? 'text-emerald-400' : 'text-emerald-700')}>{t('operations.newOperation.scheduler.noConflicts')}</p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className={labelCls(isDark)}>{t('operations.newOperation.scheduler.missionType')}</Label>
                    <Select value={form.typeId} onValueChange={v => onChange('typeId', v)} disabled={loadingOptions}>
                        <SelectTrigger className={inputCls(isDark)}>
                            <SelectValue placeholder={t('operations.newOperation.scheduler.selectType')} />
                        </SelectTrigger>
                        <SelectContent className={scCls(isDark)}>
                            {types.map(type => <SelectItem key={type.id} value={String(type.id)} className={siCls(isDark)}>{type.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className={labelCls(isDark)}>{t('operations.newOperation.scheduler.category')}</Label>
                    <Select value={form.categoryId} onValueChange={v => onChange('categoryId', v)} disabled={loadingOptions}>
                        <SelectTrigger className={inputCls(isDark)}>
                            <SelectValue placeholder={t('operations.newOperation.scheduler.selectCategory')} />
                        </SelectTrigger>
                        <SelectContent className={scCls(isDark)}>
                            {categories.map(c => <SelectItem key={c.id} value={String(c.id)} className={siCls(isDark)}>{c.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className={labelCls(isDark)}>{t('operations.newOperation.scheduler.status')}</Label>
                    <Input value={statusName || t('operations.newOperation.scheduler.scheduled')} disabled className={cn(inputCls(isDark), 'opacity-60 cursor-not-allowed')} />
                </div>
                <div>
                    <Label className={labelCls(isDark)}>{t('operations.newOperation.scheduler.procedure')} <span className="text-red-500">*</span></Label>
                    <Select value={form.lucId} onValueChange={v => onChange('lucId', v)}>
                        <SelectTrigger className={inputCls(isDark)}>
                            <SelectValue placeholder={lucProcedures.length === 0 ? t('operations.newOperation.scheduler.procedureNone') : t('operations.newOperation.scheduler.selectProcedure')} />
                        </SelectTrigger>
                        <SelectContent className={scCls(isDark)}>
                            {lucProcedures.map(p => <SelectItem key={p.id} value={String(p.id)} className={siCls(isDark)}>{p.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="col-span-2">
                    <Label className={labelCls(isDark)}>{t('operations.newOperation.scheduler.missionName')} <span className="text-[10px] text-muted-foreground font-normal">{t('operations.newOperation.scheduler.optional')}</span></Label>
                    <Input value={form.missionName} onChange={e => onChange('missionName', e.target.value)} placeholder={t('operations.newOperation.scheduler.missionNamePlaceholder')} className={inputCls(isDark)} />
                </div>
                {isEdit && (
                    <div className="col-span-2">
                        <Label className={labelCls(isDark)}>{t('operations.newOperation.scheduler.distanceFlown')} <span className="text-[10px] text-muted-foreground font-normal">{t('operations.newOperation.scheduler.optional')}</span></Label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.distanceFlown}
                            onChange={e => onChange('distanceFlown', e.target.value)}
                            placeholder={t('operations.newOperation.scheduler.distancePlaceholder')}
                            className={inputCls(isDark)}
                        />
                    </div>
                )}
                <div className="col-span-2">
                    <Label className={labelCls(isDark)}>{t('operations.newOperation.scheduler.location')} <span className="text-[10px] text-muted-foreground font-normal">{t('operations.newOperation.scheduler.optional')}</span></Label>
                    <Input value={form.location} onChange={e => onChange('location', e.target.value)} placeholder={t('operations.newOperation.scheduler.locationPlaceholder')} className={inputCls(isDark)} />
                </div>
            </div>

            <div>
                <Label className={labelCls(isDark)}>{t('operations.newOperation.scheduler.notes')} <span className="text-[10px] text-muted-foreground font-normal">{t('operations.newOperation.scheduler.optional')}</span></Label>
                <Input value={form.notes} onChange={e => onChange('notes', e.target.value)} placeholder={t('operations.newOperation.scheduler.notesPlaceholder')} className={inputCls(isDark)} />
            </div>
        </div>
    )
}
