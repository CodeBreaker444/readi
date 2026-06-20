import 'server-only';
import { prisma } from '@/lib/prisma';

export interface DccIntegration {
  id: number;
  fk_owner_id: number;
  display_name: string;
  callback_url: string;
  created_at: string;
  updated_at: string;
}

export async function getDccIntegration(ownerId: number): Promise<DccIntegration | null> {
  const row = await prisma.dcc_integrations.findUnique({
    where: { fk_owner_id: ownerId },
  });

  if (!row) return null;
  return {
    id: row.id,
    fk_owner_id: row.fk_owner_id,
    display_name: row.display_name,
    callback_url: row.callback_url,
    created_at: row.created_at?.toISOString() ?? '',
    updated_at: row.updated_at?.toISOString() ?? '',
  };
}

export async function upsertDccIntegration(
  ownerId: number,
  displayName: string,
  callbackUrl: string,
): Promise<void> {
  await prisma.dcc_integrations.upsert({
    where: { fk_owner_id: ownerId },
    update: {
      display_name: displayName,
      callback_url: callbackUrl,
      updated_at: new Date(),
    },
    create: {
      fk_owner_id: ownerId,
      display_name: displayName,
      callback_url: callbackUrl,
    },
  });
}

export async function getDccCallbackUrl(ownerId: number): Promise<string | null> {
  const integration = await getDccIntegration(ownerId);
  return integration?.callback_url ?? null;
}
