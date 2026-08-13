'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SpiKpiDefinition } from '@/config/types/safetyMng'
import { computeIndicatorStatus } from '@/lib/spiKpi'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface FormState {
    measurement_date: string
    actual_value: string
    target_value: string
}

interface FormErrors {
    measurement_date?: string
    actual_value?: string
}

interface Props {
    open: boolean
    onClose: () => void
    onSubmit: (values: {
        definition_id: number
        measurement_date: string
        actual_value: number
        target_value: number
    }) => Promise<void>
    indicator: SpiKpiDefinition | null
    loading?: boolean
    isDark: boolean
}

function todayStr() {
    return new Date().toISOString().slice(0, 10)
}

function validate(form: FormState, t: any): FormErrors { 
    const errors: FormErrors = {}
    if (!form.measurement_date) errors.measurement_date = t('safety.spiKpi.validation.dateRequired')
    if (form.actual_value === '' || isNaN(Number(form.actual_value)))
        errors.actual_value = t('safety.spiKpi.validation.valueNumber')
    return errors
}

export function LogMeasurementDialog({ open, onClose, onSubmit, indicator, loading, isDark }: Props) {
    const { t } = useTranslation();
    const [form, setForm] = useState<FormState>({
        measurement_date: todayStr(),
        actual_value: '',
        target_value: '',
    })
    const [errors, setErrors] = useState<FormErrors>({})

    useEffect(() => {
        if (open && indicator) {
            setErrors({})
            setForm({
                measurement_date: todayStr(),
                actual_value: '',
                target_value: String(indicator.target_value),
            })
        }
    }, [open, indicator])

    const previewStatus = form.actual_value !== '' && !isNaN(Number(form.actual_value)) && !isNaN(Number(form.target_value))
        ? computeIndicatorStatus(Number(form.actual_value), Number(form.target_value), indicator?.target_direction ?? 'HIGHER_IS_BETTER')
        : null

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const errs = validate(form, t)
        if (Object.keys(errs).length > 0) { setErrors(errs); return }
        if (!indicator) return
        await onSubmit({
            definition_id: indicator.id,
            measurement_date: form.measurement_date,
            actual_value: Number(form.actual_value),
            target_value: Number(form.target_value),
        })
    }

    const bgClass = isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'
    const inputClass = isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-gray-900'
    const labelClass = isDark ? 'text-slate-400' : 'text-slate-500'

    const STATUS_META: Record<'GREEN' | 'YELLOW' | 'RED', { label: string; dot: string }> = {
        GREEN: { label: t('safety.spiKpi.log.statusGreen'), dot: 'bg-green-500' },
        YELLOW: { label: t('safety.spiKpi.log.statusYellow'), dot: 'bg-yellow-400' },
        RED: { label: t('safety.spiKpi.log.statusRed'), dot: 'bg-red-500' },
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className={`max-w-md transition-colors duration-300 flex flex-col overflow-hidden p-0 gap-0 ${bgClass}`}>
                <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
                    <DialogTitle className="text-lg font-bold tracking-tight">
                     {t('safety.spiKpi.log.title')}
                    </DialogTitle>
                    {indicator && (
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span className="font-mono">{indicator.indicator_code}</span>
                            {' · '}{indicator.indicator_name}
                        </p>
                    )}
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

                    <div className="space-y-1.5">
                        <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>
                          {t('safety.spiKpi.log.measurementDate')}
                        </Label>
                        <Input
                            type="date"
                            value={form.measurement_date}
                            onChange={(e) => set('measurement_date', e.target.value)}
                            className={`h-10 ${inputClass}`}
                        />
                        {errors.measurement_date && (
                            <p className="text-red-500 text-xs font-medium">{errors.measurement_date}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>
                           {t('safety.spiKpi.log.actualValue')} ({indicator?.unit || '—'})
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={form.actual_value}
                                onChange={(e) => set('actual_value', e.target.value)}
                                placeholder={t('safety.spiKpi.log.actualPlaceholder')}
                                className={`h-10 font-mono ${inputClass}`}
                            />
                            {errors.actual_value && (
                                <p className="text-red-500 text-xs font-medium">{errors.actual_value}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>
                         {t('safety.spiKpi.log.targetValue')} ({indicator?.unit || '—'})
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={form.target_value}
                                onChange={(e) => set('target_value', e.target.value)}
                                className={`h-10 font-mono ${inputClass}`}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>
                        {t('safety.spiKpi.log.status')}
                        </Label>
                        <div className={`h-10 flex items-center gap-2 px-3 rounded-md border ${inputClass}`}>
                            {previewStatus ? (
                                <>
                                    <span className={`w-2 h-2 rounded-full ${STATUS_META[previewStatus].dot}`} />
                                    <span className="text-sm">{STATUS_META[previewStatus].label}</span>
                                </>
                            ) : (
                                <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>—</span>
                            )}
                        </div>
                        <p className="text-slate-500 text-[10px] italic">{t('safety.spiKpi.log.statusHint')}</p>
                    </div>

                </div>
                    <DialogFooter className="shrink-0 px-6 py-4 border-t">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className={`${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                           {t('safety.spiKpi.log.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-violet-600 hover:bg-violet-500 text-white px-8 shadow-lg shadow-violet-500/20"
                        >
                           {loading ? t('safety.spiKpi.log.saving') : t('safety.spiKpi.log.saveMeasurement')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
