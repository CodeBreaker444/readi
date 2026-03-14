import { supabase } from '@/backend/database/database';

/**
 *
 * Call BEFORE any read/write on tool_component to update maintenance days.
 *
 */
export async function refreshMaintenanceDays(toolIds: number[]): Promise<void> {
  if (toolIds.length === 0) return;
 
  const { data: components, error } = await supabase
    .from('tool_component')
    .select('component_id, maintenance_cycle, last_cycle_updated_at, current_maintenance_days, maintenance_cycle_day')
    .in('fk_tool_id', toolIds)
    .eq('component_active', 'Y')
    .in('maintenance_cycle', ['DAYS', 'MIXED'])
    .not('last_cycle_updated_at', 'is', null)
    .not('maintenance_cycle_day', 'is', null)
    .gt('maintenance_cycle_day', 0);
 
  if (error || !components || components.length === 0) return;
 
  const today = new Date();
  today.setHours(0, 0, 0, 0);
 
  const updates: { id: number; days: number }[] = [];
 
  for (const comp of components) {
    const limit = Number(comp.maintenance_cycle_day);
    const current = Number(comp.current_maintenance_days ?? 0);
 
    if (current >= limit) continue;
 
    const lastStamp = new Date(comp.last_cycle_updated_at);
    lastStamp.setHours(0, 0, 0, 0);
 
    const daysPassed = Math.floor((today.getTime() - lastStamp.getTime()) / 86_400_000);
 
    if (daysPassed <= 0) continue;
 
    const newValue = Math.min(current + daysPassed, limit);
 
    updates.push({ id: comp.component_id, days: newValue });
  }
 
  for (const upd of updates) {
    await supabase
      .from('tool_component')
      .update({
        current_maintenance_days: upd.days,
        last_cycle_updated_at: today.toISOString(),
      })
      .eq('component_id', upd.id);
  }
}
 
export async function refreshMaintenanceDaysForTool(toolId: number): Promise<void> {
  return refreshMaintenanceDays([toolId]);
}
 
export async function refreshMaintenanceDaysForOwner(ownerId: number): Promise<void> {
  const { data: tools } = await supabase
    .from('tool')
    .select('tool_id')
    .eq('fk_owner_id', ownerId)
    .eq('tool_active', 'Y');
 
  if (!tools || tools.length === 0) return;
  return refreshMaintenanceDays(tools.map((t) => t.tool_id));
}