import { addFlatTraining, updateFlatTraining } from '@/backend/services/training/training-service';
import { sendTrainingCreatedModuleEmail, sendTrainingUpdatedModuleEmail } from '@/backend/services/settings/module-email-notification-service';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const addFlatSchema = z.object({
  user_ids: z.array(z.number().int().positive()).min(1, 'At least one user is required'),
  training_name: z.string().min(1, 'Course name is required').max(255),
  training_type: z.enum(['INITIAL', 'RECURRENT', 'EMERGENCY', 'SIMULATOR', 'OTHER']).optional().nullable(),
  certificate_type: z.enum(['PARTICIPATION', 'QUALIFICATION']).optional().nullable(),
  session_code: z.string().max(100).optional().nullable(),
  session_date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD').optional().nullable(),
  completion_date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD').optional().nullable(),
  expiry_date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD').optional().nullable(),
});

const updateFlatSchema = z.object({
  attendance_id: z.number().int().positive('attendance_id is required'),
  fk_training_id: z.number().int().positive('fk_training_id is required'),
  training_name: z.string().min(1, 'Course name is required').max(255),
  training_type: z.enum(['INITIAL', 'RECURRENT', 'EMERGENCY', 'SIMULATOR', 'OTHER']).optional().nullable(),
  certificate_type: z.enum(['PARTICIPATION', 'QUALIFICATION']).optional().nullable(),
  session_code: z.string().max(100).optional().nullable(),
  session_date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD').optional().nullable(),
  completion_date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD').optional().nullable(),
  expiry_date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD').optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_training');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('training_courses', 'edit');
    if (featureError) return featureError;

    const body = await req.json();

    if (body.attendance_id) {
      const parsed = updateFlatSchema.safeParse(body);
      if (!parsed.success) {
        return zodError(E.VL001, parsed.error);
      }
      await updateFlatTraining(
        parsed.data,
        session!.user.ownerId,
        session!.user.userId,
        session!.user.fullname,
        session!.user.email,
        session!.user.role
      );

      sendTrainingUpdatedModuleEmail(session!.user.ownerId, {
        trainingName: parsed.data.training_name,
        trainingType: parsed.data.training_type,
        certificateType: parsed.data.certificate_type,
        sessionDate: parsed.data.session_date,
        updatedBy: session!.user.fullname,
      }).catch((err) => console.error('[training/add] sendTrainingUpdatedModuleEmail failed:', err));

      return NextResponse.json({ code: 1, message: 'Updated' });
    }

    const parsed = addFlatSchema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const ids = await addFlatTraining(
      { owner_id: session!.user.ownerId, ...parsed.data },
      session!.user.userId,
      session!.user.fullname,
      session!.user.email,
      session!.user.role
    );

    sendTrainingCreatedModuleEmail(session!.user.ownerId, {
      trainingName: parsed.data.training_name,
      trainingType: parsed.data.training_type,
      certificateType: parsed.data.certificate_type,
      sessionDate: parsed.data.session_date,
      attendeeCount: ids.length,
      createdBy: session!.user.fullname,
    }).catch((err) => console.error('[training/add] sendTrainingCreatedModuleEmail failed:', err));

    return NextResponse.json({ code: 1, message: 'Created', ids }, { status: 201 });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
