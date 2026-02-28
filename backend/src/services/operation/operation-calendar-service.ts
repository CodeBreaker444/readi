
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
  const { data, error } = await supabase
    .from('pilot_mission')
    .insert({
      fk_owner_id: ownerId,
      mission_name: input.mission_name,
      scheduled_start: input.scheduled_start,
      actual_end: input.scheduled_end,       
      status_name: input.status_name ?? 'Scheduled',
      fk_pilot_user_id: input.fk_pilot_user_id,
      fk_tool_id: input.fk_tool_id ?? null,
      fk_mission_type_id: input.fk_mission_type_id ?? null,
      fk_mission_category_id: input.fk_mission_category_id ?? null,
      fk_planning_id: input.fk_planning_id ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
    })
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