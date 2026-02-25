import { supabase } from "@/backend/database/database";

export interface MissionType {
  mission_type_id: number;
  mission_type_name: string;
  mission_type_desc: string;
  mission_type_code: string;
  mission_type_label: string;
  tot_mission?: number;
  fk_owner_id: number;
}

export async function getMissionTypeList(ownerId: number) {
  
  const { data, error } = await supabase
    .from('pilot_mission_type')
    .select('*')
  .eq('is_active', true);  
  
  if (error) throw error;
  
  return {
    code: 1,
    message: 'Success',
    dataRows: data?.length || 0,
    data: data?.map(item => ({
      id: item.mission_type_id,
      name: item.type_name,
      code: item.type_code,
      label: item.type_description,
      tot_mission: 0
    })) || []
  };
}

export async function addMissionType(ownerId: number, missionType: Omit<MissionType, 'mission_type_id'>) {
  const { data: existing } = await supabase
    .from('pilot_mission_type')
    .select('type_code')
    .eq('fk_owner_id',ownerId)
    .eq('type_code', missionType.mission_type_code)
    .eq('is_active', true)
    .single();

  if (existing) {
    throw new Error('Mission type code already exists');
  }

  const { data, error } = await supabase
    .from('pilot_mission_type')
    .insert({
      type_name: missionType.mission_type_name,
      fk_owner_id: ownerId,
      type_code: missionType.mission_type_code,
      type_description: missionType.mission_type_label,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Mission type added successfully',
    data
  };
}

 

export async function deleteMissionType(ownerId: number, missionTypeId: number) {
  
  const { error } = await supabase
    .from('pilot_mission_type')
    .update({ is_active: false })
    .eq('mission_type_id', missionTypeId);

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Mission type deleted successfully'
  };
}

export async function updateMissionType(ownerId: number, missionTypeId: number, missionType: Partial<MissionType>) {
  if (missionType.mission_type_code) {
    const { data: existing } = await supabase
      .from('pilot_mission_type')
      .select('mission_type_id')
      .eq('type_code', missionType.mission_type_code)
      .eq('is_active', true)
      .neq('mission_type_id', missionTypeId)
      .single();

    if (existing) {
      throw new Error('Mission type code already exists');
    }
  }

  const updateData: any = {};
  if (missionType.mission_type_name) updateData.type_name = missionType.mission_type_name;
  if (missionType.mission_type_code) updateData.type_code = missionType.mission_type_code;
  if (missionType.mission_type_label) updateData.type_description = missionType.mission_type_label;

  const { data, error } = await supabase
    .from('pilot_mission_type')
    .update(updateData)
    .eq('mission_type_id', missionTypeId)
    .select()
    .single();

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Mission type updated successfully',
    data
  };
}