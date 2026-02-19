export type CreateShiftInput = {
  shift_date_start: string
  shift_date_end: string
  shift_time_start: string
  shift_time_end: string
  shift_category: 'ON_DUTY' | 'OFF_DUTY' | 'STANDBY' | 'TRAINING'
  shift_desc?: string | null
  shift_recurring?: 'weekly' | '' | null
  days_of_week?: number[] | null
  shift_date_until?: string | null
  shift_group_label?: string | null
}
export type ShiftCategory = 'ON_DUTY' | 'OFF_DUTY' | 'STANDBY' | 'TRAINING'

export interface Shift {
  shift_id: number
  fk_owner_id: number
  fk_pic_id: number | null
  shift_date_start: string
  shift_date_end: string
  shift_time_start: string
  shift_time_end: string
  shift_recurring: string | null
  shift_date_until: string | null
  shift_desc: string | null
  shift_group_label: string | null
  shift_category: ShiftCategory
  recurring_group_id: string | null
  created_at: string
  updated_at: string
  pilot_name?: string
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  color: string
  category: ShiftCategory
  shift: Shift
}

export interface CreateShiftResponse {
  success: boolean
  newShiftIds: number[]
  message: string
}

export interface DeleteShiftResponse {
  success: boolean
  message: string
}
 