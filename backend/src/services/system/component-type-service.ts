'use server';

import { supabase } from '@/backend/database/database';

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
  const { data, error } = await supabase
    .from('component_type_config')
    .select('type_id, type_value, type_label')
    .eq('fk_owner_id', ownerId)
    .order('type_label', { ascending: true });

  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    const rows = DEFAULT_TYPES.map(t => ({ ...t, fk_owner_id: ownerId }));
    const { data: seeded, error: seedErr } = await supabase
      .from('component_type_config')
      .insert(rows)
      .select('type_id, type_value, type_label');

    if (seedErr) throw new Error(seedErr.message);
    return seeded ?? [];
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

  const { data: existing } = await supabase
    .from('component_type_config')
    .select('type_id')
    .eq('fk_owner_id', ownerId)
    .or(`type_value.eq.${normalizedValue},type_label.ilike.${normalizedLabel}`)
    .maybeSingle();

  if (existing) throw new Error('A component type with this name or value already exists.');

  const { data, error } = await supabase
    .from('component_type_config')
    .insert({ type_value: normalizedValue, type_label: typeLabel.trim(), fk_owner_id: ownerId })
    .select('type_id, type_value, type_label')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateComponentType(
  ownerId: number,
  typeId: number,
  typeLabel: string,
): Promise<void> {
  const { error } = await supabase
    .from('component_type_config')
    .update({ type_label: typeLabel.trim() })
    .eq('type_id', typeId)
    .eq('fk_owner_id', ownerId);

  if (error) throw new Error(error.message);
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
  const { data: tools, error: toolError } = await supabase
    .from('tool')
    .select('tool_id, tool_code')
    .eq('fk_owner_id', ownerId);
  if (toolError) throw new Error(toolError.message);

  const toolIds = (tools ?? []).map((t: any) => t.tool_id);
  if (toolIds.length === 0) return [];

  const { data, error } = await supabase
    .from('tool_component')
    .select('component_id, component_code, component_name, fk_tool_id')
    .eq('component_type', typeValue)
    .eq('component_active', 'Y')
    .in('fk_tool_id', toolIds);

  if (error) throw new Error(error.message);

  const toolMap = new Map((tools ?? []).map((t: any) => [t.tool_id, t.tool_code]));
  return (data ?? []).map((c: any) => ({
    component_id: c.component_id,
    component_code: c.component_code,
    component_name: c.component_name,
    fk_tool_id: c.fk_tool_id,
    tool_code: toolMap.get(c.fk_tool_id) ?? null,
  }));
}

export async function deleteComponentType(ownerId: number, typeId: number): Promise<void> {
  const { data: typeRow, error: fetchErr } = await supabase
    .from('component_type_config')
    .select('type_value')
    .eq('type_id', typeId)
    .eq('fk_owner_id', ownerId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!typeRow) throw new Error('Type not found.');

  const usage = await getComponentsUsingType(ownerId, typeRow.type_value);
  if (usage.length > 0) {
    throw new Error(
      `Cannot delete: ${usage.length} component${usage.length > 1 ? 's' : ''} use this type.`,
    );
  }

  const { error } = await supabase
    .from('component_type_config')
    .delete()
    .eq('type_id', typeId)
    .eq('fk_owner_id', ownerId);

  if (error) throw new Error(error.message);
}
