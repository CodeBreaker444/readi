import { supabase } from "@/backend/database/database";
import { EmergencyResponsePlan, ErpCreateInput, ErpListInput } from "@/config/types/erp";

function mapRow(row: Record<string, unknown>): EmergencyResponsePlan {
  return {
    id: row.erp_id as number,
    description: row.description as string,
    contact: row.contact as string,
    type: row.erp_type as EmergencyResponsePlan['type'],
    owner_id: row.fk_owner_id as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function listErp(input: ErpListInput): Promise<EmergencyResponsePlan[]> {
  const { data, error } = await supabase
    .from('emergency_response_plan')
    .select('*')
    .eq('fk_owner_id', input.owner_id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

export async function createErp(input: ErpCreateInput): Promise<EmergencyResponsePlan> {
  const { data, error } = await supabase
    .from('emergency_response_plan')
    .insert({
      description: input.description,
      contact: input.contact,
      erp_type: input.type,
      fk_owner_id: input.owner_id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data)
}
