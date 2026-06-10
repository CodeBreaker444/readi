import { notifyDccDenial } from '@/backend/services/mission/dcc-callback-service';
import { updateFlightRequestStatus } from '@/backend/services/mission/flight-request-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const Schema = z.object({
  request_id: z.number().int().positive(),
  note:        z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const { request_id, note } = parsed.data;

    const fr = await prisma.flight_requests.findFirst({
      where: {
        request_id,
        fk_owner_id: session!.user.ownerId,
      },
      select: {
        external_mission_id: true,
        dcc_status: true,
      },
    });

    if (!fr) {
      return apiError(E.NF021, 404);
    }

    if (fr.dcc_status === 'REJECTED') {
      return apiError(E.BL003, 422);
    }

    await updateFlightRequestStatus(request_id, session!.user.ownerId, 'REJECTED');

    const dcc = await notifyDccDenial(session!.user.ownerId, fr.external_mission_id as string, note);

    return NextResponse.json({ code: 1, message: 'Flight request denied', dcc });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
