'use client'

import { useTimezone } from '@/components/TimezoneProvider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { nowAsLocalInput } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Loader2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { toastWithDcc } from '@/lib/dcc-toast'
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
}

type OptionItem = {
    id: number;
    label: string;
    in_maintenance?: boolean;
    has_drone_component?: boolean;
    is_non_operational?: boolean;
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
    fk_luc_procedure_id: z.number().int().positive('Procedure is required'),
    location: z.string().optional(),
    notes: z.string().optional(),
    status_name: z.string().min(1),
})

export function AddOperationModal({ open, onClose, onSuccess, isDark }: AddOperationModalProps) {
    const { t } = useTranslation()
    const { timezone } = useTimezone()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [pilots, setPilots] = useState<OptionItem[]>([])
    const [tools, setTools] = useState<OptionItem[]>([])
    const [missionTypes, setMissionTypes] = useState<OptionItem[]>([])
    const [missionCategories, setMissionCategories] = useState<OptionItem[]>([])
    const [lucProcedures, setLucProcedures] = useState<OptionItem[]>([])
    const [addedIds, setAddedIds] = useState<number[]>([])

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(createOperationCalendarSchema) as any,
        defaultValues: {
            scheduled_start: nowAsLocalInput(timezone),
            scheduled_end: nowAsLocalInput(timezone, 1),
            status_name: 'Scheduled',
            fk_pilot_user_id: undefined,
            fk_tool_id: null,
            fk_mission_type_id: null,
            fk_mission_category_id: null,
            fk_planning_id: null,
        },
    })

    useEffect(() => {
        if (!open) return
        setValue('scheduled_start', nowAsLocalInput(timezone))
        setValue('scheduled_end', nowAsLocalInput(timezone, 1))
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
                    is_non_operational: t.is_non_operational ?? false,
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
            
            toast.success(t('operations.table.toast.statusSuccess', { count: 1, status: t('operations.table.status.planned') }))

            setAddedIds([result.operationId])
            onSuccess()
            setTimeout(() => handleClose(), 1500)
        } catch (err: any) {
            const data = err.response?.data
            toastWithDcc(
                { title: data?.error || t('operations.board.toast.statusUpdateFailed'), variant: 'error' },
                data?.dcc,
            )
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
                            if (selected?.is_non_operational) {
                                toast.error(`System "${selected.label}" is not operational due to an expired component and cannot be used for missions.`)
                                return
                            }
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
                                    disabled={!!o.is_non_operational || !!o.in_maintenance || o.has_drone_component === false}
                                    className={isDark ? 'text-white focus:bg-slate-600' : ''}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className={o.has_drone_component === false ? 'opacity-40' : ''}>{o.label}</span>
                                        {o.is_non_operational && (
                                            <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 leading-none">
                                                Not Operational
                                            </span>
                                        )}
                                        {!o.is_non_operational && o.in_maintenance && (
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
                        label="Procedure (Mission)"
                        options={lucProcedures}
                        placeholder="Select Procedure"
                    />

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