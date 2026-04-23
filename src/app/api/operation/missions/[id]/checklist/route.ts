import { getChecklistByCode } from '@/backend/services/organization/checklist-service';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params: _params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const code = req.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.json({ code: 0, error: 'code query param is required' }, { status: 400 });
    }

    const result = await getChecklistByCode(session!.user.ownerId, code);
    return NextResponse.json({
      code: result.data ? 1 : 0,
      checklist_json: result.data?.checklist_json ?? null,
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
