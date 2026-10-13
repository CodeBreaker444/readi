/**
 * Checks that decide whether a system may get a new ticket / be used in an operation.
 * The decision rules are in maintenance-ticket-rules.ts; these functions load the data.
 */
import { supabase } from '@/backend/database/database';
import { prisma } from '@/lib/prisma';
import {
  SYSTEM_ALREADY_HAS_OPEN_TICKET_MESSAGE,
  SYSTEM_IN_MAINTENANCE_MESSAGE,
  TICKET_CONFLICT_MESSAGE,
  hasTicketCoverageConflict,
} from './maintenance-ticket-rules';

async function findOpenTicketIdForTool(toolId: number): Promise<number | null> {
  const ticket = await prisma.maintenance_ticket.findFirst({
    where: { fk_tool_id: toolId, ticket_status: { not: 'CLOSED' } },
    select: { ticket_id: true },
  });
  return ticket?.ticket_id ?? null;
}

export async function hasOpenTicketForTool(toolId: number): Promise<boolean> {
  return (await findOpenTicketIdForTool(toolId)) !== null;
}

export async function assertNoOpenTicketForTool(toolId: number): Promise<void> {
  if ((await findOpenTicketIdForTool(toolId)) !== null) {
    throw new Error(SYSTEM_ALREADY_HAS_OPEN_TICKET_MESSAGE);
  }
}

export async function assertCanCreateTicket(toolId: number, componentIds: number[] = []): Promise<void> {
  const openTickets = await prisma.maintenance_ticket.findMany({
    where: { fk_tool_id: toolId, ticket_status: { not: 'CLOSED' } },
    select: {
      fk_component_id: true,
      maintenance_ticket_item: {
        where: { item_type: 'COMPONENT', fk_component_id: { not: null } },
        select: { fk_component_id: true },
      },
    },
  });

  if (hasTicketCoverageConflict(openTickets, componentIds)) {
    throw new Error(TICKET_CONFLICT_MESSAGE);
  }
}

export async function assertToolNotInMaintenance(toolId: number): Promise<void> {
  if ((await findOpenTicketIdForTool(toolId)) !== null) {
    throw new Error(SYSTEM_IN_MAINTENANCE_MESSAGE);
  }
}

export async function assertToolNotNonOperational(toolId: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { data: expiredComp } = await supabase
    .from('tool_component')
    .select('component_id, component_name')
    .eq('fk_tool_id', toolId)
    .eq('component_active', 'Y')
    .lte('expiration_date', today)
    .not('expiration_date', 'is', null)
    .limit(1)
    .maybeSingle();

  if (expiredComp) {
    throw new Error(
      `This system is not operational — component "${expiredComp.component_name}" has expired. It cannot be used for mission creation.`
    );
  }

  const { data: tool } = await supabase
    .from('tool')
    .select('tool_metadata')
    .eq('tool_id', toolId)
    .maybeSingle();

  if (tool?.tool_metadata?.status === 'NOT_OPERATIONAL') {
    throw new Error(
      'This system is not operational and cannot be used for mission creation.'
    );
  }
}
