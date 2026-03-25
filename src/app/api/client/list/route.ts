import { listClients } from '@/backend/services/client/client-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_client')
    if(error) return error

    const result = await listClients(session!.user.ownerId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ code: 0, error: 'Internal server error' }, { status: 500 });
  }
}