import { notifyDccMissionCreation } from '@/backend/services/mission/dcc-callback-service'
import { notifyPilotAssignment } from '@/backend/services/notification/notification-service'
import { createOperationCalendarEntry, deleteOperationCalendarEntry } from '@/backend/services/operation/operation-calendar-service'
import { internalError } from '@/lib/api-error'
import { requirePermission } from '@/lib/auth/api-auth'
import { E } from '@/lib/error-codes'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations')
    if (error) return error

    const body = await req.json()
    const result = await createOperationCalendarEntry(body, session!.user.ownerId)

    const dcc = await notifyDccMissionCreation(session!.user.ownerId, {
      type: body.is_recurring ? 'SCHEDULED' : 'ON-DEMAND',
      target: body.mission_name ?? undefined,
      localization: body.location ? { type: 'POINT', address: body.location } : undefined,
      missions: result.missions.map((m) => ({
        missionId: m.dccMissionId,
        startDateTime: m.startDateTime,
      })),
      notes: body.notes ?? undefined,
      operator: session!.user.email ?? undefined,
    })

    if (body.fk_pilot_user_id) {
      await notifyPilotAssignment(
        result.missions.map((m) => ({
          pilotUserId: body.fk_pilot_user_id,
          missionId: m.pilotMissionId,
          missionCode: m.dccMissionId,
          fromUserId: session!.user.userId,
        })),
      )
    }



    if (dcc.outcome === 'http_error' || dcc.outcome === 'network_error') {
      console.warn('[POST /api/operation/calendar/create] DCC notification failed (non-fatal):', dcc.message);
    }

    return NextResponse.json({ success: true, operationId: result.firstMissionId, dcc })
  } catch (err) {
    console.error('[POST /api/operation/calendar/create]', err)
    return internalError(E.SV001, err)
  }
}
