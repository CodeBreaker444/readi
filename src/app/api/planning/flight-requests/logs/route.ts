import { notifyDccLogging } from '@/backend/services/mission/dcc-callback-service';
import {
  getFlightRequestById,
  getLatestFlightLogForMission,
  getPilotMissionByPlanningId,
} from '@/backend/services/mission/flight-request-service';
import { attachFlytbaseFlightLog } from '@/backend/services/operation/flight-log-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { env } from '@/backend/config/env';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const LinkSchema = z.object({
  action:     z.literal('link'),
  request_id: z.number().int().positive(),
  flight_id:  z.string().min(1, 'flight_id is required'),
});

const PushSchema = z.object({
  action:     z.literal('push'),
  request_id: z.number().int().positive(),
});

const Schema = z.discriminatedUnion('action', [LinkSchema, PushSchema]);

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    // Resolve flight_request → planning_id → pilot_mission_id
    const fr = await getFlightRequestById(parsed.data.request_id, session!.user.ownerId);

    if (!fr) return apiError(E.NF021, 404);
    if (!fr.fk_planning_id) return apiError(E.BL003, 422);

    const pm = await getPilotMissionByPlanningId(fr.fk_planning_id);

    if (!pm) return apiError(E.NF003, 404);

    const missionId = pm.pilot_mission_id;

    // ── LINK: archive GUTMA to S3, record in mission_flight_logs ──────────────
    if (parsed.data.action === 'link') {
      await attachFlytbaseFlightLog(missionId, session!.user.userId, parsed.data.flight_id);
      return NextResponse.json({ code: 1, message: 'Flight log archived to S3' });
    }

    // ── PUSH: notify DCC using already-stored log ──────────────────────────────
    const storedLog = await getLatestFlightLogForMission(missionId);

    if (!storedLog?.flytbase_flight_id) {
      return NextResponse.json(
        { code: 0, message: 'No archived FlytBase log found for this mission. Archive a log first.' },
        { status: 422 },
      );
    }

    const logUri = `${env.FLYTBASE_URL ?? ''}/v2/flight/report/download/gutma?flightIds=${encodeURIComponent(storedLog.flytbase_flight_id)}`;
    const dcc = await notifyDccLogging(session!.user.ownerId, missionId, logUri);

    return NextResponse.json({ code: 1, message: 'Flight log pushed to DCC', dcc });
  } catch (err) {
    console.error('[flight-requests/logs] POST error:', err);
    return internalError(E.SV001, err);
  }
}
