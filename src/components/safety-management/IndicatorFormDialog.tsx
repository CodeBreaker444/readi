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
import { useEffect, useState } from 'react'

interface FormState {
    indicator_code: string
    indicator_type: 'KPI' | 'SPI'
    indicator_area: 'COMPLIANCE' | 'TRAINING' | 'OPERATIONS' | 'MAINTENANCE'
    indicator_name: string
    indicator_desc: string
    target_value: string
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
    unit: '%',
    frequency: 'MONTHLY',
    is_active: '1',
}

function validate(values: FormState, isEdit: boolean): FormErrors {
    const errors: FormErrors = {}
    if (!isEdit) {
        if (!values.indicator_code || values.indicator_code.length < 3)
            errors.indicator_code = 'Minimum 3 characters'
        else if (!/^[A-Z0-9_]+$/.test(values.indicator_code))
            errors.indicator_code = 'Uppercase, numbers, underscores only'
    }
    if (!values.indicator_name || values.indicator_name.length < 2)
        errors.indicator_name = 'Name is required'
    if (!values.unit)
        errors.unit = 'Unit is required'
    if (isNaN(Number(values.target_value)) || Number(values.target_value) < 0)
        errors.target_value = 'Must be a positive number'
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
        const errs = validate(form, isEdit)
        if (Object.keys(errs).length > 0) { setErrors(errs); return }
        await onSubmit({
            id: initial?.id,
            indicator_code: form.indicator_code,
            indicator_type: form.indicator_type,
            indicator_area: form.indicator_area,
            indicator_name: form.indicator_name,
            indicator_desc: form.indicator_desc || null,
            target_value: Number(form.target_value),
            unit: form.unit,
            frequency: form.frequency,
            is_active: form.is_active === '1' ? 1 : 0,
        })
    }

    const bgClass = isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'
    const inputClass = isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-gray-900'
    const labelClass = isDark ? 'text-slate-400' : 'text-slate-500'

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className={`max-w-2xl transition-colors duration-300 ${bgClass}`}>
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">
                        {isEdit ? 'Edit Indicator' : 'New Indicator'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">

                        <div className="space-y-1.5">
                            <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>Code</Label>
                            <Input
                                value={form.indicator_code}
                                onChange={(e) => set('indicator_code', e.target.value)}
                                disabled={isEdit}
                                placeholder="e.g. OPS_SAFETY_01"
                                className={`font-mono text-sm h-10 ${inputClass} disabled:opacity-40`}
                            />
                            {!isEdit && <p className="text-slate-500 text-[10px] italic">Immutable after saving</p>}
                            {errors.indicator_code && <p className="text-red-500 text-xs font-medium">{errors.indicator_code}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>Unit</Label>
                            <Input
                                value={form.unit}
                                onChange={(e) => set('unit', e.target.value)}
                                placeholder="% / count / hours"
                                className={`h-10 ${inputClass}`}
                            />
                            {errors.unit && <p className="text-red-500 text-xs font-medium">{errors.unit}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>Type</Label>
                            <Select value={form.indicator_type} onValueChange={(v) => set('indicator_type', v as FormState['indicator_type'])} disabled={isEdit}>
                                <SelectTrigger className={`h-10 ${inputClass}`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className={isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white'}>
                                    <SelectItem value="KPI">KPI - Key Performance</SelectItem>
                                    <SelectItem value="SPI">SPI - Safety Performance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>Area</Label>
                            <Select value={form.indicator_area} onValueChange={(v) => set('indicator_area', v as FormState['indicator_area'])} disabled={isEdit}>
                                <SelectTrigger className={`h-10 ${inputClass}`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className={isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white'}>
                                    {(['COMPLIANCE', 'TRAINING', 'OPERATIONS', 'MAINTENANCE'] as const).map((a) => (
                                        <SelectItem key={a} value={a}>{a}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-2 space-y-1.5">
                            <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>Indicator Name</Label>
                            <Input
                                value={form.indicator_name}
                                onChange={(e) => set('indicator_name', e.target.value)}
                                placeholder="Enter descriptive name..."
                                className={`h-10 ${inputClass}`}
                            />
                            {errors.indicator_name && <p className="text-red-500 text-xs font-medium">{errors.indicator_name}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>Target Value</Label>
                            <Input
                                value={form.target_value}
                                onChange={(e) => set('target_value', e.target.value)}
                                type="number"
                                step="0.01"
                                className={`h-10 font-mono ${inputClass}`}
                            />
                            {errors.target_value && <p className="text-red-500 text-xs font-medium">{errors.target_value}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>Reporting Frequency</Label>
                            <Select value={form.frequency} onValueChange={(v) => set('frequency', v as FormState['frequency'])}>
                                <SelectTrigger className={`h-10 ${inputClass}`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className={isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white'}>
                                    {(['MONTHLY', 'WEEKLY', 'QUARTERLY', 'YEARLY'] as const).map((f) => (
                                        <SelectItem key={f} value={f}>{f}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-2 space-y-1.5">
                            <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>Description</Label>
                            <Textarea
                                value={form.indicator_desc}
                                onChange={(e) => set('indicator_desc', e.target.value)}
                                rows={3}
                                placeholder="Explain what this indicator measures..."
                                className={`${inputClass} resize-none`}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className={`text-[10px] uppercase tracking-widest font-bold ${labelClass}`}>Status</Label>
                            <Select value={form.is_active} onValueChange={(v) => set('is_active', v as '1' | '0')}>
                                <SelectTrigger className={`h-10 ${inputClass}`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className={isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white'}>
                                    <SelectItem value="1">Active / Monitoring</SelectItem>
                                    <SelectItem value="0">Disabled / Draft</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                    </div>

                    <DialogFooter className="pt-4 border-t border-slate-700/50 mt-4">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={onClose} 
                            className={`${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={loading} 
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 shadow-lg shadow-blue-500/20"
                        >
                            {loading ? 'Processing...' : (isEdit ? 'Update Indicator' : 'Create Indicator')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}