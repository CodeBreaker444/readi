import { notifyDccLogging } from '@/backend/services/mission/dcc-callback-service';
import { supabase } from '@/backend/database/database';
import { attachFlytbaseFlightLog } from '@/backend/services/operation/flight-log-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { env } from '@/backend/config/env';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const Schema = z.object({
  request_id: z.number().int().positive(),
  flight_id:  z.string().min(1, 'flight_id is required'),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, message: parsed.error.issues[0]?.message ?? 'Validation error' },
        { status: 400 },
      );
    }

    const { request_id, flight_id } = parsed.data;

    // Resolve flight_request → planning_id → pilot_mission_id
    const { data: fr } = await supabase
      .from('flight_requests')
      .select('fk_planning_id, dcc_status, external_mission_id')
      .eq('request_id', request_id)
      .eq('fk_owner_id', session!.user.ownerId)
      .single();

    if (!fr) {
      return NextResponse.json({ code: 0, message: 'Flight request not found' }, { status: 404 });
    }
    if (!fr.fk_planning_id) {
      return NextResponse.json(
        { code: 0, message: 'Request must be assigned to a planning mission before pushing logs' },
        { status: 422 },
      );
    }

    const { data: pm } = await supabase
      .from('pilot_mission')
      .select('pilot_mission_id')
      .eq('fk_planning_id', fr.fk_planning_id)
      .order('pilot_mission_id', { ascending: true })
      .limit(1)
      .single();

    if (!pm) {
      return NextResponse.json(
        { code: 0, message: 'No mission found for this planning. Create a mission first.' },
        { status: 422 },
      );
    }

    const missionId = pm.pilot_mission_id as number;

    await attachFlytbaseFlightLog(missionId, session!.user.userId, flight_id);

    const logUri = `${env.FLYTBASE_URL ?? ''}/v2/flight/report/download/gutma?flightIds=${encodeURIComponent(flight_id)}`;
    const dcc = await notifyDccLogging(session!.user.ownerId, missionId, logUri);

    return NextResponse.json({ code: 1, message: 'Flight log pushed to DCC', dcc });
  } catch (err: any) {
    console.error('[flight-requests/logs] POST error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status =
      err?.code === 'FLYTBASE_TIMEOUT' ? 504 :
      message.includes('No FlytBase')  ? 422 : 500;
    return NextResponse.json({ code: 0, message }, { status });
  }
}
