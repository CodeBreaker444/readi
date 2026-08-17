import { deleteFlatTraining } from '@/backend/services/training/training-service';
import { sendTrainingDeletedModuleEmail } from '@/backend/services/settings/module-email-notification-service';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const deleteSchema = z.object({
  attendance_id: z.number().int().positive('attendance_id is required'),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_training');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('training_courses', 'delete');
    if (featureError) return featureError;

    const parsed = deleteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const attendance = await prisma.training_attendance.findUnique({
      where: { attendance_id: parsed.data.attendance_id },
      select: { training: { select: { training_name: true, training_type: true } } },
    });

    await deleteFlatTraining(
      parsed.data.attendance_id,
      session!.user.ownerId,
      session!.user.userId,
      session!.user.fullname,
      session!.user.email,
      session!.user.role
    );

    if (attendance?.training) {
      sendTrainingDeletedModuleEmail(session!.user.ownerId, {
        trainingName: attendance.training.training_name,
        trainingType: attendance.training.training_type,
        deletedBy: session!.user.fullname,
      }).catch((err) => console.error('[training/delete] sendTrainingDeletedModuleEmail failed:', err));
    }

    return NextResponse.json({ code: 1, message: 'Deleted' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
