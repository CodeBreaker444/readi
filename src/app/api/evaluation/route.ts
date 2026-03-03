 
import { getEvaluationList } from '@/backend/services/logbook/mission-service';
import { createEvaluation } from '@/backend/services/planning/evaluation-service';
import { getUserSession } from '@/lib/auth/server-session';
 
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

export async function GET(req: NextRequest) {
  try {
  
     const session = await getUserSession()
     if(!session)
     {
        return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
     }

    const evaluations = await getEvaluationList(session.user.ownerId);

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: 'success',
      data: evaluations,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
const EvaluationStatusEnum = z.enum(['NEW', 'PROGRESS', 'REVIEW', 'SUSPENDED', 'DONE']);
const EvaluationResultEnum = z.enum(['PROCESSING', 'RESULT_POSITIVE', 'RESULT_NEGATIVE']);

const createEvaluationSchema = z.object({
  fk_client_id: z.number().int().positive(),
  fk_luc_procedure_id: z.number().int().positive(),
  evaluation_status: EvaluationStatusEnum,
  evaluation_request_date: z.string().min(1, "Date is required"),
  evaluation_year: z.number().int().min(2000).max(2100),
  evaluation_desc: z.string().max(500),
  evaluation_offer: z.string().max(100).optional(),
  evaluation_sale_manager: z.string().max(100).optional(),
  evaluation_result: EvaluationResultEnum,
});
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
     const session = await getUserSession()
     if(!session)
     {
        return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
     }

    const parsed = createEvaluationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, message: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const evaluation = await createEvaluation(
      parsed.data,
      session.user.ownerId,
      session.user.userId,
    );

    return NextResponse.json(
      {
        code: 1,
        status: 'SUCCESS',
        message: 'Evaluation created',
        dataRows: 1,
        data: evaluation,
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}