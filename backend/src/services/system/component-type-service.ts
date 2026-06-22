import { prisma } from '@/lib/prisma';

export interface ComponentTypeRow {
  type_id: number;
  type_value: string;
  type_label: string;
}

const DEFAULT_TYPES = [
  { type_value: 'DRONE',      type_label: 'Drone (Aircraft)' },
  { type_value: 'DOCK',       type_label: 'Dock' },
  { type_value: 'BATTERY',    type_label: 'Battery' },
  { type_value: 'PROPELLER',  type_label: 'Propeller' },
  { type_value: 'CAMERA',     type_label: 'Camera' },
  { type_value: 'GIMBAL',     type_label: 'Gimbal' },
  { type_value: 'GPS',        type_label: 'GPS' },
  { type_value: 'CONTROLLER', type_label: 'Controller' },
  { type_value: 'SENSOR',     type_label: 'Sensor' },
  { type_value: 'OTHER',      type_label: 'Other' },
];

export async function getComponentTypes(ownerId: number): Promise<ComponentTypeRow[]> {
  const data = await prisma.component_type_config.findMany({
    where: { fk_owner_id: BigInt(ownerId) },
    select: { type_id: true, type_value: true, type_label: true },
    orderBy: { type_label: 'asc' },
  });

  if (!data || data.length === 0) {
    const created = await prisma.$transaction(
      DEFAULT_TYPES.map((t) =>
        prisma.component_type_config.create({
          data: { ...t, fk_owner_id: BigInt(ownerId) },
          select: { type_id: true, type_value: true, type_label: true },
        })
      )
    );
    return created;
  }

  return data;
}

export async function createComponentType(
  ownerId: number,
  typeValue: string,
  typeLabel: string,
): Promise<ComponentTypeRow> {
  const normalizedValue = typeValue.trim().toUpperCase();
  const normalizedLabel = typeLabel.trim().toLowerCase();

  const existing = await prisma.component_type_config.findFirst({
    where: {
      fk_owner_id: BigInt(ownerId),
      OR: [
        { type_value: normalizedValue },
        { type_label: { contains: normalizedLabel, mode: 'insensitive' } },
      ],
    },
    select: { type_id: true },
  });

  if (existing) throw new Error('A component type with this name or value already exists.');

  return prisma.component_type_config.create({
    data: { type_value: normalizedValue, type_label: typeLabel.trim(), fk_owner_id: BigInt(ownerId) },
    select: { type_id: true, type_value: true, type_label: true },
  });
}

export async function updateComponentType(
  ownerId: number,
  typeId: number,
  typeLabel: string,
): Promise<void> {
  await prisma.component_type_config.updateMany({
    where: { type_id: typeId, fk_owner_id: BigInt(ownerId) },
    data: { type_label: typeLabel.trim() },
  });
}

export interface ComponentUsageRow {
  component_id: number;
  component_code: string | null;
  component_name: string | null;
  fk_tool_id: number;
  tool_code: string | null;
}

export async function getComponentsUsingType(
  ownerId: number,
  typeValue: string,
): Promise<ComponentUsageRow[]> {
  const tools = await prisma.tool.findMany({
    where: { fk_owner_id: ownerId },
    select: { tool_id: true, tool_code: true },
  });

  const toolIds = tools.map((t) => t.tool_id);
  if (toolIds.length === 0) return [];

  const components = await prisma.tool_component.findMany({
    where: {
      component_type: typeValue,
      component_active: 'Y',
      fk_tool_id: { in: toolIds },
    },
    select: { component_id: true, component_code: true, component_name: true, fk_tool_id: true },
  });

  const toolMap = new Map(tools.map((t) => [t.tool_id, t.tool_code]));
  return components.map((c) => ({
    component_id: c.component_id,
    component_code: c.component_code,
    component_name: c.component_name,
    fk_tool_id: c.fk_tool_id,
    tool_code: toolMap.get(c.fk_tool_id) ?? null,
  }));
}

export async function deleteComponentType(ownerId: number, typeId: number): Promise<void> {
  const typeRow = await prisma.component_type_config.findFirst({
    where: { type_id: typeId, fk_owner_id: BigInt(ownerId) },
    select: { type_value: true },
  });
  if (!typeRow) throw new Error('Type not found.');

  const usage = await getComponentsUsingType(ownerId, typeRow.type_value);
  if (usage.length > 0) {
    throw new Error(
      `Cannot delete: ${usage.length} component${usage.length > 1 ? 's' : ''} use this type.`,
    );
  }

  await prisma.component_type_config.deleteMany({
    where: { type_id: typeId, fk_owner_id: BigInt(ownerId) },
  });
}
