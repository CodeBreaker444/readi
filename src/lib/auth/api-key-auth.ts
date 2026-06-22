import { prisma } from '@/lib/prisma';
import { hashApiKey } from '@/backend/services/mission/flight-request-service';
import { NextRequest, NextResponse } from 'next/server';

export interface ApiKeySession {
  api_key_id: number;
  owner_id: number;
  key_name: string;
  key_scope: string;
}

export interface ApiKeyAuthResult {
  session: ApiKeySession | null;
  error: NextResponse | null;
}

export async function requireApiKey(req: NextRequest): Promise<ApiKeyAuthResult> {
  const rawKey = req.headers.get('X-API-KEY') ?? req.headers.get('x-api-key');

  if (!rawKey) {
    return {
      session: null,
      error: NextResponse.json(
        { code: 0, status: 'ERROR', error: 'Missing X-API-KEY header' },
        { status: 401 }
      ),
    };
  }

  const keyHash = hashApiKey(rawKey);

  const data = await prisma.api_keys.findUnique({
    where: { key_value: keyHash },
    select: {
      api_key_id: true,
      fk_owner_id: true,
      key_name: true,
      key_scope: true,
      is_active: true,
      expires_at: true,
    },
  });

  if (!data) {
    return {
      session: null,
      error: NextResponse.json(
        { code: 0, status: 'ERROR', error: 'Invalid API key' },
        { status: 401 }
      ),
    };
  }

  if (!data.is_active) {
    return {
      session: null,
      error: NextResponse.json(
        { code: 0, status: 'ERROR', error: 'This API key has been revoked. Generate a new key from the Security Settings page.' },
        { status: 403 }
      ),
    };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return {
      session: null,
      error: NextResponse.json(
        {
          code: 0,
          status: 'ERROR',
          error: `This API key expired on ${new Date(data.expires_at).toISOString().slice(0, 10)}. Generate a new key from the Security Settings page.`,
        },
        { status: 403 }
      ),
    };
  }

  // Fire-and-forget last_used_at update
  prisma.api_keys
    .update({ where: { api_key_id: data.api_key_id }, data: { last_used_at: new Date() } })
    .then(() => {});

  return {
    session: {
      api_key_id: data.api_key_id,
      owner_id:   data.fk_owner_id,
      key_name:   data.key_name,
      key_scope:  data.key_scope,
    },
    error: null,
  };
}
