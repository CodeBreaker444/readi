import { supabase } from '@/backend/database/database';
import { CalendarEvent, CreateShiftInput, Shift, ShiftCategory } from '@/config/types/crewShift';
import { v4 as uuidv4 } from 'uuid';

const CATEGORY_COLORS: Record<ShiftCategory, string> = {
    STANDBY: '#1976d2',
    ON_DUTY: '#2e7d32',
    OFF_DUTY: '#ef6c00',
    TRAINING: '#6a1b9a',
}

type ShiftRow = {
    fk_owner_id: number
    shift_date_start: string
    shift_date_end: string
    shift_time_start: string
    shift_time_end: string
    shift_category: ShiftCategory
    shift_desc: string | null
    shift_recurring: string | null
    shift_date_until: string | null
    shift_group_label: string | null
    recurring_group_id: string | null
}

export const getShifts = async (ownerId: number): Promise<{ shifts: Shift[]; calendarEvents: CalendarEvent[] }> => {
    const { data, error } = await supabase
        .from('calendar_shift')
        .select(`
        *,
        users:fk_pic_id (
          first_name,
          last_name
        )
      `)
        .eq('fk_owner_id', ownerId)
        .order('shift_date_start', { ascending: true })

    if (error) {
        throw new Error(`Failed to fetch shifts: ${error.message}`)
    }

    const shifts: Shift[] = (data || []).map((row: any) => ({
        ...row,
        pilot_name: row.users
            ? `${row.users.first_name} ${row.users.last_name}`.trim()
            : null,
    }))

    const calendarEvents: CalendarEvent[] = shifts.map((shift) => ({
        id: String(shift.shift_id),
        title: buildEventTitle(shift),
        start: `${shift.shift_date_start}T${shift.shift_time_start}`,
        end: `${shift.shift_date_end}T${shift.shift_time_end}`,
        color: CATEGORY_COLORS[shift.shift_category],
        category: shift.shift_category,
        shift,
    }))

    return { shifts, calendarEvents }
}

export const createShift = async (input: CreateShiftInput, ownerId: number): Promise<number[]> => {
    const isRecurring = input.shift_recurring === 'weekly'
    const recurringGroupId = isRecurring ? uuidv4() : null

    const shiftsToInsert: ShiftRow[] = isRecurring
        ? buildRecurringShifts(input, recurringGroupId!, ownerId)
        : [buildSingleShift(input, ownerId)]

    if (shiftsToInsert.length === 0) {
        throw new Error('No valid shifts to insert')
    }

    const { data, error } = await supabase
        .from('calendar_shift')
        .insert(shiftsToInsert)
        .select('shift_id')

    if (error) {
        throw new Error(`Failed to create shift: ${error.message}`)
    }

    return (data || []).map((row: any) => row.shift_id)
}

export const deleteShift = async (shiftId: number, ownerId: number): Promise<void> => {
    const { error } = await supabase
        .from('calendar_shift')
        .delete()
        .eq('shift_id', shiftId)
        .eq('fk_owner_id', ownerId)

    if (error) {
        throw new Error(`Failed to delete shift: ${error.message}`)
    }
}

export const buildEventTitle = (shift: Shift): string => {
    const parts = [shift.shift_category.replace('_', ' ')]
    if (shift.pilot_name) parts.push(`— ${shift.pilot_name}`)
    if (shift.shift_desc) parts.push(`(${shift.shift_desc})`)
    return parts.join(' ')
}

export const buildSingleShift = (input: CreateShiftInput, ownerId: number): ShiftRow => {
    return {
        fk_owner_id: ownerId,
        shift_date_start: input.shift_date_start,
        shift_date_end: input.shift_date_end,
        shift_time_start: input.shift_time_start,
        shift_time_end: input.shift_time_end,
        shift_category: input.shift_category,
        shift_desc: input.shift_desc ?? null,
        shift_recurring: null,
        shift_date_until: null,
        shift_group_label: input.shift_group_label ?? null,
        recurring_group_id: null,
    }
}

export const buildRecurringShifts = (input: CreateShiftInput, groupId: string, ownerId: number): ShiftRow[] => {
    const daysOfWeek = input.days_of_week ?? []
    const until = new Date(input.shift_date_until!)
    const results: ShiftRow[] = []

    let cursor = new Date(input.shift_date_start)
    cursor.setHours(0, 0, 0, 0)
    until.setHours(23, 59, 59, 999)

    while (cursor <= until) {
        const dayOfWeek = cursor.getDay()
        if (daysOfWeek.includes(dayOfWeek)) {
            const dateStr = cursor.toISOString().split('T')[0]
            results.push({
                fk_owner_id: ownerId,
                shift_date_start: dateStr,
                shift_date_end: dateStr,
                shift_time_start: input.shift_time_start,
                shift_time_end: input.shift_time_end,
                shift_category: input.shift_category,
                shift_desc: input.shift_desc ?? null,
                shift_recurring: 'weekly',
                shift_date_until: input.shift_date_until ?? null,
                shift_group_label: input.shift_group_label ?? null,
                recurring_group_id: groupId,
            })
        }
        cursor.setDate(cursor.getDate() + 1)
    }

    return results
}