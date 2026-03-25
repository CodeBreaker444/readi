import { getSPIKPITrend } from '@/backend/services/dashboard/dashboard';
import { requirePermission } from '@/lib/auth/api-auth';
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
    const { name } = SPIKPITrendSchema.parse(body);

    const result = await getSPIKPITrend({
      owner_id: session!.user.ownerId,
      user_id: session!.user.userId,
      name,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { code: 0, status: 'ERROR', message: 'Validation failed', errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
