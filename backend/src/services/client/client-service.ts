import { supabase } from "@/backend/database/database";
import bcrypt from 'bcryptjs';
import { sendUserActivationEmail } from '../../../../lib/resend/mail';

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
  username?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  payment_terms?: string;
  credit_limit?: number;
  created_at?: string;
  updated_at?: string;
  owner_code?: string;
  owner_name?: string;
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
  client_email: string;
  client_website?: string;
  username: string;
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
    let query = supabase
      .from('client')
      .select('*, owner(owner_code, owner_name)')
      .order('created_at', { ascending: false });
    if (owner_id) query = query.eq('fk_owner_id', owner_id);

    const { data, error } = await query;
    if (error) return { code: 0, error: error.message };

    const formatted = (data as any[]).map((c) => ({
      ...c,
      owner_code: c.owner?.owner_code || '',
      owner_name: c.owner?.owner_name || '',
      owner: undefined,
    }));

    return { code: 1, data: formatted as ClientData[] };
  } catch (e: any) {
    return { code: 0, error: e.message };
  }
}

export async function checkClientUsername(
  owner_id: number,
  username: string,
): Promise<{ available: boolean; similar: string[] }> {
  if (!username || username.length < 1) return { available: true, similar: [] };
  const prefix = username.toLowerCase();
  const { data } = await supabase
    .from('client')
    .select('username')
    .eq('fk_owner_id', owner_id)
    .not('username', 'is', null)
    .ilike('username', `${prefix}%`)
    .limit(10);

  const similar = (data ?? []).map((r: any) => r.username as string).filter(Boolean);
  const available = !similar.some((u) => u.toLowerCase() === prefix);
  return { available, similar };
}

export async function addClient(input: CreateClientInput): Promise<{ code: number; data?: ClientData; error?: string }> {
  try {
    const { username, ...clientFields } = input;
    const temp_password = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62])
      .join('');

    if (clientFields.client_code) {
      const { data: existing } = await supabase
        .from('client')
        .select('client_id')
        .eq('fk_owner_id', clientFields.fk_owner_id)
        .eq('client_code', clientFields.client_code)
        .maybeSingle();
      if (existing) return { code: 0, error: 'A client with this code already exists' };
    }

    if (clientFields.client_email) {
      const { data: existing } = await supabase
        .from('client')
        .select('client_id')
        .eq('fk_owner_id', clientFields.fk_owner_id)
        .ilike('client_email', clientFields.client_email)
        .maybeSingle();
      if (existing) return { code: 0, error: 'A client with this email already exists' };
    }

    if (clientFields.client_phone) {
      const { data: existing } = await supabase
        .from('client')
        .select('client_id')
        .eq('fk_owner_id', clientFields.fk_owner_id)
        .eq('client_phone', clientFields.client_phone)
        .maybeSingle();
      if (existing) return { code: 0, error: 'A client with this phone number already exists' };
    }

    const { available } = await checkClientUsername(clientFields.fk_owner_id, username);
    if (!available) return { code: 0, error: 'Username is already taken' };

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(clientFields)) {
      sanitized[key] = value === '' ? null : value;
    }

    const { data: clientRow, error: clientError } = await supabase
      .from('client')
      .insert({ ...sanitized, username, client_active: 'Y' })
      .select()
      .single();

    if (clientError) return { code: 0, error: clientError.message };

    const email = clientFields.client_email.toLowerCase().trim();
    const nameParts = (clientFields.client_name ?? '').trim().split(/\s+/);
    const firstName = nameParts[0] ?? clientFields.client_name;
    const lastName = nameParts.slice(1).join(' ') || null;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: temp_password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName ?? '', role: 'CLIENT' },
    });

    if (authError || !authData?.user) {
      await supabase.from('client').delete().eq('client_id', clientRow.client_id);
      return { code: 0, error: authError?.message ?? 'Failed to create auth user' };
    }

    const passwordHash = await bcrypt.hash(temp_password, 10);

    const { error: userError } = await supabase
      .from('users')
      .update({
        fk_owner_id: clientFields.fk_owner_id,
        fk_client_id: clientRow.client_id,
        username,
        password_hash: passwordHash,
      })
      .eq('auth_user_id', authData.user.id);

    if (userError) {
      await supabase.from('client').delete().eq('client_id', clientRow.client_id);
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
      return { code: 0, error: userError.message };
    }
    // user_settings already seeded by initialize_user_settings() in the trigger

    // Send invitation email (best-effort — don't fail the whole request if email fails)
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/login`;
    sendUserActivationEmail(clientFields.client_email, clientFields.client_name, {
      organization: 'ReADI',
      username,
      passcode: temp_password,
      loginlink: loginUrl,
    }).catch(() => {});

    return { code: 1, data: clientRow as ClientData };
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