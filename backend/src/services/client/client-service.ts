import { supabase } from "@/backend/database/database";

export interface ClientData {
  client_id: number;
  fk_owner_id: number;
  client_code?: string;
  client_name: string;
  client_legal_name?: string;
  client_address?: string;
  client_city?: string;
  client_state?: string;
  client_postal_code?: string;
  client_phone?: string;
  client_email?: string;
  client_website?: string;
  client_active: string;
  contract_start_date?: string;
  contract_end_date?: string;
  payment_terms?: string;
  credit_limit?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateClientInput {
  fk_owner_id: number;
  client_code?: string;
  client_name: string;
  client_legal_name?: string;
  client_address?: string;
  client_city?: string;
  client_state?: string;
  client_postal_code?: string;
  client_phone?: string;
  client_email?: string;
  client_website?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  payment_terms?: string;
  credit_limit?: number;
}

export interface UpdateClientInput extends Partial<CreateClientInput> {
  client_id: number;
  client_active?: string;
}

export async function listClients(owner_id?: number): Promise<{ code: number; data?: ClientData[]; error?: string }> {
  try {
    let query = supabase.from('client').select('*').order('created_at', { ascending: false });
    if (owner_id) query = query.eq('fk_owner_id', owner_id);

    const { data, error } = await query;
    if (error) return { code: 0, error: error.message };
    return { code: 1, data: data as ClientData[] };
  } catch (e: any) {
    return { code: 0, error: e.message };
  }
}

export async function addClient(input: CreateClientInput): Promise<{ code: number; data?: ClientData; error?: string }> {
  try {
    if (input.client_code) {
      const { data: existing } = await supabase
        .from('client')
        .select('client_id')
        .eq('fk_owner_id', input.fk_owner_id)
        .eq('client_code', input.client_code)
        .maybeSingle();
      if (existing) return { code: 0, error: 'A client with this code already exists' };
    }

    if (input.client_email) {
      const { data: existing } = await supabase
        .from('client')
        .select('client_id')
        .eq('fk_owner_id', input.fk_owner_id)
        .ilike('client_email', input.client_email)
        .maybeSingle();
      if (existing) return { code: 0, error: 'A client with this email already exists' };
    }

    if (input.client_phone) {
      const { data: existing } = await supabase
        .from('client')
        .select('client_id')
        .eq('fk_owner_id', input.fk_owner_id)
        .eq('client_phone', input.client_phone)
        .maybeSingle();
      if (existing) return { code: 0, error: 'A client with this phone number already exists' };
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = value === '' ? null : value;
    }

    const { data, error } = await supabase
      .from('client')
      .insert({ ...sanitized, client_active: 'Y' })
      .select()
      .single();

    if (error) return { code: 0, error: error.message };
    return { code: 1, data: data as ClientData };
  } catch (e: any) {
    return { code: 0, error: e.message };
  }
}

export async function updateClient(input: UpdateClientInput): Promise<{ code: number; data?: ClientData; error?: string }> {
  try {
    const { client_id, ...updateFields } = input;
    const { data, error } = await supabase
      .from('client')
      .update({ ...updateFields, updated_at: new Date().toISOString() })
      .eq('client_id', client_id)
      .select()
      .single();

    if (error) return { code: 0, error: error.message };
    return { code: 1, data: data as ClientData };
  } catch (e: any) {
    return { code: 0, error: e.message };
  }
}

export async function deleteClient(client_id: number): Promise<{ code: number; error?: string }> {
  try {
    const { error } = await supabase.from('client').delete().eq('client_id', client_id);
    if (error) return { code: 0, error: error.message };
    return { code: 1 };
  } catch (e: any) {
    return { code: 0, error: e.message };
  }
}

export async function getClientById(client_id: number): Promise<{ code: number; data?: ClientData; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('client')
      .select('*')
      .eq('client_id', client_id)
      .single();

    if (error) return { code: 0, error: error.message };
    return { code: 1, data: data as ClientData };
  } catch (e: any) {
    return { code: 0, error: e.message };
  }
}