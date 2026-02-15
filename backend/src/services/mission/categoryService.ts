import { supabase } from '@/backend/database/database';

export interface MissionCategory {
  mission_category_id: number;
  mission_category_desc: string;
  tot_mission?: number;
  fk_owner_id: number;
}

export async function getMissionCategoryList(ownerId: number) {
  
  const { data, error } = await supabase
    .from('pilot_mission_category')
    .select(`
      category_id,
      category_name,
      category_description,
      is_active
    `)
    .eq('is_active', true)
    .order('category_id', { ascending: true });

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Success',
    dataRows: data?.length || 0,
    data: data?.map(item => ({
      mission_category_id: item.category_id,
      mission_category_desc: item.category_name || item.category_description,
      tot_mission: 0
    })) || []
  };
}

export async function addMissionCategory(ownerId: number, description: string) {
  
  const { data, error } = await supabase
    .from('pilot_mission_category')
    .insert({
      category_name: description,
      category_description: description,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Mission category added successfully',
    data
  };
}

export async function deleteMissionCategory(ownerId: number, categoryId: number) {
  
  // Soft delete
  const { error } = await supabase
    .from('pilot_mission_category')
    .update({ is_active: false })
    .eq('category_id', categoryId);

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Mission category deleted successfully'
  };
}

export async function updateMissionCategory(ownerId: number, categoryId: number, description: string) {
  
  const { data, error } = await supabase
    .from('pilot_mission_category')
    .update({
      category_name: description,
      category_description: description
    })
    .eq('category_id', categoryId)
    .select()
    .single();

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Mission category updated successfully',
    data
  };
}