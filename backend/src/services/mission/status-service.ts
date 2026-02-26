import { supabase } from '@/backend/database/database';


export async function getMissionStatusList(ownerId: number) {
  const { data, error } = await supabase
    .from('pilot_mission_status')
    .select(`
      status_id,
      status_code,
      status_name,
      status_description,
      status_order,
      is_final_status,
      is_active
    `)
    .eq('fk_owner_id',ownerId)
    .eq('is_active', true)
    .order('status_order', { ascending: true });

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Success',
    dataRows: data?.length || 0,
    data: data?.map(item => ({
      mission_status_id: item.status_id,
      mission_status_code: item.status_code,
      mission_status_name: item.status_name,
      mission_status_desc: item.status_description,
      status_order: item.status_order,
      is_final_status: item.is_final_status,
      tot_mission: 0
    })) || []
  };
}

export async function addMissionStatus(ownerId: number, statusData: {
  code: string;
  name: string;
  description?: string;
  order?: number;
  isFinalStatus?: boolean;
}) {
  const { data: existing } = await supabase
    .from('pilot_mission_status')
    .select('status_code')
    .eq('status_code', statusData.code)
    .eq('is_active', true)
    .single();

  if (existing) {
    throw new Error('Status code already exists');
  }

  const { data, error } = await supabase
    .from('pilot_mission_status')
    .insert({
      status_code: statusData.code,
      status_name: statusData.name,
      status_description: statusData.description || statusData.name,
      status_order: statusData.order || 0,
      is_final_status: statusData.isFinalStatus || false,
      fk_owner_id:ownerId,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Mission status added successfully',
    data
  };
}

export async function deleteMissionStatus(ownerId: number, statusId: number) {
  // Soft delete
  const { error } = await supabase
    .from('pilot_mission_status')
    .update({ is_active: false })
    .eq('status_id', statusId);

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Mission status deleted successfully'
  };
}

export async function updateMissionStatus(ownerId: number, statusId: number, statusData: {
  code?: string;
  name?: string;
  description?: string;
  order?: number;
  isFinalStatus?: boolean;
}) {
  // Checking conflicts 
  if (statusData.code) {
    const { data: existing } = await supabase
      .from('pilot_mission_status')
      .select('status_id')
      .eq('status_code', statusData.code)
      .eq('is_active', true)
      .neq('status_id', statusId)
      .single();

    if (existing) {
      throw new Error('Status code already exists');
    }
  }

  const updateData: any = {};
  if (statusData.code) updateData.status_code = statusData.code;
  if (statusData.name) updateData.status_name = statusData.name;
  if (statusData.description !== undefined) updateData.status_description = statusData.description;
  if (statusData.order !== undefined) updateData.status_order = statusData.order;
  if (statusData.isFinalStatus !== undefined) updateData.is_final_status = statusData.isFinalStatus;

  const { data, error } = await supabase
    .from('pilot_mission_status')
    .update(updateData)
    .eq('status_id', statusId)
    .select()
    .single();

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Mission status updated successfully',
    data
  };
}