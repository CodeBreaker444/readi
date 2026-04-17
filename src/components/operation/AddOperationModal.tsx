'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

interface AddOperationModalProps {
    open: boolean
    onClose: () => void
    onSuccess: () => void
    isDark: boolean
}

interface FormData {
    mission_name: string
    scheduled_start: string
    scheduled_end: string
    fk_pilot_user_id: number
    fk_tool_id: number | null
    fk_mission_type_id: number | null
    fk_mission_category_id: number | null
    fk_planning_id: number | null
    fk_luc_procedure_id?: number
    location?: string
    notes?: string
    status_name: string
    is_recurring: boolean
    days_of_week: number[]
    recur_until: string
    mission_group_label: string
}

type OptionItem = { 
    id: number; 
    label: string; 
    in_maintenance?: boolean; 
    has_drone_component?: boolean; 
    steps?: any 
}

const createOperationCalendarSchema = z.object({
    mission_name: z.string().min(1, 'Mission name is required'),
    scheduled_start: z.string().min(1, 'Start date/time is required'),
    scheduled_end: z.string().min(1, 'End date/time is required'),
    fk_pilot_user_id: z.number({ message: 'Pilot is required' }).int().min(1, 'Pilot is required'),
    fk_tool_id: z.number().int().nullable().optional(),
    fk_mission_type_id: z.number().int().nullable().optional(),
    fk_mission_category_id: z.number().int().nullable().optional(),
    fk_planning_id: z.number().int().nullable().optional(),
    fk_luc_procedure_id: z.number().int().positive('LUC procedure is required'),
    location: z.string().optional(),
    notes: z.string().optional(),
    status_name: z.string().min(1),
    is_recurring: z.boolean().default(false),
    days_of_week: z.array(z.number()).default([]),
    recur_until: z.string().default(''),
    mission_group_label: z.string().default(''),
}).refine(
    (d) => !d.is_recurring || d.days_of_week.length > 0,
    { message: 'Select at least one day of the week', path: ['days_of_week'] }
).refine(
    (d) => !d.is_recurring || !!d.recur_until,
    { message: 'Recurrence end date is required', path: ['recur_until'] }
)

const now = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const defaultStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`
const defaultEnd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours() + 1)}:00`

export function AddOperationModal({ open, onClose, onSuccess, isDark }: AddOperationModalProps) {
    const { t } = useTranslation()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [pilots, setPilots] = useState<OptionItem[]>([])
    const [tools, setTools] = useState<OptionItem[]>([])
    const [missionTypes, setMissionTypes] = useState<OptionItem[]>([])
    const [missionCategories, setMissionCategories] = useState<OptionItem[]>([])
    const [lucProcedures, setLucProcedures] = useState<OptionItem[]>([])
    const [addedIds, setAddedIds] = useState<number[]>([])

    const DAYS_OF_WEEK = [
        { value: 1, label: 'Mon' },
        { value: 2, label: 'Tue' },
        { value: 3, label: 'Wed' },
        { value: 4, label: 'Thu' },
        { value: 5, label: 'Fri' },
        { value: 6, label: 'Sat' },
        { value: 0, label: 'Sun' },
    ]

    const {
        register,
        handleSubmit,
        control,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(createOperationCalendarSchema) as any,
        defaultValues: {
            scheduled_start: defaultStart,
            scheduled_end: defaultEnd,
            status_name: 'Scheduled',
            fk_pilot_user_id: undefined,
            fk_tool_id: null,
            fk_mission_type_id: null,
            fk_mission_category_id: null,
            fk_planning_id: null,
            is_recurring: false,
            days_of_week: [],
            recur_until: '',
            mission_group_label: '',
        },
    })

    const isRecurring = watch('is_recurring')
    const daysOfWeek = watch('days_of_week')

    useEffect(() => {
        if (!open) return
        const fetchOptions = async () => {
            try {
                const res = await axios.get('/api/operation/options')
                const d = res.data
                setPilots((d.pilots ?? []).map((p: any) => ({
                    id: p.user_id,
                    label: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
                })))
                setTools((d.tools ?? []).map((t: any) => ({
                    id: t.tool_id,
                    label: `${t.tool_code} — ${t.tool_name}`,
                    in_maintenance: t.in_maintenance ?? false,
                    has_drone_component: t.has_drone_component,
                })))
                setMissionTypes((d.types ?? []).map((t: any) => ({
                    id: t.mission_type_id,
                    label: t.type_name,
                })))
                setMissionCategories((d.categories ?? []).map((c: any) => ({
                    id: c.category_id,
                    label: c.category_name,
                })))
                setLucProcedures((d.lucProcedures ?? []).map((p: any) => ({
                    id: p.procedure_id,
                    label: `${p.procedure_code} — ${p.procedure_name}`,
                    steps: p.procedure_steps,
                })))
            } catch {
                toast.error(t('operations.board.toast.loadError'))
            }
        }
        fetchOptions()
    }, [open, t])

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true)
        try {
            const selectedProc = lucProcedures.find(p => p.id === data.fk_luc_procedure_id)
            const payload = {
                ...data,
                luc_procedure_steps: selectedProc?.steps ?? null,
            }
            const res = await axios.post('/api/operation/calendar/create', payload)
            const result = res.data
            if (!result.success) {
                toast.error(result.error ?? t('operations.board.toast.statusUpdateFailed'))
                return
            }
            
            toast.success(data.is_recurring 
                ? t('operations.table.toast.statusSuccess', { count: '...', status: t('operations.table.status.planned') })
                : t('operations.table.toast.statusSuccess', { count: 1, status: t('operations.table.status.planned') })
            )

            setAddedIds([result.operationId])
            onSuccess()
            setTimeout(() => handleClose(), 1500)
        } catch (err: any) {
            toast.error(err.response?.data?.error || t('operations.board.toast.statusUpdateFailed'))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        reset()
        setAddedIds([])
        onClose()
    }

    const inputClass = `${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400' : 'bg-white border-slate-300 text-slate-900'} focus:ring-2 focus:ring-sky-500`
    const labelClass = `text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`
    const errorClass = 'text-red-400 text-xs mt-1'

    const SelectField = ({ name, label, options, placeholder }: { name: any, label: string, options: OptionItem[], placeholder: string }) => (
        <div>
            <Label className={labelClass}>{label}</Label>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <Select
                        onValueChange={(v) => {
                            const selected = options.find(o => o.id === Number(v))
                            if (selected?.in_maintenance) {
                                toast.error(t('operations.table.detail.logFlightsHours', { code: selected.label }))
                                return
                            }
                            field.onChange(Number(v))
                        }}
                        value={field.value != null ? String(field.value) : ''}
                    >
                        <SelectTrigger className={`mt-1 ${inputClass}`}>
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent className={isDark ? 'bg-slate-700 border-slate-600' : ''}>
                            {options.map((o) => (
                                <SelectItem
                                    key={o.id}
                                    value={String(o.id)}
                                    disabled={o.in_maintenance || o.has_drone_component === false}
                                    className={isDark ? 'text-white focus:bg-slate-600' : ''}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className={o.has_drone_component === false ? 'opacity-40' : ''}>{o.label}</span>
                                        {o.in_maintenance && (
                                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 leading-none">
                                                {t('operations.table.detail.maintenance').toUpperCase()}
                                            </span>
                                        )}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />
            {errors[name as keyof FormData] && (
                <p className={errorClass}>{String(errors[name as keyof FormData]?.message ?? '')}</p>
            )}
        </div>
    )

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent
                className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
            >
                <DialogHeader>
                    <DialogTitle className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {t('operations.table.newOperation')}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
                    <div>
                        <Label className={labelClass}>{t('operations.table.detail.missionId')}</Label>
                        <Input
                            {...register('mission_name')}
                            placeholder={t('operations.table.filters.searchPlaceholder')}
                            className={`mt-1 ${inputClass}`}
                        />
                        {errors.mission_name && <p className={errorClass}>{errors.mission_name.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className={labelClass}>{t('operations.table.detail.scheduled')}</Label>
                            <Input type="datetime-local" {...register('scheduled_start')} className={`mt-1 ${inputClass}`} />
                        </div>
                        <div>
                            <Label className={labelClass}>{t('operations.table.detail.endTime')}</Label>
                            <Input type="datetime-local" {...register('scheduled_end')} className={`mt-1 ${inputClass}`} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <SelectField name="fk_pilot_user_id" label={t('operations.table.detail.pilotInCommand')} options={pilots} placeholder={t('operations.table.filters.allPilots')} />
                        <SelectField name="fk_tool_id" label={t('operations.table.detail.droneSystem')} options={tools} placeholder={t('operations.table.detail.droneSystem')} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <SelectField name="fk_mission_type_id" label={t('operations.board.detail.missionType')} options={missionTypes} placeholder={t('operations.board.detail.missionType')} />
                        <SelectField name="fk_mission_category_id" label={t('operations.board.detail.category')} options={missionCategories} placeholder={t('operations.board.detail.category')} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className={labelClass}>{t('operations.table.detail.location')}</Label>
                            <Input {...register('location')} className={`mt-1 ${inputClass}`} />
                        </div>
                        <div>
                            <Label className={labelClass}>{t('operations.table.batch.changeStatus')}</Label>
                            <Controller
                                name="status_name"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className={`mt-1 ${inputClass}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className={isDark ? 'bg-slate-700 border-slate-600' : ''}>
                                            <SelectItem value="Scheduled">{t('operations.table.status.planned')}</SelectItem>
                                            <SelectItem value="In Progress">{t('operations.table.status.inProgress')}</SelectItem>
                                            <SelectItem value="Completed">{t('operations.table.status.completed')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>

                    <div>
                        <Label className={labelClass}>{t('operations.board.detail.notes')}</Label>
                        <Input {...register('notes')} className={`mt-1 ${inputClass}`} />
                    </div>

                    <SelectField
                        name="fk_luc_procedure_id"
                        label="LUC procedure (Mission)"
                        options={lucProcedures}
                        placeholder="Select LUC procedure"
                    />

                    <div className={`rounded-lg border p-4 space-y-4 ${isDark ? 'border-slate-600 bg-slate-700/40' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex items-center gap-2">
                            <Controller
                                name="is_recurring"
                                control={control}
                                render={({ field }) => (
                                    <Checkbox
                                        id="is_recurring"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className="border-sky-500 data-[state=checked]:bg-sky-600"
                                    />
                                )}
                            />
                            <label htmlFor="is_recurring" className={`flex items-center gap-1.5 text-sm font-medium cursor-pointer ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                <RefreshCw className="w-3.5 h-3.5" />
                                {t('operations.calendar.calendarButtons.week')} (Weekly)
                            </label>
                        </div>

                        {isRecurring && (
                            <div className="space-y-4 pl-1">
                                <div>
                                    <Label className={labelClass}>{t('operations.calendar.calendarButtons.week')}</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {DAYS_OF_WEEK.map((day) => {
                                            const checked = daysOfWeek.includes(day.value)
                                            return (
                                                <button
                                                    key={day.value}
                                                    type="button"
                                                    onClick={() => {
                                                        const next = checked
                                                            ? daysOfWeek.filter((d) => d !== day.value)
                                                            : [...daysOfWeek, day.value]
                                                        setValue('days_of_week', next, { shouldValidate: true })
                                                    }}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                                                        checked
                                                            ? 'bg-sky-600 border-sky-600 text-white'
                                                            : isDark
                                                            ? 'bg-slate-600 border-slate-500 text-slate-300'
                                                            : 'bg-white border-slate-300 text-slate-600'
                                                    }`}
                                                >
                                                    {day.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {errors.days_of_week && <p className={errorClass}>{errors.days_of_week.message}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className={labelClass}>Repeat Until</Label>
                                        <Input type="date" {...register('recur_until')} className={`mt-1 ${inputClass}`} />
                                        {errors.recur_until && <p className={errorClass}>{errors.recur_until.message}</p>}
                                    </div>
                                    <div>
                                        <Label className={labelClass}>{t('operations.board.detail.missionGroup')}</Label>
                                        <Input {...register('mission_group_label')} className={`mt-1 ${inputClass}`} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={handleClose} className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>
                            {t('operations.table.filters.reset')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-500 text-white">
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('operations.table.batch.updating')}</>
                            ) : (
                                <><Plus className="w-4 h-4 mr-2" />{t('operations.table.newOperation')}</>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}