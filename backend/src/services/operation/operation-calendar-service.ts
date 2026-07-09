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