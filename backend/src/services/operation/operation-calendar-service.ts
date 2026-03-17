
import { supabase } from '@/backend/database/database';
import {
    CreateOperationCalendarInput,
    OperationCalendarEvent,
    OperationCalenderStatus,
    OperationItem
} from '@/config/types/operation';

const STATUS_COLORS: Record<string, string> = {
  Scheduled: '#0284c7',
  'In Progress': '#d97706',
  Completed: '#16a34a',
  Cancelled: '#dc2626',
}


export const getOperationCalendarEvents = async (
  ownerId: number
): Promise<{ operations: OperationItem[]; calendarEvents: OperationCalendarEvent[] }> => {
  const { data, error } = await supabase
    .from('pilot_mission')
    .select(`
      pilot_mission_id,
      mission_name,
      mission_code,
      scheduled_start,
      actual_start,
      actual_end,
      status_name,
      location,
      notes,
      fk_pilot_user_id,
      fk_tool_id,
      fk_mission_type_id,
      fk_mission_category_id,
      fk_planning_id,
      fk_owner_id,
      users!pilot_mission_fk_pilot_user_id_fkey(first_name, last_name),
      tool!pilot_mission_fk_tool_id_fkey(tool_code)
    `)
    .eq('fk_owner_id', ownerId)
    .not('scheduled_start', 'is', null)
    .order('scheduled_start', { ascending: true })

  if (error) throw new Error(`Failed to fetch operations: ${error.message}`)

  const operations: OperationItem[] = (data || []).map((row: any) => ({
    ...row,
    pilot_name: row.users
      ? `${row.users.first_name} ${row.users.last_name}`.trim()
      : null,
    vehicle_code: row.tool?.tool_code ?? null,
    // scheduled_end derived from actual_end or +1h estimate
    scheduled_end: row.actual_end ?? null,
  }))

  const calendarEvents: OperationCalendarEvent[] = operations.map((op) => ({
    id: String(op.pilot_mission_id),
    title: buildOperationTitle(op),
    start: op.scheduled_start!,
    end: op.scheduled_end ?? deriveEnd(op.scheduled_start!),
    color: STATUS_COLORS[op.status_name ?? 'Scheduled'] ?? STATUS_COLORS['Scheduled'],
    status: (op.status_name as OperationCalenderStatus) ?? null,
    operation: op,
  }))

  return { operations, calendarEvents }
}


export const createOperationCalendarEntry = async (
  input: CreateOperationCalendarInput,
  ownerId: number
): Promise<number> => {
  const base = {
    fk_owner_id: ownerId,
    mission_name: input.mission_name,
    status_name: input.status_name ?? 'Scheduled',
    fk_pilot_user_id: input.fk_pilot_user_id,
    fk_tool_id: input.fk_tool_id ?? null,
    fk_mission_type_id: input.fk_mission_type_id ?? null,
    fk_mission_category_id: input.fk_mission_category_id ?? null,
    fk_planning_id: input.fk_planning_id ?? null,
    location: input.location ?? null,
    notes: input.notes ?? null,
  }

  // ── Recurring (weekly) ──────────────────────────────────────────────────────
  if (
    input.is_recurring &&
    input.days_of_week &&
    input.days_of_week.length > 0 &&
    input.recur_until
  ) {
    const recurringGroupId = crypto.randomUUID()
    const startDt = new Date(input.scheduled_start)
    const endDt = new Date(input.scheduled_end)
    const durationMs = endDt.getTime() - startDt.getTime()
    const untilDate = new Date(input.recur_until + 'T23:59:59')
    const daysSet = new Set(input.days_of_week)

    const rows: object[] = []
    const cursor = new Date(startDt)
    cursor.setHours(0, 0, 0, 0)
    let iterations = 0

    while (cursor <= untilDate && iterations < 1000) {
      iterations++
      if (daysSet.has(cursor.getDay())) {
        const instanceStart = new Date(cursor)
        instanceStart.setHours(startDt.getHours(), startDt.getMinutes(), 0, 0)
        const instanceEnd = new Date(instanceStart.getTime() + durationMs)

        rows.push({
          ...base,
          scheduled_start: instanceStart.toISOString(),
          actual_end: instanceEnd.toISOString(),
          recurring_group_id: recurringGroupId,
          mission_date_until: input.recur_until,
          mission_group_label: input.mission_group_label ?? null,
        })
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    if (rows.length === 0) throw new Error('No matching days found in the recurrence range')

    const { data, error } = await supabase
      .from('pilot_mission')
      .insert(rows)
      .select('pilot_mission_id')

    if (error) throw new Error(`Failed to create recurring operations: ${error.message}`)
    return data[0].pilot_mission_id
  }

  // ── Single entry ────────────────────────────────────────────────────────────
  const { data, error } = await supabase
    .from('pilot_mission')
    .insert({ ...base, scheduled_start: input.scheduled_start, actual_end: input.scheduled_end })
    .select('pilot_mission_id')
    .single()

  if (error) throw new Error(`Failed to create operation: ${error.message}`)
  return data.pilot_mission_id
}


export const deleteOperationCalendarEntry = async (
  operationId: number,
  ownerId: number
): Promise<void> => {
  const { error } = await supabase
    .from('pilot_mission')
    .delete()
    .eq('pilot_mission_id', operationId)
    .eq('fk_owner_id', ownerId)

  if (error) throw new Error(`Failed to delete operation: ${error.message}`)
}

 

const buildOperationTitle = (op: OperationItem): string => {
  const parts: string[] = []
  if (op.mission_name) parts.push(op.mission_name)
  if (op.pilot_name) parts.push(`— ${op.pilot_name}`)
  if (op.vehicle_code) parts.push(`(${op.vehicle_code})`)
  return parts.join(' ') || 'Unnamed Operation'
}

const deriveEnd = (start: string): string => {
  const d = new Date(start)
  d.setHours(d.getHours() + 1)
  return d.toISOString()
}