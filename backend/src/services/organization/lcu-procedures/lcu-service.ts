import { supabase } from '@/backend/database/database';
import type {
    CreateLucProcedurePayload,
    LucProcedure,
    UpdateLucProcedurePayload,
} from '@/config/types/lcuProcedures';

export async function getLucProcedures(
  ownerId: number,
  sector?: string
): Promise<LucProcedure[]> {
  let query = supabase
    .from('luc_procedure')
    .select('*')
    .eq('fk_owner_id', ownerId)
    .order('procedure_id', { ascending: true });

  if (sector) {
    query = query.eq('procedure_status', sector);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch LUC procedures: ${error.message}`);
  return data ?? [];
}

export async function getLucProcedureById(
  procedureId: number
): Promise<LucProcedure | null> {
  const { data, error } = await supabase
    .from('luc_procedure')
    .select('*')
    .eq('procedure_id', procedureId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch LUC procedure: ${error.message}`);
  }
  return data;
}

export async function createLucProcedure(
  payload: CreateLucProcedurePayload
): Promise<LucProcedure> {
  const { data, error } = await supabase
    .from('luc_procedure')
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(`Failed to create LUC procedure: ${error.message}`);
  return data;
}

export async function updateLucProcedure(
  payload: UpdateLucProcedurePayload
): Promise<LucProcedure> {
  const { procedure_id, ...fields } = payload;

  const { data, error } = await supabase
    .from('luc_procedure')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('procedure_id', procedure_id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update LUC procedure: ${error.message}`);
  return data;
}

export async function deleteLucProcedure(procedureId: number): Promise<boolean> {
  const { error } = await supabase
    .from('luc_procedure')
    .delete()
    .eq('procedure_id', procedureId);

  if (error) throw new Error(`Failed to delete LUC procedure: ${error.message}`);
  return true;
}

export async function deactivateLucProcedure(procedureId: number): Promise<LucProcedure> {
  const { data, error } = await supabase
    .from('luc_procedure')
    .update({ procedure_active: 'N', updated_at: new Date().toISOString() })
    .eq('procedure_id', procedureId)
    .select()
    .single();

  if (error) throw new Error(`Failed to deactivate LUC procedure: ${error.message}`);
  return data;
}