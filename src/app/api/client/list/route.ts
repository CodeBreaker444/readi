import { listClients } from '@/backend/services/client/client-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_client')
    if(error) return error

    const result = await listClients(session!.user.ownerId);
    return NextResponse.json(result);
  } catch (error) {
      return internalError(E.AU002, error);
  }
}