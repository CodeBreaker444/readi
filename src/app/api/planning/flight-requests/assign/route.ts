import { notifyDccAcceptance } from '@/backend/services/mission/dcc-callback-service';
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

    // When linked to a planning mission, notify DCC of acceptance — non-blocking
    if (parsed.data.planning_id) {
      notifyDccAcceptance(parsed.data.planning_id).catch(() => {});
    }

    return NextResponse.json({ code: 1, message: 'Flight request updated' });
  } catch (err: any) {
    return NextResponse.json({ code: 0, error: err.message }, { status: 500 });
  }
}
