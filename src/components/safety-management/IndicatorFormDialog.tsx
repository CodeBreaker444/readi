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
import { Textarea } from '@/components/ui/textarea'
import { SpiKpiDefinition } from '@/config/types/safetyMng'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface FormState {
    indicator_code: string
    indicator_type: 'KPI' | 'SPI'
    indicator_area: 'COMPLIANCE' | 'TRAINING' | 'OPERATIONS' | 'MAINTENANCE'
    indicator_name: string
    indicator_desc: string
    target_value: string
    target_direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER'
    unit: string
    frequency: 'MONTHLY' | 'WEEKLY' | 'QUARTERLY' | 'YEARLY'
    is_active: '1' | '0'
}

interface FormErrors {
    indicator_code?: string
    indicator_name?: string
    target_value?: string
    unit?: string
}

const DEFAULT_STATE: FormState = {
    indicator_code: '',
    indicator_type: 'KPI',
    indicator_area: 'COMPLIANCE',
    indicator_name: '',
    indicator_desc: '',
    target_value: '0',
    target_direction: 'HIGHER_IS_BETTER',
    unit: '%',
    frequency: 'MONTHLY',
    is_active: '1',
}

function validate(values: FormState, isEdit: boolean, t: any): FormErrors {
    const errors: FormErrors = {}
    if (!isEdit) {
        if (!values.indicator_code || values.indicator_code.length < 3)
            errors.indicator_code = t('safety.spiKpi.validation.codeMinChars')
        else if (!/^[A-Z0-9_]+$/.test(values.indicator_code))
            errors.indicator_code = t('safety.spiKpi.validation.codeFormat')
    }
    if (!values.indicator_name || values.indicator_name.length < 2)
        errors.indicator_name = t('safety.spiKpi.validation.nameRequired')
    if (!values.unit)
        errors.unit = t('safety.spiKpi.validation.unitRequired')
    if (isNaN(Number(values.target_value)) || Number(values.target_value) < 0)
        errors.target_value = t('safety.spiKpi.validation.targetPositive')
    return errors
}

type SubmitPayload = Omit<SpiKpiDefinition, 'id' | 'created_at' | 'updated_at'> & { id?: number }

interface Props {
    open: boolean
    onClose: () => void
    onSubmit: (values: SubmitPayload) => Promise<void>
    initial?: SpiKpiDefinition | null
    loading?: boolean
    isDark: boolean
}

export function IndicatorFormDialog({ open, onClose, onSubmit, initial, loading, isDark }: Props) {
    const { t } = useTranslation();
    const isEdit = !!initial
    const [form, setForm] = useState<FormState>(DEFAULT_STATE)
    const [errors, setErrors] = useState<FormErrors>({})

    useEffect(() => {
        if (open) {
            setErrors({})
            setForm(
                initial
                    ? {
                        indicator_code: initial.indicator_code,
                        indicator_type: initial.indicator_type,
                        indicator_area: initial.indicator_area,
                        indicator_name: initial.indicator_name,
                        indicator_desc: initial.indicator_desc ?? '',
                        target_value: String(initial.target_value),
                        target_direction: initial.target_direction ?? 'HIGHER_IS_BETTER',
                        unit: initial.unit,
                        frequency: initial.frequency,
                        is_active: initial.is_active === 1 ? '1' : '0',
                    }
                    : DEFAULT_STATE
            )
        }
    }, [open, initial])

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const errs = validate(form, isEdit, t)
        if (Object.keys(errs).length > 0) { setErrors(errs); return }
        await onSubmit({
            id: initial?.id,
            indicator_code: form.indicator_code,
            indicator_type: form.indicator_type,
            indicator_area: form.indicator_area,
            indicator_name: form.indicator_name,
            indicator_desc: form.indicator_desc || null,
            target_value: Number(form.target_value),
            target_direction: form.target_direction,
            unit: form.unit,
            frequency: form.frequency,
            is_active: form.is_active === '1' ? 1 : 0,
        })
    }

    const inputClass = isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500' : ''
    const labelClass = isDark ? 'text-gray-300' : 'text-gray-700'
    const hintClass = `text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`
    const errorClass = 'text-red-500 text-xs'
    const contentClass = isDark
        ? 'bg-[#0f1320] border-white/[0.08] text-white shadow-[0_25px_60px_rgba(0,0,0,0.5)]'
        : 'bg-white border-gray-200 shadow-2xl'
    const selectContentClass = isDark ? 'bg-[#0f1320] border-white/[0.08] text-white' : ''

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className={`w-[95vw] sm:w-full sm:max-w-3xl max-h-[92vh] flex flex-col overflow-hidden rounded-xl p-0 gap-0 ${contentClass}`}>
                <DialogHeader className={`px-6 pt-5 pb-4 shrink-0 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <DialogTitle className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {isEdit ? t('safety.spiKpi.form.editTitle') : t('safety.spiKpi.form.newTitle')}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">

                            <div className="space-y-1.5">
                                <Label className={labelClass}>{t('safety.spiKpi.form.code')} {!isEdit && <span className="text-red-500">*</span>}</Label>
                                <Input
                                    value={form.indicator_code}
                                    onChange={(e) => set('indicator_code', e.target.value)}
                                    disabled={isEdit}
                                    placeholder={t('safety.spiKpi.form.codePlaceholder')}
                                    className={`font-mono text-sm ${inputClass} disabled:opacity-50`}
                                />
                                {!isEdit && <p className={hintClass}>{t('safety.spiKpi.form.codeHint')}</p>}
                                {errors.indicator_code && <p className={errorClass}>{errors.indicator_code}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClass}>{t('safety.spiKpi.form.unit')} <span className="text-red-500">*</span></Label>
                                <Input
                                    value={form.unit}
                                    onChange={(e) => set('unit', e.target.value)}
                                    placeholder={t('safety.spiKpi.form.unitPlaceholder')}
                                    className={inputClass}
                                />
                                {errors.unit && <p className={errorClass}>{errors.unit}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClass}>{t('safety.spiKpi.form.type')}</Label>
                                <Select value={form.indicator_type} onValueChange={(v) => set('indicator_type', v as FormState['indicator_type'])} disabled={isEdit}>
                                    <SelectTrigger className={`w-full ${inputClass}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className={selectContentClass}>
                                        <SelectItem value="KPI">{t('safety.spiKpi.form.kpiOption')}</SelectItem>
                                        <SelectItem value="SPI">{t('safety.spiKpi.form.spiOption')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClass}>{t('safety.spiKpi.form.area')}</Label>
                                <Select value={form.indicator_area} onValueChange={(v) => set('indicator_area', v as FormState['indicator_area'])} disabled={isEdit}>
                                    <SelectTrigger className={`w-full ${inputClass}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className={selectContentClass}>
                                        {(['COMPLIANCE', 'TRAINING', 'OPERATIONS', 'MAINTENANCE'] as const).map((a) => (
                                            <SelectItem key={a} value={a}>
                                                {t(`safety.spiKpi.areas.${a}`)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:col-span-2 space-y-1.5">
                                <Label className={labelClass}>{t('safety.spiKpi.form.indicatorName')} <span className="text-red-500">*</span></Label>
                                <Input
                                    value={form.indicator_name}
                                    onChange={(e) => set('indicator_name', e.target.value)}
                                    placeholder={t('safety.spiKpi.form.namePlaceholder')}
                                    className={inputClass}
                                />
                                {errors.indicator_name && <p className={errorClass}>{errors.indicator_name}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClass}>{t('safety.spiKpi.form.targetValue')} <span className="text-red-500">*</span></Label>
                                <Input
                                    value={form.target_value}
                                    onChange={(e) => set('target_value', e.target.value)}
                                    type="number"
                                    step="0.01"
                                    className={`font-mono ${inputClass}`}
                                />
                                {errors.target_value && <p className={errorClass}>{errors.target_value}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClass}>{t('safety.spiKpi.form.targetDirection')}</Label>
                                <Select value={form.target_direction} onValueChange={(v) => set('target_direction', v as FormState['target_direction'])}>
                                    <SelectTrigger className={`w-full ${inputClass}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className={selectContentClass}>
                                        <SelectItem value="HIGHER_IS_BETTER">{t('safety.spiKpi.form.higherIsBetter')}</SelectItem>
                                        <SelectItem value="LOWER_IS_BETTER">{t('safety.spiKpi.form.lowerIsBetter')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className={hintClass}>{t('safety.spiKpi.form.targetDirectionHint')}</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClass}>{t('safety.spiKpi.form.frequency')}</Label>
                                <Select value={form.frequency} onValueChange={(v) => set('frequency', v as FormState['frequency'])}>
                                    <SelectTrigger className={`w-full ${inputClass}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className={selectContentClass}>
                                        {(['MONTHLY', 'WEEKLY', 'QUARTERLY', 'YEARLY'] as const).map((f) => (
                                            <SelectItem key={f} value={f}>
                                                {t(`safety.spiKpi.frequency.${f}`)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClass}>{t('safety.spiKpi.form.statusLabel')}</Label>
                                <Select value={form.is_active} onValueChange={(v) => set('is_active', v as '1' | '0')}>
                                    <SelectTrigger className={`w-full ${inputClass}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className={selectContentClass}>
                                        <SelectItem value="1">{t('safety.spiKpi.form.activeMonitoring')}</SelectItem>
                                        <SelectItem value="0">{t('safety.spiKpi.form.disabledDraft')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:col-span-2 space-y-1.5">
                                <Label className={labelClass}>{t('safety.spiKpi.form.description')}</Label>
                                <Textarea
                                    value={form.indicator_desc}
                                    onChange={(e) => set('indicator_desc', e.target.value)}
                                    rows={3}
                                    placeholder={t('safety.spiKpi.form.descPlaceholder')}
                                    className={`${inputClass} resize-none`}
                                />
                            </div>

                        </div>
                    </div>

                    <DialogFooter className={`shrink-0 px-6 py-4 border-t flex-col-reverse sm:flex-row gap-2 ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className={`w-full sm:w-auto cursor-pointer ${isDark ? 'bg-transparent border-gray-700 text-gray-200 hover:bg-white/[0.04]' : ''}`}
                        >
                            {t('safety.spiKpi.form.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto cursor-pointer bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-2"
                        >
                            {loading && <Loader2 size={14} className="animate-spin" />}
                            {loading ? t('safety.spiKpi.form.processing') : (isEdit ? t('safety.spiKpi.form.updateIndicator') : t('safety.spiKpi.form.createIndicator'))}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
