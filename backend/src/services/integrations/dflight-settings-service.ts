import 'server-only';
import { prisma } from '@/lib/prisma';
import { encryptToken, decryptToken } from '@/backend/utils/token-encryption';

export interface DFlightIntegration {
  id: number;
  fk_owner_id: number;
  base_url: string;
  username: string;
  password: string;
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
    password: string;
    client_id: string;
    easa_operator_code?: string | null;
    pfx_content?: string | null;
    pfx_password?: string | null;
  },
): Promise<void> {
  const encryptedPfxPassword = data.pfx_password ? encryptToken(data.pfx_password) : null;

  await prisma.$transaction([
    prisma.d_flight_integrations.upsert({
      where: { fk_owner_id: ownerId },
      update: {
        base_url: data.base_url,
        username: data.username,
        password: data.password,
        client_id: data.client_id,
        easa_operator_code: data.easa_operator_code ?? null,
        pfx_content: data.pfx_content ?? undefined,
        pfx_password: encryptedPfxPassword ?? undefined,
        updated_at: new Date(),
      },
      create: {
        fk_owner_id: ownerId,
        base_url: data.base_url,
        username: data.username,
        password: data.password,
        client_id: data.client_id,
        easa_operator_code: data.easa_operator_code ?? null,
        pfx_content: data.pfx_content ?? null,
        pfx_password: encryptedPfxPassword ?? null,
      },
    }),
    prisma.owner.update({
      where: { owner_id: ownerId },
      data: { easa_operator_code: data.easa_operator_code ?? null },
    }),
  ]);
}
