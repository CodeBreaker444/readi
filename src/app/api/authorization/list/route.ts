import { getTransactionSigns } from '@/backend/services/authorization/authorization-service';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const filters = {
    userId:     searchParams.get('user_id')     ? Number(searchParams.get('user_id'))     : undefined,
    entityType: searchParams.get('entity_type') ?? undefined,
    entityId:   searchParams.get('entity_id')   ?? undefined,
    actionType: searchParams.get('action_type') ?? undefined,
    page:       searchParams.get('page')        ? Number(searchParams.get('page'))        : 1,
    pageSize:   searchParams.get('page_size')   ? Number(searchParams.get('page_size'))   : 50,
  };

  try {
    const result = await getTransactionSigns(session!.user.ownerId, filters);
    return NextResponse.json({ code: 1, ...result });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
