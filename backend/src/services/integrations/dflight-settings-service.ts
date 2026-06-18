import 'server-only';
import { prisma } from '@/lib/prisma';

export interface DFlightIntegration {
  id: number;
  fk_owner_id: number;
  base_url: string;
  username: string;
  password: string;
  client_id: string;
  easa_operator_code: string | null;
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
  },
): Promise<void> {
  await prisma.d_flight_integrations.upsert({
    where: { fk_owner_id: ownerId },
    update: {
      base_url: data.base_url,
      username: data.username,
      password: data.password,
      client_id: data.client_id,
      easa_operator_code: data.easa_operator_code ?? null,
      updated_at: new Date(),
    },
    create: {
      fk_owner_id: ownerId,
      base_url: data.base_url,
      username: data.username,
      password: data.password,
      client_id: data.client_id,
      easa_operator_code: data.easa_operator_code ?? null,
    },
  });
}
