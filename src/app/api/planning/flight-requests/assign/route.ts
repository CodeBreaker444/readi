import { notifyDccAcceptance } from '@/backend/services/mission/dcc-callback-service';
import type { DccCallbackResult } from '@/types/dcc-callback';
import { assignFlightRequest } from '@/backend/services/mission/flight-request-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const Schema = z.object({
  request_id:  z.number().int().positive(),
  planning_id: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, error: parsed.error.issues[0]?.message ?? 'Validation error' },
        { status: 400 }
      );
    }

    await assignFlightRequest(
      parsed.data.request_id,
      session!.user.ownerId,
      session!.user.userId,
      parsed.data.planning_id,
    );

    let dcc: DccCallbackResult | undefined;
    if (parsed.data.planning_id) {
      dcc = await notifyDccAcceptance(session!.user.ownerId, parsed.data.planning_id);
    }

    return NextResponse.json({ code: 1, message: 'Flight request updated', ...(dcc ? { dcc } : {}) });
  } catch (err: any) {
    return NextResponse.json({ code: 0, error: err.message }, { status: 500 });
  }
}
