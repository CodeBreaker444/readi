import 'server-only';
import { prisma } from '@/lib/prisma';
import { encryptToken, decryptToken } from '@/backend/utils/token-encryption';

export interface DFlightIntegration {
  id: number;
  fk_owner_id: number;
  base_url: string;
  username: string;
  password: string | null;
  client_id: string;
  easa_operator_code: string | null;
  pfx_content: string | null;
  pfx_password: string | null;
  created_at: string;
  updated_at: string;
}

export async function getDFlightIntegration(ownerId: number): Promise<DFlightIntegration | null> {
  const row = await prisma.d_flight_integrations.findUnique({
    where: { fk_owner_id: ownerId },
  });

  if (!row) return null;
  return {
    id: row.id,
    fk_owner_id: row.fk_owner_id,
    base_url: row.base_url,
    username: row.username,
    password: row.password,
    client_id: row.client_id,
    easa_operator_code: row.easa_operator_code ?? null,
    pfx_content: row.pfx_content ?? null,
    pfx_password: row.pfx_password ? decryptToken(row.pfx_password) : null,
    created_at: row.created_at?.toISOString() ?? '',
    updated_at: row.updated_at?.toISOString() ?? '',
  };
}

export async function upsertDFlightIntegration(
  ownerId: number,
  data: {
    base_url: string;
    username: string;
    password?: string | null;
    client_id: string;
    easa_operator_code?: string | null;
    pfx_content?: string | null;
    pfx_password?: string | null;
  },
): Promise<void> {
  const encryptedPfxPassword = data.pfx_password ? encryptToken(data.pfx_password) : null;

  const createData: any = {
    fk_owner_id: ownerId,
    base_url: data.base_url,
    username: data.username,
    password: data.password || '', // Use empty string instead of null since password is required in schema
    client_id: data.client_id,
    easa_operator_code: data.easa_operator_code ?? null,
    pfx_content: data.pfx_content ?? null,
    pfx_password: encryptedPfxPassword ?? null,
  };

  const updateData: any = {
    base_url: data.base_url,
    username: data.username,
    client_id: data.client_id,
    easa_operator_code: data.easa_operator_code ?? null,
    pfx_content: data.pfx_content ?? undefined,
    pfx_password: encryptedPfxPassword ?? undefined,
    updated_at: new Date(),
  };

  // Only include password in update if it's being changed (not empty or __KEEP__)
  if (data.password && data.password !== '__KEEP__') {
    updateData.password = data.password;
  }

  await prisma.$transaction([
    prisma.d_flight_integrations.upsert({
      where: { fk_owner_id: ownerId },
      update: updateData,
      create: createData,
    }),
    prisma.owner.update({
      where: { owner_id: ownerId },
      data: { easa_operator_code: data.easa_operator_code ?? null },
    }),
  ]);
}
