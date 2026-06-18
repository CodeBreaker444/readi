import { prisma } from '@/lib/prisma';
import { LocationGroup, LocationGroupCreateInput } from "@/config/types/erp";

function mapRow(g: any): LocationGroup {
  return {
    group_id: g.group_id,
    name: g.name,
    notes: g.notes ?? null,
    is_active: g.is_active,
    owner_id: g.fk_owner_id,
    locations: (g.erp_location_group_location ?? []).map((l: any) => ({
      location_id: l.location_id,
      name: l.location_name,
      lat: l.lat ?? null,
      lng: l.lng ?? null,
    })),
    contacts: (g.erp_location_group_contact ?? [])
      .filter((c: any) => c.emergency_response_plan)
      .map((c: any) => ({
        id: Number(c.emergency_response_plan.erp_id),
        contact: c.emergency_response_plan.contact,
        type: c.emergency_response_plan.erp_type,
        description: c.emergency_response_plan.description,
      })),
    created_at: g.created_at?.toISOString() ?? null,
    updated_at: g.updated_at?.toISOString() ?? null,
  };
}

const groupInclude = {
  erp_location_group_location: true,
  erp_location_group_contact: {
    include: { emergency_response_plan: true },
  },
} as const;

async function fetchGroup(groupId: number): Promise<LocationGroup | null> {
  const g = await prisma.erp_location_group.findUnique({
    where: { group_id: groupId },
    include: groupInclude,
  });
  if (!g) return null;
  return mapRow(g);
}

export async function listLocationGroups(ownerId: number): Promise<LocationGroup[]> {
  const rows = await prisma.erp_location_group.findMany({
    where: { fk_owner_id: ownerId },
    include: groupInclude,
    orderBy: { created_at: 'desc' },
  });
  return rows.map(mapRow);
}

export async function createLocationGroup(input: LocationGroupCreateInput, ownerId: number): Promise<LocationGroup> {
  const newErpIds: bigint[] = [];
  for (const nc of input.new_contacts) {
    const erp = await prisma.emergency_response_plan.create({
      data: {
        description: nc.description,
        contact: nc.contact,
        erp_type: nc.type,
        fk_owner_id: ownerId,
      },
    });
    newErpIds.push(erp.erp_id);
  }

  const allContactIds = [
    ...input.existing_contact_ids.map((id) => BigInt(id)),
    ...newErpIds,
  ];

  const group = await prisma.erp_location_group.create({
    data: {
      name: input.name,
      notes: input.notes ?? null,
      is_active: input.is_active,
      fk_owner_id: ownerId,
      ...(input.locations.length > 0 && {
        erp_location_group_location: {
          create: input.locations.map((l) => ({
            location_name: l.name,
            lat: l.lat ?? null,
            lng: l.lng ?? null,
          })),
        },
      }),
      ...(allContactIds.length > 0 && {
        erp_location_group_contact: {
          create: allContactIds.map((eid) => ({ fk_erp_id: eid })),
        },
      }),
    },
  });

  const result = await fetchGroup(group.group_id);
  if (!result) throw new Error('Failed to fetch created group');
  return result;
}

export async function updateLocationGroup(id: number, input: LocationGroupCreateInput, ownerId: number): Promise<LocationGroup> {
  const newErpIds: bigint[] = [];
  for (const nc of input.new_contacts) {
    const erp = await prisma.emergency_response_plan.create({
      data: {
        description: nc.description,
        contact: nc.contact,
        erp_type: nc.type,
        fk_owner_id: ownerId,
      },
    });
    newErpIds.push(erp.erp_id);
  }

  const allContactIds = [
    ...input.existing_contact_ids.map((eid) => BigInt(eid)),
    ...newErpIds,
  ];

  await prisma.$transaction(async (tx) => {
    await tx.erp_location_group.update({
      where: { group_id: id },
      data: {
        name: input.name,
        notes: input.notes ?? null,
        is_active: input.is_active,
        updated_at: new Date(),
      },
    });

    await tx.erp_location_group_location.deleteMany({ where: { fk_group_id: id } });
    await tx.erp_location_group_contact.deleteMany({ where: { fk_group_id: id } });

    if (input.locations.length > 0) {
      await tx.erp_location_group_location.createMany({
        data: input.locations.map((l) => ({
          fk_group_id: id,
          location_name: l.name,
          lat: l.lat ?? null,
          lng: l.lng ?? null,
        })),
      });
    }

    if (allContactIds.length > 0) {
      await tx.erp_location_group_contact.createMany({
        data: allContactIds.map((eid) => ({ fk_group_id: id, fk_erp_id: eid })),
      });
    }
  });

  const result = await fetchGroup(id);
  if (!result) throw new Error('Failed to fetch updated group');
  return result;
}

export async function deleteLocationGroup(id: number, ownerId: number): Promise<void> {
  await prisma.erp_location_group.deleteMany({
    where: { group_id: id, fk_owner_id: ownerId },
  });
}
