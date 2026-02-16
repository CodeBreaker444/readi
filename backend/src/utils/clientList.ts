import { supabase } from '../database/database';

export async function getClientsList(ownerId: number) {
  try {
    const { data, error } = await supabase
      .from('client')
      .select('client_id, client_name, client_code')
      .eq('fk_owner_id', ownerId)
      .eq('client_active', 'Y')
      .order('client_name', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      clients: data.map(client => ({
        id: client.client_id,
        name: client.client_name,
        code: client.client_code
      }))
    };
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw new Error('Failed to fetch clients');
  }
}