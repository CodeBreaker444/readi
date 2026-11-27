import { FlightRequestLinkError, linkFlightRequestToMission } from '@/backend/services/mission/flight-request-mission-service';
import { internalError, zodError } from '@/lib/api-error';
import { requireFeatureAccess } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const Schema = z.object({
  request_id: z.number().int().positive(),
  mission_id: z.number().int().positive(),
});

/** Links an acknowledged flight request to an existing scheduled mission. */
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireFeatureAccess('operation_flight_requests', 'edit');
    if (error) return error;

    const parsed = Schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    const result = await linkFlightRequestToMission({
      requestId: parsed.data.request_id,
      missionId: parsed.data.mission_id,
      ownerId: user.ownerId,
      userId: user.userId,
      userName: user.fullname,
      userEmail: user.email,
      userRole: user.role,
    });

    return NextResponse.json({ code: 1, message: 'Flight request linked to mission', ...result });
  } catch (err) {
    if (err instanceof FlightRequestLinkError) {
      return NextResponse.json({ code: 0, error: err.message }, { status: err.status });
    }
    return internalError(E.SV001, err);
  }
}
