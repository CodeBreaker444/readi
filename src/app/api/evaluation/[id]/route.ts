import {
  deleteEvaluation,
  getEvaluationById,
  updateEvaluation,
} from '@/backend/services/planning/evaluation-detail';
import { getUserSession } from '@/lib/auth/server-session';

import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const evaluationIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Invalid evaluation ID'),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }
    const {id: evaluationId } = evaluationIdParamSchema.parse(await params);

    const data = await getEvaluationById(session.user.ownerId, evaluationId);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { success: false, errors: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, message: err.message ?? 'Server error' },
      { status: 500 },
    );
  }
}

const evaluationUpdateSchema = z.object({
  evaluation_id: z.coerce.number().int().positive(),
  fk_owner_id: z.coerce.number().int().positive(),
  fk_client_id: z.coerce.number().int().positive(),
  fk_evaluation_code: z.string().optional(),
  evaluation_request_date: z.string().optional(),
  evaluation_year: z.coerce.number().int().min(2000).max(2100).optional(),
  evaluation_desc: z.string().max(500).optional(),
  evaluation_offer: z.string().max(255).optional(),
  evaluation_sale_manager: z.string().max(255).optional(),
  evaluation_status: z.enum(['NEW', 'PROGRESS', 'REVIEW', 'SUSPENDED', 'DONE']).optional(),
  evaluation_result: z.enum(['PROCESSING', 'RESULT_POSITIVE', 'RESULT_NEGATIVE']).optional(),
  evaluation_folder: z.string().optional(),
});
export type EvaluationUpdateInput = z.infer<typeof evaluationUpdateSchema>;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }
    evaluationIdParamSchema.parse(await params);

    const body = await req.json();
    const validated = evaluationUpdateSchema.parse(body);
    const result = await updateEvaluation(validated);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { success: false, errors: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, message: err.message ?? 'Server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }
    const { id: evaluationId } = evaluationIdParamSchema.parse(await params);

    const result = await deleteEvaluation(session.user.ownerId, evaluationId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 422 },
      );
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { success: false, errors: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, message: err.message ?? 'Server error' },
      { status: 500 },
    );
  }
}