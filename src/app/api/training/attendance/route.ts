import {
  addTrainingAttendance,
  deleteTrainingAttendance,
  getTrainingAttendance,
} from '@/backend/services/training/training-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const addAttendanceSchema = z.object({
  training_id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  training_session_date: z
    .string()
    .regex(dateRegex, 'Date must be YYYY-MM-DD')
    .optional()
    .nullable(),
  attendance_status: z.enum(['PRESENT', 'ABSENT', 'LATE']).optional().nullable(),
  completion_status: z.enum(['IN_PROGRESS', 'COMPLETED', 'FAILED']).optional().nullable(),
  score: z.number().min(0).max(100).optional().nullable(),
  feedback: z.string().max(1000).optional().nullable(),
  certification_issued: z.boolean().optional().default(false),
  certification_number: z.string().max(100).optional().nullable(),
  certification_date: z
    .string()
    .regex(dateRegex, 'Date must be YYYY-MM-DD')
    .optional()
    .nullable(),
  certification_expiry: z
    .string()
    .regex(dateRegex, 'Date must be YYYY-MM-DD')
    .optional()
    .nullable(),
});
const deleteAttendanceSchema = z.object({
  action: z.literal('delete'),
  attendance_id: z.number().int().positive('attendance_id is required'),
});
const querySchema = z.object({
  training_id: z.coerce.number().int().positive('training_id is required'),
});

export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission('view_training');
    if (error) return error;

    const parsed = querySchema.safeParse({
      training_id: new URL(req.url).searchParams.get('training_id'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, error: 'Validation failed', details: parsed.error.issues },
        { status: 422 }
      );
    }

    const data = await getTrainingAttendance(parsed.data.training_id);
    return NextResponse.json({ code: 1, data });
  } catch (err: any) {
    console.error('[GET /api/training/attendance]', err);
    return NextResponse.json({ code: 0, error: err?.message ?? 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await requirePermission('view_training');
    if (error) return error;

    const body = await req.json();

    if (body.action === 'delete') {
      const parsed = deleteAttendanceSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { code: 0, error: 'Validation failed', details: parsed.error.issues },
          { status: 422 }
        );
      }
      await deleteTrainingAttendance(parsed.data.attendance_id);
      return NextResponse.json({ code: 1, message: 'Deleted' });
    }

    const parsed = addAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, error: 'Validation failed', details: parsed.error.issues },
        { status: 422 }
      );
    }

    const newId = await addTrainingAttendance(parsed.data);
    return NextResponse.json({ code: 1, message: 'Added', id: newId }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/training/attendance]', err);
    return NextResponse.json({ code: 0, error: err?.message ?? 'Error' }, { status: 500 });
  }
}
