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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { SpiKpiDefinition } from '@/config/types/safetyMng'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface FormState {
    measurement_date: string
    actual_value: string
    target_value: string
    status: 'GREEN' | 'YELLOW' | 'RED'
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
        status: 'GREEN' | 'YELLOW' | 'RED'
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
        status: 'GREEN',
    })
    const [errors, setErrors] = useState<FormErrors>({})

    useEffect(() => {
        if (open && indicator) {
            setErrors({})
            setForm({
                measurement_date: todayStr(),
                actual_value: '',
                target_value: String(indicator.target_value),
                status: 'GREEN',
            })
        }
    }, [open, indicator])

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
            status: form.status,
        })
    }

    const bgClass = isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'
    const inputClass = isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-gray-900'
    const labelClass = isDark ? 'text-slate-400' : 'text-slate-500'

const STATUS_OPTIONS: { value: 'GREEN' | 'YELLOW' | 'RED'; label: string; dot: string }[] = [
    { value: 'GREEN', label: t('safety.spiKpi.log.statusGreen'), dot: 'bg-green-500' },
    { value: 'YELLOW', label: t('safety.spiKpi.log.statusYellow'), dot: 'bg-yellow-400' },
    { value: 'RED', label: t('safety.spiKpi.log.statusRed'), dot: 'bg-red-500' },
]
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className={`max-w-md transition-colors duration-300 ${bgClass}`}>
                <DialogHeader>
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

                <form onSubmit={handleSubmit} className="space-y-4 pt-1">

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
                        <Select value={form.status} onValueChange={(v) => set('status', v as FormState['status'])}>
                            <SelectTrigger className={`h-10 ${inputClass}`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white'}>
                                {STATUS_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                                            {opt.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="pt-4 border-t border-slate-700/50 mt-2">
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
