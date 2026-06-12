import { prisma } from "@/lib/prisma";
import { revalidateTag, unstable_cache } from 'next/cache';
import 'server-only';

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

async function fetchUsersWithDroneAtc(): Promise<DroneAtcUser[]> {
  const users = await prisma.public_users.findMany({
    where: {
      user_role:          { in: [...DRONE_ATC_ROLES] },
      user_active:        'Y',
      flytbase_api_token: { not: null },
      flytbase_org_id:    { not: null },
    },
    select: {
      user_id:            true,
      email:              true,
      first_name:         true,
      last_name:          true,
      username:           true,
      user_role:          true,
      fk_owner_id:        true,
      flytbase_api_token: true,
      flytbase_org_id:    true,
    },
  });

  const filtered = users.filter(
    (u) => u.flytbase_api_token?.trim() && u.flytbase_org_id?.trim() && u.fk_owner_id != null,
  );
  if (!filtered.length) return [];

  const ownerIds = [...new Set(users.map((u) => u.fk_owner_id).filter((id): id is number => id != null))];

  const [owners, tools] = await Promise.all([
    prisma.owner.findMany({
      where:  { owner_id: { in: ownerIds } },
      select: { owner_id: true, owner_name: true, owner_code: true },
    }),
    prisma.tool.findMany({
      where:  { fk_owner_id: { in: ownerIds }, tool_active: 'Y' },
      select: { tool_id: true, fk_owner_id: true, tool_code: true, tool_name: true, tool_active: true, location: true, tool_description: true },
    }),
  ]);

  const ownerNameById = new Map<number, string | null>();
  const ownerCodeById = new Map<number, string | null>();
  for (const o of owners) {
    ownerNameById.set(o.owner_id, o.owner_name ?? null);
    ownerCodeById.set(o.owner_id, o.owner_code ?? null);
  }

  const toolIds = tools.map((t) => t.tool_id);

  const components = toolIds.length
    ? await prisma.tool_component.findMany({
        where: { fk_tool_id: { in: toolIds }, component_active: 'Y' },
        select: {
          component_id:           true,
          fk_tool_id:             true,
          component_code:         true,
          component_name:         true,
          component_type:         true,
          serial_number:          true,
          component_metadata:     true,
          dcc_drone_id:           true,
          drone_registration_code: true,
        },
      })
    : [];

  const compsByTool = new Map<number, DroneAtcComponent[]>();
  for (const c of components) {
    if (!c.dcc_drone_id && !c.serial_number) continue;
    const meta = c.component_metadata as Record<string, unknown> | null;
    const list = compsByTool.get(c.fk_tool_id) ?? [];
    list.push({
      componentId:           c.component_id,
      componentCode:         c.component_code ?? '',
      componentName:         c.component_name,
      componentType:         c.component_type ?? '',
      serialNumber:          c.serial_number ?? null,
      componentStatus:       (meta?.component_status as string) ?? 'OPERATIONAL',
      dccDroneId:            c.dcc_drone_id ?? null,
      droneRegistrationCode: c.drone_registration_code ?? null,
    });
    compsByTool.set(c.fk_tool_id, list);
  }

  const systemsByOwner = new Map<number, DroneAtcSystem[]>();
  for (const t of tools) {
    const list = systemsByOwner.get(t.fk_owner_id) ?? [];
    list.push({
      toolId:     t.tool_id,
      toolCode:   t.tool_code ?? '',
      toolName:   t.tool_name ?? t.tool_description ?? null,
      toolActive: t.tool_active ?? 'Y',
      location:   t.location ?? null,
      components: compsByTool.get(t.tool_id) ?? [],
    });
    systemsByOwner.set(t.fk_owner_id, list);
  }

  return filtered.map((u) => ({
    userId:      u.user_id,
    email:       u.email ?? '',
    fullname:    [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email || '',
    role:        u.user_role ?? '',
    companyId:   u.fk_owner_id as number,
    companyName: ownerNameById.get(u.fk_owner_id as number) ?? null,
    companyCode: ownerCodeById.get(u.fk_owner_id as number) ?? null,
    flytbaseToken: u.flytbase_api_token!.trim(),
    flytbaseOrgId: u.flytbase_org_id!.trim(),
    systems:     systemsByOwner.get(u.fk_owner_id as number) ?? [],
  }));
}

export const getUsersWithDroneAtc = unstable_cache(
  fetchUsersWithDroneAtc,
  ['drone-atc-users'],
  { revalidate: 30, tags: ['drone-atc-users'] },
);

export function invalidateDroneAtcUsersCache() {
  revalidateTag('drone-atc-users');
}
