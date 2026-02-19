'use client'

import { createShiftSchema } from '@/app/api/team/shift/schema'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { CreateShiftInput } from '@/config/types/crewShift'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
interface AddShiftModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (count: number) => void
  isDark: boolean
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TIME_OPTIONS = Array.from({ length: 144 }, (_, i) => {
  const h = Math.floor(i / 6)
  const m = (i % 6) * 10
  if (h === 23 && m > 50) return null
  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return `${hh}:${mm}:00`
}).filter(Boolean) as string[]

const today = new Date().toISOString().split('T')[0]
const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  .toISOString()
  .split('T')[0]

export function AddShiftModal({ open, onClose, onSuccess, isDark }: AddShiftModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [addedShifts, setAddedShifts] = useState<number[]>([])

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateShiftInput>({
    resolver: zodResolver(createShiftSchema),
    defaultValues: {
      shift_date_start: today,
      shift_date_end: today,
      shift_time_start: '08:00:00',
      shift_time_end: '16:00:00',
      shift_date_until: endOfMonth,
      shift_category: 'ON_DUTY',
    },
  })

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }


const onSubmit = async (data: CreateShiftInput) => {
  setIsSubmitting(true)
  try {
    const payload = {
      ...data,
      shift_recurring: isRecurring ? 'weekly' : '', 
      days_of_week: isRecurring ? selectedDays : null,
      shift_date_until: isRecurring ? data.shift_date_until : null,
    }

    const res = await axios.post('/api/team/shift/create', payload)

    const result = res.data  

    if (!result.success) {
      toast.error(result.error ?? 'Something went wrong')
      return
    }

    setAddedShifts(result.newShiftIds)
    onSuccess(result.newShiftIds.length)
    setTimeout(() => handleClose(), 1500) 
  } catch (err: any) {
    const msg = err.response?.data?.error || 'Network error. Please try again.'
    toast.error(msg)
  } finally {
    setIsSubmitting(false)
  }
}

  const handleClose = () => {
    reset()
    setIsRecurring(false)
    setSelectedDays([])
    setAddedShifts([])
    onClose()
  }

  const inputClass = `${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400' : 'bg-white border-slate-300 text-slate-900'} focus:ring-2 focus:ring-blue-500`
  const labelClass = `text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`
  const errorClass = 'text-red-400 text-xs mt-1'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
      >
        <DialogHeader>
          <DialogTitle className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            New Pilot Shift
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={labelClass}>Start Date</Label>
              <Input
                type="date"
                {...register('shift_date_start')}
                className={`mt-1 ${inputClass}`}
              />
              {errors.shift_date_start && (
                <p className={errorClass}>{errors.shift_date_start.message}</p>
              )}
            </div>
            <div>
              <Label className={labelClass}>Start Time</Label>
              <Controller
                name="shift_time_start"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={`mt-1 ${inputClass}`}>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className={isDark ? 'bg-slate-700 border-slate-600' : ''}>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t} className={isDark ? 'text-white focus:bg-slate-600' : ''}>
                          {t.slice(0, 5)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.shift_time_start && (
                <p className={errorClass}>{errors.shift_time_start.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={labelClass}>End Date</Label>
              <Input
                type="date"
                {...register('shift_date_end')}
                className={`mt-1 ${inputClass}`}
              />
              {errors.shift_date_end && (
                <p className={errorClass}>{errors.shift_date_end.message}</p>
              )}
            </div>
            <div>
              <Label className={labelClass}>End Time</Label>
              <Controller
                name="shift_time_end"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={`mt-1 ${inputClass}`}>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className={isDark ? 'bg-slate-700 border-slate-600' : ''}>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t} className={isDark ? 'text-white focus:bg-slate-600' : ''}>
                          {t.slice(0, 5)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.shift_time_end && (
                <p className={errorClass}>{errors.shift_time_end.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={labelClass}>Shift Category</Label>
              <Controller
                name="shift_category"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={`mt-1 ${inputClass}`}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className={isDark ? 'bg-slate-700 border-slate-600' : ''}>
                      {(['ON_DUTY', 'STANDBY', 'OFF_DUTY', 'TRAINING'] as const).map((cat) => (
                        <SelectItem key={cat} value={cat} className={isDark ? 'text-white focus:bg-slate-600' : ''}>
                          {cat.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.shift_category && (
                <p className={errorClass}>{errors.shift_category.message}</p>
              )}
            </div>
            <div>
              <Label className={labelClass}>Description</Label>
              <Input
                {...register('shift_desc')}
                placeholder="Optional notes..."
                className={`mt-1 ${inputClass}`}
              />
            </div>
          </div>

          <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-3">
              <Switch
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
                id="recurring-toggle"
              />
              <Label htmlFor="recurring-toggle" className={`cursor-pointer ${labelClass}`}>
                Recurring Shift
              </Label>
            </div>

            {isRecurring && (
              <div className="mt-4 space-y-4">
                <div>
                  <Label className={labelClass}>Days of Week</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {DAYS.map((day, idx) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          selectedDays.includes(idx)
                            ? 'bg-blue-600 text-white shadow-sm'
                            : isDark
                            ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                            : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  {errors.days_of_week && (
                    <p className={errorClass}>{errors.days_of_week.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className={labelClass}>Until Date</Label>
                    <Input
                      type="date"
                      {...register('shift_date_until')}
                      className={`mt-1 ${inputClass}`}
                    />
                    {errors.shift_date_until && (
                      <p className={errorClass}>{errors.shift_date_until.message}</p>
                    )}
                  </div>
                  <div>
                    <Label className={labelClass}>Group Label</Label>
                    <Input
                      {...register('shift_group_label')}
                      placeholder="e.g. Week A"
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {addedShifts.length > 0 && (
            <div className="rounded-md bg-green-500/10 border border-green-500/30 px-4 py-3 text-green-400 text-sm space-y-1">
              {addedShifts.map((id) => (
                <p key={id}>✓ Added Shift #{id}</p>
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Shift
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}