import { supabase } from "@/backend/database/database";

export async function getLUCProceduresList(ownerId: number, sector?: string) {
  try {
    let query = supabase
      .from('luc_procedure')
      .select('luc_procedure_id, luc_procedure_code, luc_procedure_desc, luc_procedure_ver, luc_procedure_sector')
      .eq('fk_owner_id', ownerId)
      .eq('luc_procedure_active', 'Y');

    if (sector) {
      query = query.eq('luc_procedure_sector', sector);
    }

    const { data, error } = await query.order('luc_procedure_desc', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      procedures: data.map(proc => ({
        id: proc.luc_procedure_id,
        name: proc.luc_procedure_desc,
        code: proc.luc_procedure_code,
        version: proc.luc_procedure_ver,
        sector: proc.luc_procedure_sector
      }))
    };
  } catch (error) {
    console.error('Error fetching LUC procedures:', error);
    throw new Error('Failed to fetch LUC procedures');
  }
}