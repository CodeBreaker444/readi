import { deleteEvaluation, getEvaluationById, updateEvaluation } from '@/backend/services/planning/evaluation-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }
    const id = await params
 

    const evaluation = await getEvaluationById(Number(id), session.user.ownerId);
    if (!evaluation) {
      return NextResponse.json({ code: 0, message: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ code: 1, dataRows: 1, data: evaluation });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
 const EvaluationStatusEnum = z.enum(['NEW', 'PROGRESS', 'REVIEW', 'SUSPENDED', 'DONE']);
 const EvaluationResultEnum = z.enum(['PROCESSING', 'RESULT_POSITIVE', 'RESULT_NEGATIVE']);

 const updateEvaluationSchema = z.object({
    evaluation_id: z.number().int().positive(),
    fk_owner_id: z.number().int().positive(),
    fk_client_id: z.number().int().positive(),
    evaluation_status: EvaluationStatusEnum,
    evaluation_result: EvaluationResultEnum,
    evaluation_request_date: z.string().min(1, 'Request date is required'),
    evaluation_year: z.number().int().min(2000).max(2100),
    evaluation_desc: z.string().max(500).optional().default(''),
    evaluation_offer: z.string().max(100).optional().default(''),
    evaluation_sale_manager: z.string().max(100).optional().default(''),
    evaluation_folder: z.string().optional().default(''),
    fk_luc_procedure_id: z.number().int().positive().optional(),
    fk_evaluation_code: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }
    const id = await params
   
    const body = await req.json();
    const parsed = updateEvaluationSchema.safeParse({ ...body, evaluation_id: id });

    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, message: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const evaluation = await updateEvaluation(parsed.data);

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: 'Evaluation updated',
      dataRows: 1,
      data: evaluation,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('status NEW') ? 403 : 500;
    return NextResponse.json({ code: 0, message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }
    const id = await params
  

    await deleteEvaluation(Number(id), session.user.ownerId);

    return NextResponse.json({ code: 1, message: 'Deleted successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('status NEW') ? 403 : 500;
    return NextResponse.json({ code: 0, message }, { status });
  }
}