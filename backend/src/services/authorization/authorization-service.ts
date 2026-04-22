import { supabase } from '@/backend/database/database';

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
  created_at: string;
}

export interface GetTransactionSignsResult {
  data: TransactionSign[];
  total: number;
  page: number;
  pageSize: number;
}

export async function upsertAuthorizationKey(params: UpsertKeyParams): Promise<void> {
  const { error } = await supabase
    .from('user_authorization_keys')
    .upsert(
      {
        user_id:               params.userId,
        owner_id:              params.ownerId,
        encrypted_private_key: params.encryptedPrivateKey,
        public_key:            params.publicKey,
        salt:                  params.salt,
        iv:                    params.iv,
        key_fingerprint:       params.keyFingerprint,
        updated_at:            new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) throw error;
}

export async function getAuthorizationKey(userId: number) {
  const { data, error } = await supabase
    .from('user_authorization_keys')
    .select('encrypted_private_key, public_key, salt, iv, key_fingerprint, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function storeTransactionSign(params: StoreTransactionSignParams): Promise<string> {
  const { data, error } = await supabase
    .from('transaction_signs')
    .insert({
      user_id:             params.userId,
      owner_id:            params.ownerId,
      user_name:           params.userName,
      action_type:         params.actionType,
      entity_type:         params.entityType,
      entity_id:           params.entityId ?? null,
      jwt_token:           params.jwtToken,
      payload_preview:     params.payloadPreview,
      public_key_snapshot: params.publicKeySnapshot,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
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
  const from     = (page - 1) * pageSize;
  const to       = from + pageSize - 1;

  let query = supabase
    .from('transaction_signs')
    .select('*', { count: 'exact' })
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.userId)     query = query.eq('user_id', filters.userId);
  if (filters.entityType) query = query.eq('entity_type', filters.entityType);
  if (filters.entityId)   query = query.eq('entity_id', filters.entityId);
  if (filters.actionType) query = query.eq('action_type', filters.actionType);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data:     (data ?? []) as TransactionSign[],
    total:    count ?? 0,
    page,
    pageSize,
  };
}
