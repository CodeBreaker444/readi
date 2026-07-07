import { env } from "@/backend/config/env";
import { supabase } from "@/backend/database/database";
import { prisma } from "@/lib/prisma";
import bcrypt from 'bcryptjs';
import { sendAdminPasswordChangedEmail, sendUserActivationEmail } from '../../../../lib/resend/mail';

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
  user_id?: number;
  user_active?: string;
  is_pending?: boolean;
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
  password?: string;
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
    const rows = await prisma.client.findMany({
      where: {
        client_active: 'Y',
        ...(owner_id ? { fk_owner_id: owner_id } : {}),
      },
      include: {
        owner: { select: { owner_code: true, owner_name: true } },
        users: {
          where: { user_role: 'CLIENT' },
          select: { user_id: true, user_active: true, auth_user_id: true, key_: true },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const formatted = rows.map((c) => {
      const loginUser = c.users?.[0];
      return {
        ...c,
        owner_code: c.owner?.owner_code || '',
        owner_name: c.owner?.owner_name || '',
        owner: undefined,
        users: undefined,
        user_id: loginUser?.user_id,
        user_active: loginUser?.user_active ?? undefined,
        is_pending: loginUser ? loginUser.user_active !== 'Y' : false,
        contract_start_date: c.contract_start_date?.toISOString().slice(0, 10),
        contract_end_date: c.contract_end_date?.toISOString().slice(0, 10),
        credit_limit: c.credit_limit ? Number(c.credit_limit) : undefined,
        created_at: c.created_at?.toISOString(),
        updated_at: c.updated_at?.toISOString(),
      };
    });

    return { code: 1, data: formatted as unknown as ClientData[] };
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

  const [clientRows, takenInUsers] = await Promise.all([
    prisma.client.findMany({
      where: {
        fk_owner_id: owner_id,
        username: { not: null, startsWith: prefix, mode: 'insensitive' },
      },
      select: { username: true },
      take: 10,
    }),
    prisma.public_users.findFirst({
      where: { username: { equals: prefix, mode: 'insensitive' } },
      select: { user_id: true },
    }),
  ]);

  const similar = clientRows.map((r) => r.username as string).filter(Boolean);
  const available = !takenInUsers && !similar.some((u) => u.toLowerCase() === prefix);
  return { available, similar };
}

export async function addClient(input: CreateClientInput): Promise<{ code: number; data?: ClientData; temp_password?: string; error?: string }> {
  try {
    const { username, password, ...clientFields } = input;
    const temp_password = password?.trim() ||
      Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map((b) => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62])
        .join('');
    const activationKey = crypto.randomUUID().replace(/-/g, '');

    if (clientFields.client_code) {
      const existing = await prisma.client.findFirst({
        where: { fk_owner_id: clientFields.fk_owner_id, client_code: clientFields.client_code },
        select: { client_id: true },
      });
      if (existing) return { code: 0, error: 'A client with this code already exists' };
    }

    if (clientFields.client_email) {
      const existing = await prisma.client.findFirst({
        where: {
          fk_owner_id: clientFields.fk_owner_id,
          client_email: { equals: clientFields.client_email, mode: 'insensitive' },
        },
        select: { client_id: true },
      });
      if (existing) return { code: 0, error: 'A client with this email already exists' };
    }

    if (clientFields.client_phone) {
      const existing = await prisma.client.findFirst({
        where: { fk_owner_id: clientFields.fk_owner_id, client_phone: clientFields.client_phone },
        select: { client_id: true },
      });
      if (existing) return { code: 0, error: 'A client with this phone number already exists' };
    }

    const { available } = await checkClientUsername(clientFields.fk_owner_id, username);
    if (!available) return { code: 0, error: 'Username is already taken' };

    const existingUser = await prisma.public_users.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { user_id: true },
    });
    if (existingUser) return { code: 0, error: 'Username is already taken' };

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(clientFields)) {
      sanitized[key] = value === '' ? null : value;
    }

    const clientRow = await prisma.client.create({
      data: {
        ...sanitized,
        username,
        client_active: 'Y',
        contract_start_date: sanitized.contract_start_date ? new Date(sanitized.contract_start_date) : null,
        contract_end_date: sanitized.contract_end_date ? new Date(sanitized.contract_end_date) : null,
      } as any,
    });

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
      await prisma.client.delete({ where: { client_id: clientRow.client_id } });
      return { code: 0, error: authError?.message ?? 'Failed to create auth user' };
    }

    const passwordHash = await bcrypt.hash(temp_password, 10);

    try {
      await prisma.public_users.create({
        data: {
          auth_user_id: authData.user.id,
          fk_owner_id: clientFields.fk_owner_id,
          fk_client_id: clientRow.client_id,
          username,
          email,
          first_name: firstName,
          last_name: lastName,
          user_role: 'CLIENT',
          password_hash: passwordHash,
          phone: clientFields.client_phone,
          user_active: 'N',
          key_: activationKey,
        },
      });
    } catch (userError: any) {
      await prisma.client.delete({ where: { client_id: clientRow.client_id } });
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => { });
      return { code: 0, error: userError.message };
    }

    const appUrl = env.APP_URL;
    const activationLink = `${appUrl}/auth/activate?o=${clientFields.fk_owner_id}&email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}&id=${activationKey}`;
    sendUserActivationEmail(clientFields.client_email, clientFields.client_name, {
      organization: 'ReADI',
      username,
      passcode: temp_password,
      loginlink: activationLink,
    }).catch(() => { });

    return { code: 1, data: clientRow as unknown as ClientData, temp_password };
  } catch (e: any) {
    return { code: 0, error: e.message };
  }
}

export async function updateClient(input: UpdateClientInput): Promise<{ code: number; data?: ClientData; error?: string }> {
  try {
    const { client_id, contract_start_date, contract_end_date, ...rest } = input;

    const data: any = { ...rest, updated_at: new Date() };
    if (contract_start_date !== undefined) data.contract_start_date = contract_start_date ? new Date(contract_start_date) : null;
    if (contract_end_date !== undefined) data.contract_end_date = contract_end_date ? new Date(contract_end_date) : null;

    const updated = await prisma.client.update({ where: { client_id }, data });
    return { code: 1, data: updated as unknown as ClientData };
  } catch (e: any) {
    return { code: 0, error: e.message };
  }
}

export async function updateClientPassword(
  client_id: number,
  ownerId: number,
  newPassword: string,
  isSuperAdmin = false,
): Promise<{ code: number; message?: string; error?: string }> {
  try {
    const loginUser = await prisma.public_users.findFirst({
      where: {
        fk_client_id: client_id,
        user_role: 'CLIENT',
        ...(!isSuperAdmin ? { fk_owner_id: ownerId } : {}),
      },
      select: {
        user_id: true, email: true, username: true, first_name: true, last_name: true,
        user_active: true, auth_user_id: true, fk_owner_id: true,
      },
    });

    if (!loginUser) return { code: 0, error: 'Client account not found' };
    if (loginUser.user_active === 'Y') return { code: 0, error: 'Client is already activated' };

    if (loginUser.auth_user_id) {
      const { error: authError } = await supabase.auth.admin.updateUserById(loginUser.auth_user_id, { password: newPassword });
      if (authError) return { code: 0, error: authError.message };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.public_users.update({
      where: { user_id: loginUser.user_id },
      data: { password_hash: passwordHash, updated_at: new Date() },
    });

    const owner = await prisma.owner.findUnique({ where: { owner_id: loginUser.fk_owner_id! }, select: { owner_name: true } });
    const fullname = [loginUser.first_name, loginUser.last_name].filter(Boolean).join(' ') || loginUser.username || '';
    await sendAdminPasswordChangedEmail(loginUser.email ?? '', fullname, loginUser.username ?? '', newPassword, owner?.owner_name ?? 'ReADI');

    return { code: 1, message: 'Password updated successfully' };
  } catch (e: any) {
    return { code: 0, error: e.message };
  }
}

export async function deleteClient(client_id: number): Promise<{ code: number; clientName?: string | null; clientCode?: string | null; error?: string }> {
  try {
    const { data: clientRow } = await supabase.from('client').select('client_name, client_code').eq('client_id', client_id).maybeSingle();
    const { error } = await supabase.from('client').delete().eq('client_id', client_id);
    if (error) return { code: 0, error: error.message };
    return { code: 1, clientName: clientRow?.client_name ?? null, clientCode: clientRow?.client_code ?? null };
  } catch (e: any) {
    return { code: 0, error: e.message };
  }
}

export async function getClientById(client_id: number): Promise<{ code: number; data?: ClientData; error?: string }> {
  try {
    const row = await prisma.client.findUnique({ where: { client_id } });
    if (!row) return { code: 0, error: 'Client not found' };
    return { code: 1, data: row as unknown as ClientData };
  } catch (e: any) {
    return { code: 0, error: e.message };
  }
}
