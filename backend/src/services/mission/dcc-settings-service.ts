import 'server-only';
import { prisma } from '@/lib/prisma';
import { logEvent } from '@/backend/services/auditLog/audit-log';

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
  userId?: number,
  userName?: string,
  userEmail?: string,
  userRole?: string,
): Promise<void> {
  const existing = await prisma.dcc_integrations.findUnique({
    where: { fk_owner_id: ownerId },
    select: { id: true },
  });

  const row = await prisma.dcc_integrations.upsert({
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

  logEvent({
    eventType: existing ? 'UPDATE' : 'CREATE',
    entityType: 'dcc_integration',
    entityId: row.id,
    description: `DCC integration '${displayName}' ${existing ? 'updated' : 'connected'}`,
    userId: userId,
    userName: userName,
    userEmail: userEmail,
    userRole: userRole,
    ownerId: ownerId,
    metadata: { displayName, callbackUrl },
  });
}

/**
 * Resolves where DCC callbacks go.
 *
 * - With a clientId, the client's own callback URL (dcc_client_endpoints) is used.
 * - If that client has none: `strict` callers (a request that came in through a
 *   client's API key) get null — never another client's DCC. Non-strict callers
 *   (missions created in Readi) fall back to the organisation-level URL.
 * - Without a clientId (legacy keys / unmapped requests), the organisation URL.
 */
export async function getDccCallbackUrl(
  ownerId: number,
  clientId?: number | null,
  strict = false,
): Promise<string | null> {
  if (clientId) {
    const endpoint = await prisma.dcc_client_endpoints.findUnique({
      where: { fk_owner_id_fk_client_id: { fk_owner_id: ownerId, fk_client_id: clientId } },
      select: { callback_url: true, active: true },
    });
    if (endpoint?.active && endpoint.callback_url) return endpoint.callback_url;
    if (strict) return null;
  }
  const integration = await getDccIntegration(ownerId);
  return integration?.callback_url ?? null;
}
