import { supabase } from "@/backend/database/database";

export interface PilotDeclarationPayload {
  fk_user_id: number;
  fk_tool_id?: number | null;
  declaration_type: string;        
  declaration_data: Record<string, unknown>;
}

export interface PilotDeclaration {
  declaration_id: number;
  fk_user_id: number;
  fk_tool_id: number | null;
  declaration_type: string | null;
  declaration_date: string | null;
  declaration_data: Record<string, unknown> | null;
  checklist_completed: boolean;
  declared_at: string | null;
}

/**
 * Returns true if the pilot has already submitted a declaration today.
 */
export async function checkDailyDeclaration(userId: number): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("pilot_declaration")
    .select("declaration_id")
    .eq("fk_user_id", userId)
    .eq("declaration_date", today)
    .eq("checklist_completed", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check daily declaration: ${error.message}`);
  }

  return data !== null;
}

/**
 * Saves a pilot declaration for today.
 * If one already exists for (user, date, type) it updates it; otherwise inserts a new row.
 */
export async function insertPilotDeclaration(
  payload: PilotDeclarationPayload
): Promise<PilotDeclaration> {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("pilot_declaration")
    .select("declaration_id")
    .eq("fk_user_id", payload.fk_user_id)
    .eq("declaration_date", today)
    .eq("declaration_type", payload.declaration_type)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("pilot_declaration")
      .update({
        fk_tool_id: payload.fk_tool_id ?? null,
        declaration_data: payload.declaration_data,
        checklist_completed: true,
        declared_at: now,
      })
      .eq("declaration_id", existing.declaration_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update pilot declaration: ${error.message}`);
    return data as PilotDeclaration;
  }

  const { data, error } = await supabase
    .from("pilot_declaration")
    .insert({
      fk_user_id: payload.fk_user_id,
      fk_tool_id: payload.fk_tool_id ?? null,
      declaration_type: payload.declaration_type,
      declaration_date: today,
      declaration_data: payload.declaration_data,
      checklist_completed: true,
      declared_at: now,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to insert pilot declaration: ${error.message}`);
  return data as PilotDeclaration;
}

/**
 * Returns all declarations for a pilot, optionally filtered by date.
 */
export async function getPilotDeclarations(
  userId: number,
  date?: string
): Promise<PilotDeclaration[]> {
  let query = supabase
    .from("pilot_declaration")
    .select("*")
    .eq("fk_user_id", userId)
    .order("declared_at", { ascending: false });

  if (date) {
    query = query.eq("declaration_date", date);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch pilot declarations: ${error.message}`);
  }

  return (data ?? []) as PilotDeclaration[];
}
