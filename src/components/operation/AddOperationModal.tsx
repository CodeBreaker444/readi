'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Loader2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
    location?: string
    notes?: string
    status_name: string
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
    location: z.string().optional(),
    notes: z.string().optional(),
    status_name: z.string().min(1),
})

type OptionItem = { id: number; label: string }

const now = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const defaultStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`
const defaultEnd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours() + 1)}:00`

export function AddOperationModal({ open, onClose, onSuccess, isDark }: AddOperationModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [pilots, setPilots] = useState<OptionItem[]>([])
    const [tools, setTools] = useState<OptionItem[]>([])
    const [missionTypes, setMissionTypes] = useState<OptionItem[]>([])
    const [missionCategories, setMissionCategories] = useState<OptionItem[]>([])
    const [addedIds, setAddedIds] = useState<number[]>([])

    const {
        register,
        handleSubmit,
        control,
        reset,
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
        },
    })

    useEffect(() => {
        if (!open) return
        const fetchOptions = async () => {
            try {
                const res = await axios.get('/api/operation/options')
                const d = res.data

                setPilots(
                    (d.pilots ?? []).map((p: any) => ({
                        id: p.user_id,
                        label: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
                    }))
                )
                setTools(
                    (d.tools ?? []).map((t: any) => ({
                        id: t.tool_id,
                        label: `${t.tool_code} — ${t.tool_name}`,
                    }))
                )
                setMissionTypes(
                    (d.types ?? []).map((t: any) => ({
                        id: t.mission_type_id,
                        label: t.type_name,
                    }))
                )
                setMissionCategories(
                    (d.categories ?? []).map((c: any) => ({
                        id: c.category_id,
                        label: c.category_name,
                    }))
                )
            } catch {
                toast.error('Failed to load options')
            }
        }
        fetchOptions()
    }, [open])

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true)
        try {
            const res = await axios.post('/api/operation/calendar/create', data)
            const result = res.data
            if (!result.success) {
                toast.error(result.error ?? 'Something went wrong')
                return
            }
            setAddedIds([result.operationId])
            onSuccess()
            setTimeout(() => handleClose(), 1500)
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Network error. Please try again.')
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

    type NumberFieldName = 'fk_pilot_user_id' | 'fk_tool_id' | 'fk_mission_type_id' | 'fk_mission_category_id' | 'fk_planning_id'

    const SelectField = ({
        name,
        label,
        options,
        placeholder,
    }: {
        name: NumberFieldName
        label: string
        options: OptionItem[]
        placeholder: string
    }) => (
        <div>
            <Label className={labelClass}>{label}</Label>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <Select
                        onValueChange={(v) => field.onChange(Number(v))}
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
                                    className={isDark ? 'text-white focus:bg-slate-600' : ''}
                                >
                                    {o.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />
            {errors[name] && (
                <p className={errorClass}>{String((errors[name] as any)?.message ?? '')}</p>
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
                        New Operation
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
                    <div>
                        <Label className={labelClass}>Mission Name</Label>
                        <Input
                            {...register('mission_name')}
                            placeholder="Enter mission name..."
                            className={`mt-1 ${inputClass}`}
                        />
                        {errors.mission_name && <p className={errorClass}>{errors.mission_name.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className={labelClass}>Scheduled Start</Label>
                            <Input type="datetime-local" {...register('scheduled_start')} className={`mt-1 ${inputClass}`} />
                            {errors.scheduled_start && <p className={errorClass}>{errors.scheduled_start.message}</p>}
                        </div>
                        <div>
                            <Label className={labelClass}>Scheduled End</Label>
                            <Input type="datetime-local" {...register('scheduled_end')} className={`mt-1 ${inputClass}`} />
                            {errors.scheduled_end && <p className={errorClass}>{errors.scheduled_end.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <SelectField name="fk_pilot_user_id" label="Pilot (PIC)" options={pilots} placeholder="Select pilot" />
                        <SelectField name="fk_tool_id" label="Vehicle / Tool" options={tools} placeholder="Select vehicle" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <SelectField name="fk_mission_type_id" label="Mission Type" options={missionTypes} placeholder="Select type" />
                        <SelectField name="fk_mission_category_id" label="Mission Category" options={missionCategories} placeholder="Select category" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className={labelClass}>Location</Label>
                            <Input {...register('location')} placeholder="e.g. Field A, Zone 3..." className={`mt-1 ${inputClass}`} />
                        </div>
                        <div>
                            <Label className={labelClass}>Status</Label>
                            <Controller
                                name="status_name"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className={`mt-1 ${inputClass}`}>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent className={isDark ? 'bg-slate-700 border-slate-600' : ''}>
                                            {(['Scheduled', 'In Progress', 'Completed', 'Cancelled'] as const).map((s) => (
                                                <SelectItem key={s} value={s} className={isDark ? 'text-white focus:bg-slate-600' : ''}>
                                                    {s}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>

                    <div>
                        <Label className={labelClass}>Notes</Label>
                        <Input {...register('notes')} placeholder="Optional notes..." className={`mt-1 ${inputClass}`} />
                    </div>

                    {addedIds.length > 0 && (
                        <div className="rounded-md bg-green-500/10 border border-green-500/30 px-4 py-3 text-green-400 text-sm space-y-1">
                            {addedIds.map((id) => (
                                <p key={id}>✓ Operation #{id} added successfully</p>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}
                        >
                            Close
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-violet-600 hover:bg-violet-500 cursor-pointer text-white"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
                            ) : (
                                <><Plus className="w-4 h-4 mr-2" />Add Operation</>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}