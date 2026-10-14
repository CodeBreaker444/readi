/**
 * Read-only maintenance ticket queries and lookup lists (no writes, no notifications).
 */
import { supabase } from '@/backend/database/database';
import { getToolName, getUserName } from '@/backend/services/shared/entity-names';
import { refreshMaintenanceDaysForTool } from '@/backend/utils/refresh-maintenance-days';
import type {
  ComponentOption,
  DroneOption,
  MaintenanceTicket,
  TicketEvent,
  UserOption,
} from '@/config/types/maintenance';
import { prisma } from '@/lib/prisma';
import { getPresignedDownloadUrl } from '@/lib/s3Client';
import { getComponentStatusesForTool, getComponentStatusesForTools, isPermanentlyBlockedStatus } from './maintenance-ticket-components';
import { getTicketComponentIds } from './maintenance-ticket-rules';

export async function getTicketList(owner_id: number, tool_id?: number, assignedToUserId?: number): Promise<MaintenanceTicket[]> {
  const rows = await prisma.maintenance_ticket.findMany({
    where: {
      ...(owner_id && { fk_owner_id: owner_id }),
      ...(tool_id && { fk_tool_id: tool_id }),
      ...(assignedToUserId && { assigned_to_user_id: assignedToUserId }),
    },
    select: {
      ticket_id: true,
      fk_owner_id: true,
      fk_tool_id: true,
      fk_component_id: true,
      ticket_type: true,
      ticket_status: true,
      ticket_priority: true,
      assigned_to_user_id: true,
      reported_at: true,
      closed_at: true,
      resolution_notes: true,
      location_latitude: true,
      location_longitude: true,
      location_pseudo_name: true,
      intervention_started_at: true,
      intervention_ended_at: true,
      created_at: true,
      updated_at: true,
      tool: {
        select: {
          tool_code: true,
          tool_name: true,
          tool_description: true,
          tool_metadata: true,
          tool_model: {
            select: { model_name: true, manufacturer: true },
          },
        },
      },
      users_maintenance_ticket_assigned_to_user_idTousers: {
        select: { user_id: true, first_name: true, last_name: true, email: true },
      },
      maintenance_ticket_item: {
        where: { item_type: 'COMPONENT', fk_component_id: { not: null } },
        select: { fk_component_id: true },
      },
    },
    orderBy: { ticket_id: 'desc' },
  });

  const ticketComponentIds = getTicketComponentIds;

  const componentIds = [...new Set(rows.flatMap(ticketComponentIds))];
  const componentMap: Record<number, any> = {};
  if (componentIds.length > 0) {
    const comps = await prisma.tool_component.findMany({
      where: { component_id: { in: componentIds } },
      select: { component_id: true, component_type: true, component_name: true, serial_number: true },
    });
    for (const c of comps) {
      componentMap[c.component_id] = c;
    }
  }

  const toolIdsWithoutComponent = [...new Set(
    rows.filter((r) => ticketComponentIds(r).length === 0).map((r) => r.fk_tool_id).filter(Boolean)
  )] as number[];
  type SystemComponent = { component_type: string; component_sn: string; is_drone: boolean };
  const systemComponentsMap: Record<number, SystemComponent[]> = {};
  if (toolIdsWithoutComponent.length > 0) {
    const sysComps = await prisma.tool_component.findMany({
      where: {
        fk_tool_id: { in: toolIdsWithoutComponent },
        component_active: 'Y',
      },
      select: { component_id: true, fk_tool_id: true, component_type: true, component_name: true, serial_number: true },
    });
    // Dismissed / decommissioned components are not covered by a system-level ticket.
    const effective = await getComponentStatusesForTools(toolIdsWithoutComponent);
    for (const c of sysComps) {
      if (isPermanentlyBlockedStatus(effective.get(c.component_id))) continue;
      if (!systemComponentsMap[c.fk_tool_id]) systemComponentsMap[c.fk_tool_id] = [];
      systemComponentsMap[c.fk_tool_id].push({
        component_type: c.component_type ?? c.component_name ?? '',
        component_sn: c.serial_number ?? '',
        is_drone: c.component_type === 'DRONE',
      });
    }
  }

  return rows.map((row) => {
    const assignee = row.users_maintenance_ticket_assigned_to_user_idTousers;
    const linkedComps = ticketComponentIds(row).map((id) => componentMap[id]).filter(Boolean);
    const comp = linkedComps.length === 1 ? linkedComps[0] : null;
    const entityName = comp ? (comp.component_type ?? comp.component_name ?? undefined) : undefined;
    const systemComponents = linkedComps.length > 1
      ? linkedComps.map((c) => ({ component_type: c.component_type ?? c.component_name ?? '', component_sn: c.serial_number ?? '' }))
      : !comp
        ? (systemComponentsMap[row.fk_tool_id ?? 0] ?? [])
            .map(({ component_type, component_sn }) => ({ component_type, component_sn }))
        : [];

    return {
      ticket_id:           row.ticket_id,
      fk_owner_id:         row.fk_owner_id ?? 0,
      fk_tool_id:          row.fk_tool_id ?? 0,
      fk_component_id:     row.fk_component_id ?? null,
      ticket_type:         (row.ticket_type ?? 'STANDARD') as MaintenanceTicket['ticket_type'],
      entity_type:         linkedComps.length > 0 ? 'COMPONENT' as const : 'AIRCRAFT' as const,
      ticket_status:       (row.ticket_status ?? 'OPEN') as MaintenanceTicket['ticket_status'],
      ticket_priority:     (row.ticket_priority ?? 'MEDIUM') as MaintenanceTicket['ticket_priority'],
      assigned_to_user_id: row.assigned_to_user_id ?? null,
      opened_by:           'system',
      opened_at:           row.reported_at?.toISOString() ?? row.created_at?.toISOString() ?? null,
      closed_at:           row.closed_at?.toISOString() ?? null,
      note:                row.resolution_notes ?? null,
      created_at:          row.created_at?.toISOString() ?? null,
      updated_at:          row.updated_at?.toISOString() ?? null,
      drone_code:          row.tool?.tool_code ?? '—',
      drone_serial:        row.tool?.tool_name ?? '—',
      drone_model:         row.tool?.tool_model
        ? `${row.tool.tool_model.manufacturer ?? ''} ${row.tool.tool_model.model_name ?? ''}`.trim()
        : (row.tool?.tool_description ?? '—'),
      entity_name:         entityName,
      component_sn:        comp?.serial_number ?? null,
      system_components:   systemComponents,
      assigner_name:  assignee
        ? `${assignee.first_name ?? ''} ${assignee.last_name ?? ''}`.trim()
        : 'Unassigned',
      assigner_email:     assignee?.email ?? '',
      trigger_params:     null,
      location_latitude:       row.location_latitude != null ? Number(row.location_latitude) : null,
      location_longitude:      row.location_longitude != null ? Number(row.location_longitude) : null,
      location_pseudo_name:    row.location_pseudo_name ?? null,
      intervention_started_at: row.intervention_started_at?.toISOString() ?? null,
      intervention_ended_at:   row.intervention_ended_at?.toISOString() ?? null,
    } as MaintenanceTicket;
  });
}

export async function getTicketAssignee(ticketId: number): Promise<number | null> {
  const row = await prisma.maintenance_ticket.findUnique({
    where: { ticket_id: ticketId },
    select: { assigned_to_user_id: true },
  });
  return row?.assigned_to_user_id ?? null;
}

export async function getTicketEvents(ticketId: number): Promise<TicketEvent[]> {
  const data = await prisma.maintenance_ticket_event.findMany({
    where: { fk_ticket_id: ticketId },
    select: {
      event_id: true,
      event_type: true,
      event_description: true,
      event_data: true,
      created_at: true,
    },
    orderBy: { created_at: 'asc' },
  });

  return data.map((row) => ({
    event_id:      row.event_id,
    fk_ticket_id:  ticketId,
    event_type:    row.event_type,
    event_message: row.event_description ?? '',
    created_by:    (row.event_data as any)?.email ?? null,
    created_at:    row.created_at?.toISOString() ?? '',
  }));
}

export async function getTicketAttachments(ticketId: number) {
  const data = await prisma.ticket_attachment.findMany({
    where: { fk_ticket_id: ticketId },
    orderBy: { uploaded_at: 'desc' },
  });

  return Promise.all(
    data.map(async (row) => ({
      ...row,
      file_size: row.file_size != null ? Number(row.file_size) : null,
      uploaded_at: row.uploaded_at?.toISOString() ?? null,
      download_url: await getPresignedDownloadUrl(row.file_key, 900),
    }))
  );
}

export async function getDroneList(ownerId: number): Promise<DroneOption[]> {
  const data = await prisma.tool.findMany({
    where: { fk_owner_id: ownerId, tool_active: 'Y' },
    select: { tool_id: true, tool_code: true, tool_name: true, tool_description: true, tool_metadata: true },
    orderBy: { tool_code: 'asc' },
  });

  return data
    .filter((row) => (row.tool_metadata as any)?.is_warehouse !== true && (row.tool_metadata as any)?.deleted !== true)
    .map((row) => ({
      tool_id:     row.tool_id,
      tool_code:   row.tool_code ?? '',
      tool_desc:   row.tool_description ?? row.tool_name ?? '',
      tool_status: (row.tool_metadata as any)?.status ?? 'OPERATIONAL',
    }));
}

export async function getComponentList(toolId: number, ticketType?: string): Promise<ComponentOption[]> {
  await refreshMaintenanceDaysForTool(toolId);

  const { data, error } = await supabase
    .from('tool_component')
    .select('component_id, component_code, component_name, component_type, serial_number, maintenance_cycle, maintenance_cycle_day')
    .eq('fk_tool_id', toolId)
    .eq('component_active', 'Y');

  if (error) throw new Error(`getComponentList: ${error.message}`);

  const statuses = await getComponentStatusesForTool(toolId);

  return (data ?? []).map((row) => ({
    tool_component_id: row.component_id,
    component_code:    row.component_code ?? '',
    component_type:    row.component_type ?? row.component_name ?? '',
    component_sn:      row.serial_number ?? '',
    component_status:  statuses.get(row.component_id) ?? 'OPERATIONAL',
  }));
}

export async function getUserList(ownerId: number, profileCode?: string): Promise<UserOption[]> {
  const data = await prisma.public_users.findMany({
    where: {
      fk_owner_id: ownerId,
      user_active: 'Y',
      ...(profileCode && profileCode !== 'ALL' && { user_role: profileCode }),
    },
    select: { user_id: true, first_name: true, last_name: true, email: true, user_role: true },
    orderBy: { first_name: 'asc' },
  });

  return data.map((row) => ({
    user_id:      row.user_id,
    fullname:     `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
    email:        row.email ?? '',
    user_profile: row.user_role ?? '',
  }));
}

export async function getToolCode(toolId: number): Promise<string> {
  return getToolName(toolId);
}

export async function getTechnicianName(userId: number): Promise<string> {
  return getUserName(userId);
}

export async function getComponentMissions(componentId: number) {
  const comp = await prisma.tool_component.findUnique({
    where: { component_id: componentId },
    select: { fk_tool_id: true, installation_date: true, created_at: true },
  });

  if (!comp?.fk_tool_id) return [];

  const installDate = comp.installation_date?.toISOString().slice(0, 10) ?? new Date().toISOString().split('T')[0];
  const createdDate = comp.created_at?.toISOString().split('T')[0] ?? null;
  const cutoff = createdDate && createdDate > installDate ? createdDate : installDate;

  const data = await prisma.pilot_mission.findMany({
    where: {
      fk_tool_id: comp.fk_tool_id,
      actual_end: { not: null },
      actual_start: { gte: new Date(cutoff) },
    },
    select: {
      pilot_mission_id: true,
      mission_code: true,
      actual_start: true,
      actual_end: true,
      flight_duration: true,
      distance_flown: true,
    },
    orderBy: { actual_start: 'desc' },
  });

  return data.map((row) => ({
    pilot_mission_id: row.pilot_mission_id,
    mission_code:     row.mission_code,
    actual_start:     row.actual_start?.toISOString() ?? null,
    actual_end:       row.actual_end?.toISOString() ?? null,
    flight_duration:  row.flight_duration,
    distance_flown:   row.distance_flown != null ? Number(row.distance_flown) : null,
  }));
}

export async function getComponentTicketEvents(componentId: number) {
  const data = await prisma.maintenance_ticket.findMany({
    where: {
      OR: [
        { fk_component_id: componentId },
        { maintenance_ticket_item: { some: { fk_component_id: componentId, item_type: 'COMPONENT' } } },
      ],
    },
    select: {
      ticket_id: true,
      ticket_status: true,
      reported_at: true,
      closed_at: true,
      resolution_notes: true,
      maintenance_ticket_event: {
        select: {
          event_id: true,
          event_type: true,
          event_description: true,
          created_at: true,
        },
      },
    },
    orderBy: { ticket_id: 'desc' },
  });

  return data.map((row) => ({
    ...row,
    reported_at: row.reported_at?.toISOString() ?? null,
    closed_at:   row.closed_at?.toISOString() ?? null,
    maintenance_ticket_event: row.maintenance_ticket_event.map((e) => ({
      ...e,
      created_at: e.created_at?.toISOString() ?? null,
    })),
  }));
}
