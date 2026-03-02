 
// import { deleteEvaluation, getEvaluationById, updateEvaluation } from '@/backend/services/planning/evaluation-service';
import { getUserSession } from '@/lib/auth/server-session';
// import {
//     deleteEvaluationSchema,
//     updateEvaluationSchema,
// } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await getUserSession()

    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unautherized' }, { status: 400 });
    }

    // const evaluation = await getEvaluationById(Number(id) , session.user.ownerId);
    // if (!evaluation) {
    //   return NextResponse.json({ code: 0, message: 'Not found' }, { status: 404 });
    // }

    // return NextResponse.json({ code: 1, dataRows: 1, data: evaluation });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
   const { id } = await params
    const session = await getUserSession()

    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unautherized' }, { status: 400 });
    }
    const body = await req.json();
    // const parsed = updateEvaluationSchema.safeParse({ ...body, evaluation_id: id });

    // if (!parsed.success) {
    //   return NextResponse.json(
    //     { code: 0, message: parsed.error.flatten().fieldErrors },
    //     { status: 422 },
    //   );
    // }

    // const evaluation = await updateEvaluation(parsed.data);

    // return NextResponse.json({
    //   code: 1,
    //   status: 'SUCCESS',
    //   message: 'Evaluation updated',
    //   dataRows: 1,
    //   data: evaluation,
    // });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('status NEW') ? 403 : 500;
    return NextResponse.json({ code: 0, message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
     const { id } = await params
    const session = await getUserSession()

    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unautherized' }, { status: 400 });
    }
    // const parsed = deleteEvaluationSchema.safeParse({
    //   evaluation_id: id,
    //   owner_id: session.user.ownerId,
    // });

    // if (!parsed.success) {
    //   return NextResponse.json(
    //     { code: 0, message: parsed.error.flatten().fieldErrors },
    //     { status: 422 },
    //   );
    // }

    // await deleteEvaluation(parsed.data);

    return NextResponse.json({ code: 1, message: 'Deleted successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('status NEW') ? 403 : 500;
    return NextResponse.json({ code: 0, message }, { status });
  }
}