import { supabase } from '@/backend/database/database';

export interface MissionResultType {
  result_type_id: number;
  result_type_code: string;
  result_type_desc: string;
  fk_owner_id: number;
  is_active: boolean;
}

export async function getMissionResultList(ownerId: number) {
  const { data, error } = await supabase
    .from('pilot_mission_result_type')
    .select('*')
    .eq('fk_owner_id', ownerId)
    .eq('is_active', true)
    .order('result_type_id', { ascending: true });

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Success',
    dataRows: data?.length || 0,
    data: data?.map(item => ({
      mission_result_id: item.result_type_id,
      mission_result_code: item.result_type_code,
      mission_result_desc: item.result_type_desc || '',
      tot_mission: 0  
    })) || []
  };
}

export async function addMissionResult(ownerId: number, resultData: {
  code: string;
  description: string;
}) {
  const { data: existing } = await supabase
    .from('pilot_mission_result_type')
    .select('result_type_code')
    .eq('fk_owner_id', ownerId)
    .eq('result_type_code', resultData.code)
    .eq('is_active', true)
    .single();

  if (existing) {
    throw new Error('Result code already exists');
  }

  const { data, error } = await supabase
    .from('pilot_mission_result_type')
    .insert({
      fk_owner_id: ownerId,
      result_type_code: resultData.code,
      result_type_desc: resultData.description,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Mission result added successfully',
    data: {
      result_id: data.result_type_id,
      result_type: data.result_type_code,
      result_description: data.result_type_desc
    }
  };
}

export async function deleteMissionResult(ownerId: number, resultId: number) {
  // Soft delete
  const { error } = await supabase
    .from('pilot_mission_result_type')
    .update({ is_active: false })
    .eq('result_type_id', resultId)
    .eq('fk_owner_id', ownerId);

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Mission result deleted successfully'
  };
}

export async function updateMissionResult(ownerId: number, resultId: number, resultData: {
  code?: string;
  description?: string;
}) {
  // Checking conflicts
  if (resultData.code) {
    const { data: existing } = await supabase
      .from('pilot_mission_result_type')
      .select('result_type_id')
      .eq('fk_owner_id', ownerId)
      .eq('result_type_code', resultData.code)
      .eq('is_active', true)
      .neq('result_type_id', resultId)
      .single();

    if (existing) {
      throw new Error('Result code already exists');
    }
  }

  const updateData: any = {};
  if (resultData.code) updateData.result_type_code = resultData.code;
  if (resultData.description !== undefined) updateData.result_type_desc = resultData.description;

  const { data, error } = await supabase
    .from('pilot_mission_result_type')
    .update(updateData)
    .eq('result_type_id', resultId)
    .eq('fk_owner_id', ownerId)
    .select()
    .single();

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Mission result updated successfully',
    data: {
      result_id: data.result_type_id,
      result_type: data.result_type_code,
      result_description: data.result_type_desc
    }
  };
}