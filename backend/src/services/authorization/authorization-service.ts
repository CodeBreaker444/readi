import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface UpsertKeyParams {
  userId: number;
  ownerId: number;
  encryptedPrivateKey: string;
  publicKey: string;
  salt: string;
  iv: string;
  keyFingerprint: string;
}

export interface StoreTransactionSignParams {
  userId: number;
  ownerId: number;
  userName: string;
  actionType: string;
  entityType: string;
  entityId?: string;
  jwtToken: string;
  payloadPreview: Record<string, unknown>;
  publicKeySnapshot: string;
}

export interface TransactionSign {
  id: string;
  user_id: number;
  owner_id: number;
  user_name: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  jwt_token: string;
  payload_preview: Record<string, unknown> | null;
  public_key_snapshot: string;
  integrity_status: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface GetTransactionSignsResult {
  data: TransactionSign[];
  total: number;
  page: number;
  pageSize: number;
}

export async function upsertAuthorizationKey(params: UpsertKeyParams): Promise<void> {
  await prisma.user_authorization_keys.upsert({
    where:  { user_id: params.userId },
    update: {
      owner_id:              params.ownerId,
      encrypted_private_key: params.encryptedPrivateKey,
      public_key:            params.publicKey,
      salt:                  params.salt,
      iv:                    params.iv,
      key_fingerprint:       params.keyFingerprint,
      updated_at:            new Date(),
    },
    create: {
      user_id:               params.userId,
      owner_id:              params.ownerId,
      encrypted_private_key: params.encryptedPrivateKey,
      public_key:            params.publicKey,
      salt:                  params.salt,
      iv:                    params.iv,
      key_fingerprint:       params.keyFingerprint,
    },
  });
}

export async function getAuthorizationKey(userId: number) {
  return prisma.user_authorization_keys.findUnique({
    where:  { user_id: userId },
    select: {
      encrypted_private_key: true,
      public_key:            true,
      salt:                  true,
      iv:                    true,
      key_fingerprint:       true,
      created_at:            true,
    },
  });
}

export async function storeTransactionSign(params: StoreTransactionSignParams): Promise<string> {
  const record = await prisma.transaction_signs.create({
    data: {
      user_id:             params.userId,
      owner_id:            params.ownerId,
      user_name:           params.userName,
      action_type:         params.actionType,
      entity_type:         params.entityType,
      entity_id:           params.entityId ?? null,
      jwt_token:           params.jwtToken,
      payload_preview:     params.payloadPreview as Prisma.InputJsonValue,
      public_key_snapshot: params.publicKeySnapshot,
    },
    select: { id: true },
  });

  return record.id;
}

export async function getTransactionSigns(
  ownerId: number,
  filters: {
    userId?: number;
    entityType?: string;
    entityId?: string;
    actionType?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<GetTransactionSignsResult> {
  const page     = filters.page     ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const skip     = (page - 1) * pageSize;

  const where: Prisma.transaction_signsWhereInput = { owner_id: ownerId };

  if (filters.userId)     where.user_id     = filters.userId;
  if (filters.entityType) where.entity_type = filters.entityType;
  if (filters.entityId)   where.entity_id   = filters.entityId;
  if (filters.actionType) where.action_type = filters.actionType;

  const [rows, total] = await prisma.$transaction([
    prisma.transaction_signs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.transaction_signs.count({ where }),
  ]);

  return {
    data: rows.map(r => {
      const row = r as typeof r & { integrity_status?: string | null; verified_at?: Date | null };
      return {
        id:                  row.id,
        user_id:             row.user_id,
        owner_id:            row.owner_id,
        user_name:           row.user_name,
        action_type:         row.action_type,
        entity_type:         row.entity_type,
        entity_id:           row.entity_id,
        jwt_token:           row.jwt_token,
        public_key_snapshot: row.public_key_snapshot,
        payload_preview:     row.payload_preview as Record<string, unknown> | null,
        integrity_status:    row.integrity_status ?? null,
        verified_at:         row.verified_at?.toISOString() ?? null,
        created_at:          row.created_at.toISOString(),
      };
    }),
    total,
    page,
    pageSize,
  };
}

export async function markTransactionVerified(
  id: string,
  ownerId: number,
  status: 'valid' | 'invalid',
): Promise<void> {
  await prisma.transaction_signs.updateMany({
    where: { id, owner_id: ownerId },
    data:  { integrity_status: status, verified_at: new Date() },
  });
}
