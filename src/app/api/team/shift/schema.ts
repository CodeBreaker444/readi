import z from 'zod'

const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d):([0-5]\d)$/
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const createShiftSchema = z.object({
  shift_date_start: z.string().regex(dateRegex, 'Start date must be in YYYY-MM-DD format'),
  shift_date_end: z.string().regex(dateRegex, 'End date must be in YYYY-MM-DD format'),
  shift_time_start: z.string().regex(timeRegex, 'Start time must be in HH:MM:SS format'),
  shift_time_end: z.string().regex(timeRegex, 'End time must be in HH:MM:SS format'),
  shift_category: z.enum(['ON_DUTY', 'OFF_DUTY', 'STANDBY', 'TRAINING'], 'Invalid shift category'),
  shift_desc: z.string().max(500, 'Description too long').optional().nullable(),
  shift_recurring: z.enum(['weekly', '']).optional().nullable(),
  days_of_week: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  shift_date_until: z.string().regex(dateRegex, 'Until date must be in YYYY-MM-DD format').optional().nullable(),
  shift_group_label: z.string().max(100, 'Group label too long').optional().nullable(),
})
