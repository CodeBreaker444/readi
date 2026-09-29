import { prisma } from '@/lib/prisma';
import { internalError, zodError } from '@/lib/api-error';
import { verifyFlytrelayJwt } from '@/lib/drone-atc-jwt';
import { E } from '@/lib/error-codes';
import { DFLIGHT_ABORT_STATUSES } from '@/backend/services/operation/mission-lock';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ALERT_WORTHY_STATUSES = [
  'WITHDRAWN', 'REJECTED', 'CONFLICTED', 'REVOKED', 'CANCELLED',
  'CLEARANCE_REJECTED', 'CLEARANCE_REJECTED_BY_SYSTEM',
  ...DFLIGHT_ABORT_STATUSES,
];

const WebhookSchema = z.object({
  readiMissionId: z.number().int().positive(),
  mission_id: z.string().min(1),
  tech_version: z.string().min(1),
  mission_status: z.string().min(1),
  flight_authorisation_status: z.string().optional(),
  flight_clearance_status: z.string().optional(),
  detectedAt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }
    const payload = verifyFlytrelayJwt(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = WebhookSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);
    const d = parsed.data;

    const mission = await prisma.pilot_mission.findUnique({
      where: { pilot_mission_id: d.readiMissionId },
      select: {
        fk_owner_id: true,
        fk_pilot_user_id: true,
        mission_code: true,
        actual_start: true,
        actual_end: true,
        dflight_mission_id: true,
      },
    });
    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }
    if (mission.dflight_mission_id !== d.mission_id) {
      return NextResponse.json({ error: 'mission_id does not match this mission\'s D-Flight authorization' }, { status: 409 });
    }
    if (String(mission.fk_owner_id) !== payload.userId) {
      return NextResponse.json({ error: 'Owner mismatch' }, { status: 403 });
    }

    await prisma.pilot_mission.update({
      where: { pilot_mission_id: d.readiMissionId },
      data: {
        dflight_mission_status: d.mission_status,
        dflight_flight_authorisation_status: d.flight_authorisation_status ?? undefined,
        dflight_flight_clearance_status: d.flight_clearance_status ?? undefined,
        dflight_tech_version: d.tech_version,
        dflight_last_status_at: d.detectedAt ? new Date(d.detectedAt) : new Date(),
      },
    });

    const missionStatusUpper = d.mission_status.toUpperCase();
    const authStatusUpper = d.flight_authorisation_status?.toUpperCase();
    const clearanceStatusUpper = d.flight_clearance_status?.toUpperCase();
    const isAbort = DFLIGHT_ABORT_STATUSES.includes(missionStatusUpper)
      || (authStatusUpper ? DFLIGHT_ABORT_STATUSES.includes(authStatusUpper) : false)
      || (clearanceStatusUpper ? DFLIGHT_ABORT_STATUSES.includes(clearanceStatusUpper) : false);
    const isAlertWorthy = ALERT_WORTHY_STATUSES.includes(missionStatusUpper)
      || (authStatusUpper ? ALERT_WORTHY_STATUSES.includes(authStatusUpper) : false)
      || (clearanceStatusUpper ? ALERT_WORTHY_STATUSES.includes(clearanceStatusUpper) : false);
    const missionInFlight = !!mission.actual_start && !mission.actual_end;

    // Abort notification — landing instructions if
    // already airborne, a hold instruction otherwise. Other D-Flight status
    // changes (withdrawn/rejected/conflicted) only matter once a mission is
    // actually in the air.
    if ((isAbort || (isAlertWorthy && missionInFlight)) && mission.fk_pilot_user_id) {
      const title = isAbort
        ? (missionInFlight ? 'D-Flight has aborted this mission — land immediately' : 'D-Flight has aborted this mission')
        : 'D-Flight has withdrawn this mission\'s authorization';
      const message = isAbort
        ? (missionInFlight
            ? `Mission ${mission.mission_code ?? d.readiMissionId} was aborted by D-Flight while in flight. Land as soon as safely possible.`
            : `Mission ${mission.mission_code ?? d.readiMissionId} was aborted by D-Flight. Do not take off.`)
        : `Mission ${mission.mission_code ?? d.readiMissionId} was withdrawn by D-Flight and must be stopped immediately.`;

      await prisma.notification.create({
        data: {
          fk_user_id: mission.fk_pilot_user_id,
          notification_type: 'dflight_authorization',
          notification_title: title,
          notification_message: message,
          notification_data: {
            mission_id: d.readiMissionId,
            dflight_mission_status: d.mission_status,
            dflight_flight_authorisation_status: d.flight_authorisation_status ?? null,
          },
          priority: 'high',
          is_read: false,
          created_at: new Date(),
        },
      }).catch((err) => console.error('[dflight webhook] notification insert failed:', err));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
