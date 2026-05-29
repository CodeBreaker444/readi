import { getBatteryCycles } from '@/backend/services/logbook/battery-logbook-service';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_logbooks');
    if (error) return error;

    const componentId = parseInt((await params).id, 10);
    if (isNaN(componentId)) {
      return NextResponse.json({ code: 400, message: 'Invalid battery ID' }, { status: 400 });
    }

    const result = await getBatteryCycles(componentId, session!.user.ownerId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
