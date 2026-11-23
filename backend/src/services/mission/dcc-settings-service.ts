import 'server-only';
import { prisma } from '@/lib/prisma';
import { logEvent } from '@/backend/services/auditLog/audit-log';
import { decryptToken } from '@/backend/utils/token-encryption';

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

export const MISSION_SCOPES = ['EXTERNAL', 'INTERNAL', 'ALL'] as const;
export type MissionScope = (typeof MISSION_SCOPES)[number];
/** Where a mission came from: requested by a client's API key (EXTERNAL) or created inside Readi (INTERNAL). */
export type MissionOrigin = 'EXTERNAL' | 'INTERNAL';

export function scopeAllows(scope: string, origin: MissionOrigin): boolean {
  return scope === 'ALL' || scope === origin;
}

export interface ResolvedDccEndpoint {
  url: string;
  /** Decrypted key to send to the client's server; null for rows created before keys existed. */
  apiKey: string | null;
}

export type DccEndpointResolution =
  | { ok: true; endpoint: ResolvedDccEndpoint }
  | { ok: false; reason: string };

/**
 * Resolves where a DCC callback for `clientId` goes.
 *
 * Every integration belongs to one client; there is no organisation-wide fallback,
 * so an update is never sent to another client's server. The client's mission scope
 * decides whether missions of this origin are sent at all.
 */
export async function resolveDccEndpoint(
  ownerId: number,
  clientId: number | null | undefined,
  origin: MissionOrigin,
): Promise<DccEndpointResolution> {
  if (!clientId) return { ok: false, reason: 'Mission has no client — no integration to send to' };

  const row = await prisma.dcc_client_endpoints.findUnique({
    where: { fk_owner_id_fk_client_id: { fk_owner_id: ownerId, fk_client_id: clientId } },
    select: { callback_url: true, active: true, mission_scope: true, api_key_encrypted: true },
  });
  if (!row?.active || !row.callback_url) {
    return { ok: false, reason: 'No callback URL configured for this client' };
  }
  if (!scopeAllows(row.mission_scope, origin)) {
    return { ok: false, reason: `Skipped: this client's integration only sends ${row.mission_scope.toLowerCase()} missions` };
  }
  return {
    ok: true,
    endpoint: {
      url: row.callback_url,
      apiKey: row.api_key_encrypted ? decryptToken(row.api_key_encrypted) : null,
    },
  };
}
