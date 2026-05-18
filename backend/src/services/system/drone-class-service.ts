'use server';

import { supabase } from '@/backend/database/database';

export interface DroneClassRow {
  class_id: number;
  class_value: string;
  class_label: string;
}

const DEFAULT_CLASSES = [
  { class_value: 'C0', class_label: 'Class C0 (< 250 g)' },
  { class_value: 'C1', class_label: 'Class C1 (< 900 g)' },
  { class_value: 'C2', class_label: 'Class C2 (< 4 kg)' },
  { class_value: 'C3', class_label: 'Class C3 (< 25 kg)' },
  { class_value: 'C4', class_label: 'Class C4 (≥ 25 kg)' },
  { class_value: 'C5', class_label: 'Class C5 (STS-01)' },
  { class_value: 'C6', class_label: 'Class C6 (STS-02)' },
];

export async function getDroneClasses(ownerId: number): Promise<DroneClassRow[]> {
  const { data, error } = await supabase
    .from('drone_class_config')
    .select('class_id, class_value, class_label')
    .eq('fk_owner_id', ownerId)
    .order('class_label', { ascending: true });

  if (error) {
    // Table may not exist yet — return defaults
    return DEFAULT_CLASSES.map((c, i) => ({ class_id: i + 1, ...c }));
  }

  if (!data || data.length === 0) {
    try {
      const rows = DEFAULT_CLASSES.map(c => ({ ...c, fk_owner_id: ownerId }));
      const { data: seeded, error: seedErr } = await supabase
        .from('drone_class_config')
        .insert(rows)
        .select('class_id, class_value, class_label');
      if (seedErr) return DEFAULT_CLASSES.map((c, i) => ({ class_id: i + 1, ...c }));
      return seeded ?? [];
    } catch {
      return DEFAULT_CLASSES.map((c, i) => ({ class_id: i + 1, ...c }));
    }
  }

  return data;
}

export async function createDroneClass(
  ownerId: number,
  classValue: string,
  classLabel: string,
): Promise<DroneClassRow> {
  const normalized = classValue.trim().toUpperCase();

  const { data: existing } = await supabase
    .from('drone_class_config')
    .select('class_id')
    .eq('fk_owner_id', ownerId)
    .eq('class_value', normalized)
    .maybeSingle();

  if (existing) throw new Error('A drone class with this value already exists.');

  const { data, error } = await supabase
    .from('drone_class_config')
    .insert({ class_value: normalized, class_label: classLabel.trim(), fk_owner_id: ownerId })
    .select('class_id, class_value, class_label')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateDroneClass(
  ownerId: number,
  classId: number,
  classLabel: string,
): Promise<void> {
  const { error } = await supabase
    .from('drone_class_config')
    .update({ class_label: classLabel.trim() })
    .eq('class_id', classId)
    .eq('fk_owner_id', ownerId);
  if (error) throw new Error(error.message);
}

export async function deleteDroneClass(ownerId: number, classId: number): Promise<void> {
  const { error } = await supabase
    .from('drone_class_config')
    .delete()
    .eq('class_id', classId)
    .eq('fk_owner_id', ownerId);
  if (error) throw new Error(error.message);
}
