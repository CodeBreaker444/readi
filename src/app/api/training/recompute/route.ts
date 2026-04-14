import { recomputeMonthlyKPI } from '@/backend/services/training/training-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_training');
    if (error) return error;

    const user = session!.user;

    let period = '';
    try {
      const body = await req.json();
      if (body?.period) period = String(body.period);
    } catch {
      // body may be empty — default below
    }

    if (!period || !/^\d{4}-\d{2}-\d{2}$/.test(period)) {
      const d = new Date();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      period = `${d.getFullYear()}-${mm}-01`;
    }

    const result = await recomputeMonthlyKPI(user.ownerId, period);

    return NextResponse.json({ code: 1, ...result });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
