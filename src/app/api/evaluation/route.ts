 
// import { createEvaluation } from '@/backend/services/planning/evaluation-service';
import { getUserSession } from '@/lib/auth/server-session';
// import {
//     createEvaluationSchema
// } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
  
     const session = await getUserSession()
     if(!session)
     {
        return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
     }

    // const evaluations = await getEvaluationList(session.user.ownerId);

    // return NextResponse.json({
    //   code: 1,
    //   status: 'SUCCESS',
    //   message: 'success',
    //   dataRows: evaluations.length,
    //   data: evaluations,
    // });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const ownerIdRaw = z.coerce.number().int().positive().safeParse(body.owner_id);
    const userIdRaw = z.coerce.number().int().positive().safeParse(body.user_id ?? 1);

     const session = await getUserSession()
     if(!session)
     {
        return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
     }

    // const parsed = createEvaluationSchema.safeParse(body);
    // if (!parsed.success) {
    //   return NextResponse.json(
    //     { code: 0, message: parsed.error.flatten().fieldErrors },
    //     { status: 422 },
    //   );
    // }

    // const evaluation = await createEvaluation(
    //   parsed.data,
    //   session.user.ownerId,
    //   session.user.userId,
    // );

    // return NextResponse.json(
    //   {
    //     code: 1,
    //     status: 'SUCCESS',
    //     message: 'Evaluation created',
    //     dataRows: 1,
    //     data: evaluation,
    //   },
    //   { status: 201 },
    // );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}