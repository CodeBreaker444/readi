import { getSPIKPITrend } from '@/backend/services/dashboard/dashboard';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const SPIKPITrendSchema = z.object({
  name: z.string().min(1, 'Indicator name is required'),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_dashboard');
    if (error) return error;

    const body = await req.json();
    const parsed = SPIKPITrendSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);
    const { name } = parsed.data;

    const result = await getSPIKPITrend({
      owner_id: session!.user.ownerId,
      user_id: session!.user.userId,
      name,
    });

    return NextResponse.json(result);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
