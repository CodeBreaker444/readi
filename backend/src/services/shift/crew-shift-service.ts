import { prisma } from '@/lib/prisma';
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

function shiftRowToCreateInput(row: ShiftRow) {
    return {
        fk_owner_id: row.fk_owner_id,
        shift_date_start: new Date(row.shift_date_start),
        shift_date_end: new Date(row.shift_date_end),
        shift_time_start: new Date(`1970-01-01T${row.shift_time_start}Z`),
        shift_time_end: new Date(`1970-01-01T${row.shift_time_end}Z`),
        shift_category: row.shift_category,
        shift_desc: row.shift_desc,
        shift_recurring: row.shift_recurring,
        shift_date_until: row.shift_date_until ? new Date(row.shift_date_until) : null,
        shift_group_label: row.shift_group_label,
        recurring_group_id: row.recurring_group_id,
    };
}

function mapShiftRow(row: any): any {
    return {
        ...row,
        shift_date_start: row.shift_date_start?.toISOString().slice(0, 10) ?? '',
        shift_date_end: row.shift_date_end?.toISOString().slice(0, 10) ?? '',
        shift_time_start: row.shift_time_start?.toISOString().slice(11, 19) ?? '',
        shift_time_end: row.shift_time_end?.toISOString().slice(11, 19) ?? '',
        shift_date_until: row.shift_date_until?.toISOString().slice(0, 10) ?? null,
        pilot_name: row.users
            ? `${row.users.first_name ?? ''} ${row.users.last_name ?? ''}`.trim() || null
            : null,
        users: undefined,
    };
}

export const getShifts = async (ownerId: number): Promise<{ shifts: Shift[]; calendarEvents: CalendarEvent[] }> => {
    const data = await prisma.calendar_shift.findMany({
        where: { fk_owner_id: ownerId },
        include: {
            users: {
                select: { first_name: true, last_name: true },
            },
        },
        orderBy: { shift_date_start: 'asc' },
    });

    const shifts: Shift[] = data.map(mapShiftRow);

    const calendarEvents: CalendarEvent[] = shifts.map((shift) => ({
        id: String(shift.shift_id),
        title: buildEventTitle(shift),
        start: `${shift.shift_date_start}T${shift.shift_time_start}`,
        end: `${shift.shift_date_end}T${shift.shift_time_end}`,
        color: CATEGORY_COLORS[shift.shift_category],
        category: shift.shift_category,
        shift,
    }));

    return { shifts, calendarEvents };
}

export const createShift = async (input: CreateShiftInput, ownerId: number): Promise<number[]> => {
    const isRecurring = input.shift_recurring === 'weekly';
    const recurringGroupId = isRecurring ? uuidv4() : null;

    const shiftsToInsert: ShiftRow[] = isRecurring
        ? buildRecurringShifts(input, recurringGroupId!, ownerId)
        : [buildSingleShift(input, ownerId)];

    if (shiftsToInsert.length === 0) {
        throw new Error('No valid shifts to insert');
    }

    const created = await prisma.$transaction(
        shiftsToInsert.map((row) =>
            prisma.calendar_shift.create({
                data: shiftRowToCreateInput(row),
                select: { shift_id: true },
            })
        )
    );

    return created.map((r) => r.shift_id);
}

export const deleteShift = async (shiftId: number, ownerId: number): Promise<void> => {
    await prisma.calendar_shift.deleteMany({
        where: { shift_id: shiftId, fk_owner_id: ownerId },
    });
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