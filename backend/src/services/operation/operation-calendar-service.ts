import { supabase } from '@/backend/database/database';
import { seedLucProcedureProgressFromSteps } from '@/backend/services/operation/luc-procedure-progress';
import { assertToolNotInMaintenance, assertToolNotNonOperational } from '@/backend/services/system/maintenance-ticket';
import {
    CreateOperationCalendarInput,
    OperationCalendarEvent,
    OperationCalenderStatus,
    OperationItem
} from '@/config/types/operation';
import { prisma } from '@/lib/prisma';

const STATUS_COLORS: Record<string, string> = {
  Scheduled: '#0284c7',
  'In Progress': '#d97706',
  Completed: '#16a34a',
  Cancelled: '#dc2626',
};

const STATUS_NAME_TO_ID: Record<string, number> = {
  Scheduled: 1,
  'In Progress': 2,
  Completed: 3,
  Cancelled: 4,
};

export const getOperationCalendarEvents = async (
  ownerId: number
): Promise<{ operations: OperationItem[]; calendarEvents: OperationCalendarEvent[] }> => {
  const data = await prisma.pilot_mission.findMany({
    where: {
      fk_owner_id: ownerId,
      scheduled_start: { not: null },
    },
    orderBy: { scheduled_start: 'asc' },
    select: {
      pilot_mission_id: true,
      mission_name: true,
      mission_code: true,
      scheduled_start: true,
      actual_start: true,
      actual_end: true,
      status_name: true,
      location: true,
      notes: true,
      fk_pilot_user_id: true,
      fk_tool_id: true,
      fk_mission_type_id: true,
      fk_mission_category_id: true,
      fk_planning_id: true,
      fk_mission_planning_id: true,
      fk_owner_id: true,
      recurring_group_id: true,
      mission_group_label: true,
      users: { select: { first_name: true, last_name: true } },
      tool: { select: { tool_code: true } },
    },
  });

  const operations: OperationItem[] = data.map((row) => ({
    ...(row as any),
    pilot_name: row.users
      ? `${row.users.first_name} ${row.users.last_name}`.trim()
      : null,
    vehicle_code: row.tool?.tool_code ?? null,
    scheduled_end: row.actual_end?.toISOString() ?? null,
  }));

  const toolIds = [...new Set(operations.filter(op => op.fk_tool_id).map(op => op.fk_tool_id as number))];
  const nonOpSet = new Set<number>();
  if (toolIds.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const { data: expiredComps } = await supabase
      .from('tool_component')
      .select('fk_tool_id')
      .in('fk_tool_id', toolIds)
      .eq('component_active', 'Y')
      .lte('expiration_date', today)
      .not('expiration_date', 'is', null);
    (expiredComps ?? []).forEach((c: any) => nonOpSet.add(c.fk_tool_id));
  }

  const calendarEvents: OperationCalendarEvent[] = operations.map((op) => {
    const isNonOp = !!op.fk_tool_id && nonOpSet.has(op.fk_tool_id as number);
    return {
      id: String(op.pilot_mission_id),
      title: buildOperationTitle(op),
      start: op.scheduled_start!,
      end: op.scheduled_end ?? deriveEnd(op.scheduled_start!),
      color: STATUS_COLORS[op.status_name ?? 'Scheduled'] ?? STATUS_COLORS['Scheduled'],
      status: (op.status_name as OperationCalenderStatus) ?? null,
      operation: { ...op, tool_status: isNonOp ? 'NOT_OPERATIONAL' : null },
      tool_status: isNonOp ? 'NOT_OPERATIONAL' : null,
    };
  })

  return { operations, calendarEvents };
};


export interface MissionCreationResult {
  firstMissionId: number;
  missions: Array<{
    pilotMissionId: number;
    dccMissionId: string;
    startDateTime: string;
  }>;
}

export const createOperationCalendarEntry = async (
  input: CreateOperationCalendarInput,
  ownerId: number
): Promise<MissionCreationResult> => {
  if (input.fk_tool_id) {
    await assertToolNotNonOperational(input.fk_tool_id);
    await assertToolNotInMaintenance(input.fk_tool_id);
  }

  const statusName = input.status_name ?? 'Scheduled';

  if (!input.fk_luc_procedure_id) {
    throw new Error('procedure is required');
  }

  let stepsSource: unknown = input.luc_procedure_steps;
  if (!stepsSource) {
    const procRow = await prisma.luc_procedure.findFirst({
      where: {
        procedure_id: input.fk_luc_procedure_id,
        fk_owner_id: ownerId,
        procedure_status: 'MISSION',
        procedure_active: 'Y',
      },
      select: { procedure_steps: true },
    });
    if (!procRow) throw new Error('procedure not found or not available for missions');
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
    fk_client_id: input.fk_client_id ?? null,
    fk_mission_type_id: input.fk_mission_type_id ?? null,
    fk_mission_category_id: input.fk_mission_category_id ?? null,
    fk_planning_id: input.fk_planning_id ?? null,
    fk_luc_procedure_id: input.fk_luc_procedure_id,
    luc_procedure_progress: luc_procedure_progress as any,
    location: input.location ?? null,
    notes: input.notes ?? null,
  };

  if (
    input.is_recurring &&
    input.days_of_week &&
    input.days_of_week.length > 0 &&
    input.recur_until
  ) {
    const recurringGroupId = crypto.randomUUID();
    const startMatch = input.scheduled_start.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!startMatch) throw new Error('Invalid scheduled start format. Expected YYYY-MM-DDTHH:mm');
    const [, sYear, sMonth, sDay, sHour, sMin] = startMatch.map(Number);

    const endMatch = input.scheduled_end.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!endMatch) throw new Error('Invalid scheduled end format. Expected YYYY-MM-DDTHH:mm');
    const [, eYear, eMonth, eDay, eHour, eMin] = endMatch.map(Number);

    const startMs = Date.UTC(sYear, sMonth - 1, sDay, sHour, sMin, 0);
    const endMs = Date.UTC(eYear, eMonth - 1, eDay, eHour, eMin, 0);
    if (isNaN(startMs)) throw new Error('Invalid scheduled start date');
    if (isNaN(endMs)) throw new Error('Invalid scheduled end date');
    const durationMs = Math.max(endMs - startMs, 0);

    const untilMatch = input.recur_until.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!untilMatch) throw new Error('Invalid recur_until format. Expected YYYY-MM-DD');
    const [, uYear, uMonth, uDay] = untilMatch.map(Number);
    const untilDate = new Date(Date.UTC(uYear, uMonth - 1, uDay, 23, 59, 59));
    let cursorDate = new Date(Date.UTC(sYear, sMonth - 1, sDay));
    if (cursorDate > untilDate) throw new Error('Recurrence end date must be on or after the start date');

    const daysSet = new Set(input.days_of_week.map((d: any) => Number(d)));
    const rows: any[] = [];
    const rowMeta: Array<{ dccMissionId: string; startDateTime: string }> = [];
    let instanceIndex = 0;
    let iterations = 0;

    while (cursorDate <= untilDate && iterations < 1000) {
      iterations++;
      if (daysSet.has(cursorDate.getUTCDay())) {
        instanceIndex++;
        const y = cursorDate.getUTCFullYear();
        const m = cursorDate.getUTCMonth();
        const d = cursorDate.getUTCDate();
        const instanceStart = new Date(Date.UTC(y, m, d, sHour, sMin, 0, 0));
        const dateTag = `${y}${String(m + 1).padStart(2, '0')}${String(d).padStart(2, '0')}`;
        const dccMissionId = input.mission_code
          ? `${input.mission_code}-${dateTag}-${instanceIndex}`
          : crypto.randomUUID();

        rows.push({
          ...base,
          mission_code: dccMissionId,
          scheduled_start: instanceStart,
          actual_end: new Date(instanceStart.getTime() + durationMs),
          recurring_group_id: recurringGroupId,
          mission_date_until: new Date(input.recur_until),
          mission_group_label: input.mission_group_label ?? null,
        });
        rowMeta.push({ dccMissionId, startDateTime: instanceStart.toISOString() });
      }
      cursorDate = new Date(Date.UTC(
        cursorDate.getUTCFullYear(), cursorDate.getUTCMonth(), cursorDate.getUTCDate() + 1
      ));
    }

    if (rows.length === 0) throw new Error('No matching days found in the recurrence range');

    await prisma.pilot_mission.createMany({ data: rows });

    const created = await prisma.pilot_mission.findMany({
      where: { mission_code: { in: rowMeta.map(r => r.dccMissionId) }, fk_owner_id: ownerId },
      orderBy: { scheduled_start: 'asc' },
      select: { pilot_mission_id: true, scheduled_start: true, mission_code: true },
    });

    return {
      firstMissionId: created[0].pilot_mission_id,
      missions: created.map((row, i) => ({
        pilotMissionId: row.pilot_mission_id,
        dccMissionId: rowMeta[i]?.dccMissionId ?? row.mission_code ?? '',
        startDateTime: rowMeta[i]?.startDateTime ?? row.scheduled_start?.toISOString() ?? '',
      })),
    };
  }

  const dccMissionId = input.mission_code ?? crypto.randomUUID();

  const data = await prisma.pilot_mission.create({
    data: {
      ...base,
      mission_code: dccMissionId,
      scheduled_start: new Date(input.scheduled_start),
      actual_end: input.scheduled_end ? new Date(input.scheduled_end) : null,
    },
    select: { pilot_mission_id: true },
  });

  return {
    firstMissionId: data.pilot_mission_id,
    missions: [{
      pilotMissionId: data.pilot_mission_id,
      dccMissionId,
      startDateTime: input.scheduled_start,
    }],
  };
};


export const lookupOperationMissionCode = async (
  operationId: number,
  ownerId: number,
): Promise<string | null> => {
  const { data } = await supabase
    .from('pilot_mission')
    .select('mission_code')
    .eq('pilot_mission_id', operationId)
    .eq('fk_owner_id', ownerId)
    .maybeSingle()
  return (data as any)?.mission_code ?? null
}

export const deleteOperationCalendarEntry = async (
  operationId: number,
  ownerId: number,
): Promise<void> => {
  const { error } = await supabase
    .from('pilot_mission')
    .delete()
    .eq('pilot_mission_id', operationId)
    .eq('fk_owner_id', ownerId)

  if (error) throw new Error(`Failed to delete operation: ${error.message}`)
}


const buildOperationTitle = (op: OperationItem): string => {
  const parts: string[] = [];
  if (op.mission_name) parts.push(op.mission_name);
  if (op.pilot_name) parts.push(`— ${op.pilot_name}`);
  if (op.vehicle_code) parts.push(`(${op.vehicle_code})`);
  return parts.join(' ') || 'Unnamed Operation';
};

const deriveEnd = (start: string): string => {
  const d = new Date(start);
  d.setHours(d.getHours() + 1);
  return d.toISOString();
};