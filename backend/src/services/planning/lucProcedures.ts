import { supabase } from '../../database/database';

export async function getLUCProceduresList(ownerId: number, sector?: string) {
  try {
    console.log('Fetching LUC procedures for owner:', ownerId, 'sector:', sector);
    
    let query = supabase
      .from('luc_procedure')
      .select(`
        procedure_id,
        procedure_code,
        procedure_name,
        procedure_description,
        procedure_version,
        procedure_status,
        procedure_steps,
        effective_date,
        procedure_active
      `)
      .eq('fk_owner_id', ownerId)
      .eq('procedure_active', 'Y');

    if (sector) {
      query = query.eq('procedure_status', sector);
    }

    const { data, error } = await query.order('procedure_name', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Fetched procedures:', data?.length || 0);

    return {
      success: true,
      procedures: data.map(proc => ({
        id: proc.procedure_id,
        name: proc.procedure_name,
        code: proc.procedure_code,
        description: proc.procedure_description,
        version: proc.procedure_version,
        status: proc.procedure_status,
        steps: proc.procedure_steps
      }))
    };
  } catch (error) {
    console.error('Error fetching LUC procedures:', error);
    throw new Error('Failed to fetch LUC procedures');
  }
}

export async function getLUCProcedureById(procedureId: number) {
  try {
    const { data, error } = await supabase
      .from('luc_procedure')
      .select('*')
      .eq('procedure_id', procedureId)
      .single();

    if (error) throw error;

    return {
      success: true,
      procedure: {
        id: data.procedure_id,
        name: data.procedure_name,
        code: data.procedure_code,
        description: data.procedure_description,
        version: data.procedure_version,
        status: data.procedure_status,
        steps: data.procedure_steps,
        effectiveDate: data.effective_date,
        reviewDate: data.review_date,
        active: data.procedure_active
      }
    };
  } catch (error) {
    console.error('Error fetching LUC procedure:', error);
    throw new Error('Failed to fetch LUC procedure');
  }
}