import { addFlatTraining, updateFlatTraining } from '@/backend/services/training/training-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const addFlatSchema = z.object({
  user_ids: z.array(z.number().int().positive()).min(1, 'At least one user is required'),
  training_name: z.string().min(1, 'Course name is required').max(255),
  training_type: z.enum(['INITIAL', 'RECURRENT', 'EMERGENCY', 'SIMULATOR', 'OTHER']).optional().nullable(),
  session_code: z.string().max(100).optional().nullable(),
  completion_date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD').optional().nullable(),
  expiry_date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD').optional().nullable(),
});

const updateFlatSchema = z.object({
  attendance_id: z.number().int().positive('attendance_id is required'),
  fk_training_id: z.number().int().positive('fk_training_id is required'),
  training_name: z.string().min(1, 'Course name is required').max(255),
  training_type: z.enum(['INITIAL', 'RECURRENT', 'EMERGENCY', 'SIMULATOR', 'OTHER']).optional().nullable(),
  session_code: z.string().max(100).optional().nullable(),
  completion_date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD').optional().nullable(),
  expiry_date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD').optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_training');
    if (error) return error;

    const body = await req.json();

    if (body.attendance_id) {
      const parsed = updateFlatSchema.safeParse(body);
      if (!parsed.success) {
        return zodError(E.VL001, parsed.error);
      }
      await updateFlatTraining(parsed.data);
      return NextResponse.json({ code: 1, message: 'Updated' });
    }

    const parsed = addFlatSchema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const ids = await addFlatTraining({ owner_id: session!.user.ownerId, ...parsed.data });
    return NextResponse.json({ code: 1, message: 'Created', ids }, { status: 201 });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
