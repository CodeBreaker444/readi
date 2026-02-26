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
      category_code,
      category_name,
      category_description,
      is_active
    `)
    .eq('fk_owner_id', ownerId)
    .eq('is_active', true)
    .order('category_id', { ascending: true });

  if (error) throw error;
  
  return {
    code: 1,
    message: 'Success',
    dataRows: data?.length || 0,
    data: data?.map(item => ({
      mission_category_id: item.category_id,
      mission_category_code: item.category_code,
      mission_category_name: item.category_name,
      mission_category_desc: item.category_description,
      tot_mission: 0
    })) || []
  };
}

export async function addMissionCategory(ownerId: number, categoryData: { code: string; name: string; description?: string }) {
  const { data: existing } = await supabase
    .from('pilot_mission_category')
    .select('category_code')
    .eq('fk_owner_id', ownerId)
    .eq('category_code', categoryData.code)
    .eq('is_active', true)
    .single();

  if (existing) {
    throw new Error('Category code already exists');
  }

  const { data, error } = await supabase
    .from('pilot_mission_category')
    .insert({
      fk_owner_id: ownerId,
      category_code: categoryData.code,
      category_name: categoryData.name,
      category_description: categoryData.description || categoryData.name,
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

export async function updateMissionCategory(ownerId: number, categoryId: number, categoryData: { code?: string; name?: string; description?: string }) {
  if (categoryData.code) {
    const { data: existing } = await supabase
      .from('pilot_mission_category')
      .select('category_id')
      .eq('category_code', categoryData.code)
      .eq('is_active', true)
      .neq('category_id', categoryId)
      .single();

    if (existing) {
      throw new Error('Category code already exists');
    }
  }

  const updateData: any = {};
  if (categoryData.code) updateData.category_code = categoryData.code;
  if (categoryData.name) updateData.category_name = categoryData.name;
  if (categoryData.description !== undefined) updateData.category_description = categoryData.description;

  const { data, error } = await supabase
    .from('pilot_mission_category')
    .update(updateData)
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