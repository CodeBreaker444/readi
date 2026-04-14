import { deleteFlatTraining } from '@/backend/services/training/training-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const deleteSchema = z.object({
  attendance_id: z.number().int().positive('attendance_id is required'),
});

export async function POST(req: NextRequest) {
  try {
    const { error } = await requirePermission('view_training');
    if (error) return error;

    const parsed = deleteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    await deleteFlatTraining(parsed.data.attendance_id);
    return NextResponse.json({ code: 1, message: 'Deleted' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
