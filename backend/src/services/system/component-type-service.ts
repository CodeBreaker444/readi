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

  // Auto-seed defaults on first use
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

export async function deleteComponentType(ownerId: number, typeId: number): Promise<void> {
  const { error } = await supabase
    .from('component_type_config')
    .delete()
    .eq('type_id', typeId)
    .eq('fk_owner_id', ownerId);

  if (error) throw new Error(error.message);
}
