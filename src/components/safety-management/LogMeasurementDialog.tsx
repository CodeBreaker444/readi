'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SpiKpiDefinition } from '@/config/types/safetyMng'
import { computeIndicatorStatus } from '@/lib/spiKpi'
import { Loader2 } from 'lucide-react'
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

    const inputClass = isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500' : ''
    const labelClass = isDark ? 'text-gray-300' : 'text-gray-700'
    const hintClass = `text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`
    const contentClass = isDark
        ? 'bg-[#0f1320] border-white/[0.08] text-white shadow-[0_25px_60px_rgba(0,0,0,0.5)]'
        : 'bg-white border-gray-200 shadow-2xl'

    const STATUS_META: Record<'GREEN' | 'YELLOW' | 'RED', { label: string; dot: string }> = {
        GREEN: { label: t('safety.spiKpi.log.statusGreen'), dot: 'bg-green-500' },
        YELLOW: { label: t('safety.spiKpi.log.statusYellow'), dot: 'bg-yellow-400' },
        RED: { label: t('safety.spiKpi.log.statusRed'), dot: 'bg-red-500' },
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className={`w-[95vw] sm:w-full sm:max-w-md flex flex-col overflow-hidden rounded-xl p-0 gap-0 ${contentClass}`}>
                <DialogHeader className={`px-6 pt-5 pb-4 shrink-0 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <DialogTitle className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {t('safety.spiKpi.log.title')}
                    </DialogTitle>
                    {indicator && (
                        <DialogDescription className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <span className="font-mono">{indicator.indicator_code}</span>
                            {' · '}{indicator.indicator_name}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                        <div className="space-y-1.5">
                            <Label className={labelClass}>
                                {t('safety.spiKpi.log.measurementDate')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="date"
                                value={form.measurement_date}
                                onChange={(e) => set('measurement_date', e.target.value)}
                                className={inputClass}
                            />
                            {errors.measurement_date && (
                                <p className="text-red-500 text-xs">{errors.measurement_date}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className={labelClass}>
                                    {t('safety.spiKpi.log.actualValue')} ({indicator?.unit || '—'}) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={form.actual_value}
                                    onChange={(e) => set('actual_value', e.target.value)}
                                    placeholder={t('safety.spiKpi.log.actualPlaceholder')}
                                    className={`font-mono ${inputClass}`}
                                />
                                {errors.actual_value && (
                                    <p className="text-red-500 text-xs">{errors.actual_value}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClass}>
                                    {t('safety.spiKpi.log.targetValue')} ({indicator?.unit || '—'})
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={form.target_value}
                                    onChange={(e) => set('target_value', e.target.value)}
                                    className={`font-mono ${inputClass}`}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className={labelClass}>{t('safety.spiKpi.log.status')}</Label>
                            <div className={`h-9 flex items-center gap-2 px-3 rounded-md border text-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'border-input'}`}>
                                {previewStatus ? (
                                    <>
                                        <span className={`w-2 h-2 rounded-full ${STATUS_META[previewStatus].dot}`} />
                                        <span>{STATUS_META[previewStatus].label}</span>
                                    </>
                                ) : (
                                    <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>—</span>
                                )}
                            </div>
                            <p className={hintClass}>{t('safety.spiKpi.log.statusHint')}</p>
                        </div>

                    </div>
                    <DialogFooter className={`shrink-0 px-6 py-4 border-t flex-col-reverse sm:flex-row gap-2 ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className={`w-full sm:w-auto cursor-pointer ${isDark ? 'bg-transparent border-gray-700 text-gray-200 hover:bg-white/[0.04]' : ''}`}
                        >
                            {t('safety.spiKpi.log.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto cursor-pointer bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-2"
                        >
                            {loading && <Loader2 size={14} className="animate-spin" />}
                            {loading ? t('safety.spiKpi.log.saving') : t('safety.spiKpi.log.saveMeasurement')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
