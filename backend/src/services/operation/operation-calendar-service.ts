import { supabase } from '@/backend/database/database';
import { seedLucProcedureProgressFromSteps } from '@/backend/services/operation/luc-procedure-progress';
import { assertToolNotInMaintenance } from '@/backend/services/system/maintenance-ticket';
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

const STATUS_NAME_TO_ID: Record<string, number> = {
  Scheduled: 1,
  'In Progress': 2,
  Completed: 3,
  Cancelled: 4,
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
      recurring_group_id,
      mission_group_label,
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
  if (input.fk_tool_id) {
    await assertToolNotInMaintenance(input.fk_tool_id);
  }

  const statusName = input.status_name ?? 'Scheduled';

  if (!input.fk_luc_procedure_id) {
    throw new Error('LUC procedure is required');
  }

  let stepsSource: unknown = input.luc_procedure_steps;
  if (!stepsSource) {
    const { data: procRow, error: procErr } = await supabase
      .from('luc_procedure')
      .select('procedure_steps')
      .eq('procedure_id', input.fk_luc_procedure_id)
      .eq('fk_owner_id', ownerId)
      .eq('procedure_status', 'MISSION')
      .eq('procedure_active', 'Y')
      .maybeSingle();
    if (procErr) throw new Error(`LUC procedure lookup failed: ${procErr.message}`);
    if (!procRow) throw new Error('LUC procedure not found or not available for missions');
    stepsSource = procRow.procedure_steps;
  }

  const luc_procedure_progress =
    seedLucProcedureProgressFromSteps(stepsSource) ?? {
      checklist: {},
      communication: {},
      assignment: {},
    };

  const base = {
    fk_owner_id: ownerId,
    mission_name: input.mission_name,
    status_name: statusName,
    fk_mission_status_id: STATUS_NAME_TO_ID[statusName] ?? 1,
    fk_pilot_user_id: input.fk_pilot_user_id,
    fk_tool_id: input.fk_tool_id ?? null,
    fk_mission_type_id: input.fk_mission_type_id ?? null,
    fk_mission_category_id: input.fk_mission_category_id ?? null,
    fk_planning_id: input.fk_planning_id ?? null,
    fk_luc_procedure_id: input.fk_luc_procedure_id,
    luc_procedure_progress,
    location: input.location ?? null,
    notes: input.notes ?? null,
  }

  if (
    input.is_recurring &&
    input.days_of_week &&
    input.days_of_week.length > 0 &&
    input.recur_until
  ) {
    const recurringGroupId = crypto.randomUUID()

    const startMatch = input.scheduled_start.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
    if (!startMatch) throw new Error('Invalid scheduled start format. Expected YYYY-MM-DDTHH:mm')

    const [, sYear, sMonth, sDay, sHour, sMin] = startMatch.map(Number)

    const endMatch = input.scheduled_end.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
    if (!endMatch) throw new Error('Invalid scheduled end format. Expected YYYY-MM-DDTHH:mm')

    const [, eYear, eMonth, eDay, eHour, eMin] = endMatch.map(Number)

    const startMs = Date.UTC(sYear, sMonth - 1, sDay, sHour, sMin, 0)
    const endMs = Date.UTC(eYear, eMonth - 1, eDay, eHour, eMin, 0)
    if (isNaN(startMs)) throw new Error('Invalid scheduled start date')
    if (isNaN(endMs)) throw new Error('Invalid scheduled end date')
    const durationMs = Math.max(endMs - startMs, 0)

    const untilMatch = input.recur_until.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!untilMatch) throw new Error('Invalid recur_until format. Expected YYYY-MM-DD')

    const [, uYear, uMonth, uDay] = untilMatch.map(Number)
    const untilDate = new Date(Date.UTC(uYear, uMonth - 1, uDay, 23, 59, 59))

    let cursorDate = new Date(Date.UTC(sYear, sMonth - 1, sDay))

    if (cursorDate > untilDate) {
      throw new Error('Recurrence end date must be on or after the start date')
    }

    const daysSet = new Set(input.days_of_week.map((d: any) => Number(d)))

    const rows: object[] = []
    let instanceIndex = 0
    let iterations = 0

    while (cursorDate <= untilDate && iterations < 1000) {
      iterations++
      const dayOfWeek = cursorDate.getUTCDay()  

      if (daysSet.has(dayOfWeek)) {
        instanceIndex++

        const y = cursorDate.getUTCFullYear()
        const m = cursorDate.getUTCMonth()     
        const d = cursorDate.getUTCDate()

        const instanceStart = new Date(Date.UTC(y, m, d, sHour, sMin, 0, 0))
        const instanceEnd = new Date(instanceStart.getTime() + durationMs)

        const dateTag = `${y}${String(m + 1).padStart(2, '0')}${String(d).padStart(2, '0')}`
        const instanceCode = input.mission_code
          ? `${input.mission_code}-${dateTag}-${instanceIndex}`
          : null

        rows.push({
          ...base,
          mission_code: instanceCode,
          scheduled_start: instanceStart.toISOString(),
          actual_end: instanceEnd.toISOString(),
          recurring_group_id: recurringGroupId,
          mission_date_until: input.recur_until,
          mission_group_label: input.mission_group_label ?? null,
        })
      }

      cursorDate = new Date(Date.UTC(
        cursorDate.getUTCFullYear(),
        cursorDate.getUTCMonth(),
        cursorDate.getUTCDate() + 1
      ))
    }

    if (rows.length === 0) throw new Error('No matching days found in the recurrence range')

    const { data, error } = await supabase
      .from('pilot_mission')
      .insert(rows)
      .select('pilot_mission_id')

    if (error) throw new Error(`Failed to create recurring operations: ${error.message}`)
    return data[0].pilot_mission_id
  }

  const { data, error } = await supabase
    .from('pilot_mission')
    .insert({
      ...base,
      mission_code: input.mission_code ?? null,
      scheduled_start: input.scheduled_start,
      actual_end: input.scheduled_end,
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