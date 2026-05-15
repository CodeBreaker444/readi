import { supabase } from '@/backend/database/database';
import 'server-only';

// Roles that carry the view_drone_atc permission 
const DRONE_ATC_ROLES = ['SUPERADMIN', 'ADMIN', 'PIC', 'OPM'] as const;

export interface DroneAtcComponent {
  componentId: number;
  componentCode: string;
  componentName: string;
  componentType: string;
  serialNumber: string | null;
  componentStatus: string;
  dccDroneId: string | null;
  droneRegistrationCode: string | null;
}

export interface DroneAtcSystem {
  toolId: number;
  toolCode: string;
  toolName: string | null;
  toolActive: string;
  location: string | null;
  components: DroneAtcComponent[];
}

export interface DroneAtcUser {
  userId: number;
  email: string;
  fullname: string;
  role: string;
  companyId: number;
  companyName: string | null;
  flytbaseToken: string;
  flytbaseOrgId: string;
  systems: DroneAtcSystem[];
}

export async function getUsersWithDroneAtc(): Promise<DroneAtcUser[]> {
  // Users with drone ATC roles + flytbase credentials
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select(
      'user_id, email, first_name, last_name, username, user_role, fk_owner_id, flytbase_api_token, flytbase_org_id',
    )
    .in('user_role', DRONE_ATC_ROLES)
    .eq('user_active', 'Y')
    .not('flytbase_api_token', 'is', null)
    .not('flytbase_org_id', 'is', null);

  if (usersError) throw new Error(`getUsersWithDroneAtc users: ${usersError.message}`);
  if (!users?.length) return [];

  // collecting distinct owner IDs and fetch their systems
  const ownerIds = [...new Set(users.map((u) => u.fk_owner_id))];

  const { data: owners } = await supabase
    .from('owner')
    .select('owner_id, owner_name')
    .in('owner_id', ownerIds);

  const ownerNameById = new Map<number, string>();
  for (const o of owners ?? []) {
    ownerNameById.set(o.owner_id, o.owner_name ?? null);
  }

  const { data: tools, error: toolsError } = await supabase
    .from('tool')
    .select('tool_id, fk_owner_id, tool_code, tool_name, tool_active, location, tool_description')
    .in('fk_owner_id', ownerIds)
    .eq('tool_active', 'Y');

  if (toolsError) throw new Error(`getUsersWithDroneAtc tools: ${toolsError.message}`);

  const toolIds = (tools || []).map((t) => t.tool_id);

  let components: any[] = [];
  if (toolIds.length > 0) {
    const { data: comps, error: compsError } = await supabase
      .from('tool_component')
      .select(
        'component_id, fk_tool_id, component_code, component_name, component_type, serial_number, component_metadata, dcc_drone_id, drone_registration_code',
      )
      .in('fk_tool_id', toolIds)
      .eq('component_active', 'Y');

    if (compsError) throw new Error(`getUsersWithDroneAtc components: ${compsError.message}`);
    components = comps || [];
  }

  const compsByTool = new Map<number, DroneAtcComponent[]>();
  for (const c of components) {
    if (!c.dcc_drone_id && !c.serial_number) continue;
    const list = compsByTool.get(c.fk_tool_id) ?? [];
    list.push({
      componentId: c.component_id,
      componentCode: c.component_code,
      componentName: c.component_name,
      componentType: c.component_type,
      serialNumber: c.serial_number ?? null,
      componentStatus: c.component_metadata?.component_status ?? 'OPERATIONAL',
      dccDroneId: c.dcc_drone_id ?? null,
      droneRegistrationCode: c.drone_registration_code ?? null,
    });
    compsByTool.set(c.fk_tool_id, list);
  }

  const systemsByOwner = new Map<number, DroneAtcSystem[]>();
  for (const t of tools || []) {
    const list = systemsByOwner.get(t.fk_owner_id) ?? [];
    list.push({
      toolId: t.tool_id,
      toolCode: t.tool_code,
      toolName: t.tool_name ?? t.tool_description ?? null,
      toolActive: t.tool_active,
      location: t.location ?? null,
      components: compsByTool.get(t.tool_id) ?? [],
    });
    systemsByOwner.set(t.fk_owner_id, list);
  }

  return users
    .filter((u) => u.flytbase_api_token?.trim() && u.flytbase_org_id?.trim())
    .map((u) => ({
      userId: u.user_id,
      email: u.email,
      fullname: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email,
      role: u.user_role,
      companyId: u.fk_owner_id,
      companyName: ownerNameById.get(u.fk_owner_id) ?? null,
      flytbaseToken: u.flytbase_api_token.trim(),
      flytbaseOrgId: u.flytbase_org_id.trim(),
      systems: systemsByOwner.get(u.fk_owner_id) ?? [],
    }));
}
