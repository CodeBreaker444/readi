import { supabase } from "@/backend/database/database";

export interface ChartOverride {
  owner_id: number;
  user_id: number;
  parent_user_id: number | null; // null = direct child of company root
}

/**
 * Fetch saved parent overrides for an owner.
 * Returns [] if the table doesn't exist yet (graceful degradation).
 */
export async function getChartOverrides(ownerId: number): Promise<ChartOverride[]> {
  const { data, error } = await supabase
    .from("org_chart_overrides")
    .select("owner_id, user_id, parent_user_id")
    .eq("owner_id", ownerId);

  if (error) {
    if (error.code === "42P01" || error.message?.includes("relation")) return [];
    throw new Error(`Failed to get chart overrides: ${error.message}`);
  }
  return (data ?? []) as ChartOverride[];
}

export async function upsertChartOverride(override: ChartOverride): Promise<void> {
  const { error } = await supabase
    .from("org_chart_overrides")
    .upsert(
      { ...override, updated_at: new Date().toISOString() },
      { onConflict: "owner_id,user_id" }
    );

  if (error) throw new Error(`Failed to save chart override: ${error.message}`);
}

export async function updateUserPosition(
  ownerId: number,
  userId: number,
  position: string
): Promise<void> {
  const { error } = await supabase
    .from("user_owner")
    .update({ role_in_organization: position })
    .eq("fk_owner_id", ownerId)
    .eq("fk_user_id", userId);

  if (error) throw new Error(`Failed to update position: ${error.message}`);
}
