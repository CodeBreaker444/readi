import { notifyDccBulkCancellation } from '@/backend/services/mission/dcc-callback-service'
import { deleteOperationCalendarEntry, lookupOperationMissionCode } from '@/backend/services/operation/operation-calendar-service'
import { internalError } from '@/lib/api-error'
import { requirePermission } from '@/lib/auth/api-auth'
import { E } from '@/lib/error-codes'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requirePermission('view_operations')
    if (error) return error

    const operationId = Number((await params).id)
    if (isNaN(operationId)) {
      return NextResponse.json({ success: false, error: 'Invalid operation ID' }, { status: 400 })
    }

    // Fetch the DCC mission ID before touching the DB
    const dccId = await lookupOperationMissionCode(operationId, session!.user.ownerId)

    // Notify DCC first — if it fails, abort the cancellation entirely
    let dcc
    if (dccId) {
      dcc = await notifyDccBulkCancellation(session!.user.ownerId, [dccId])
      if (dcc.outcome === 'http_error' || dcc.outcome === 'network_error') {
        return NextResponse.json(
          { success: false, error: `DCC rejected the cancellation — ${dcc.message}. Operation not deleted.`, dcc },
          { status: 502 },
        )
      }
    }

    // DCC accepted (or not configured) — safe to delete from DB
    await deleteOperationCalendarEntry(operationId, session!.user.ownerId)

    return NextResponse.json({ success: true, ...(dcc ? { dcc } : {}) })
  } catch (err) {
    console.error('[DELETE /api/operation/calendar/[id]]', err)
    return internalError(E.SV001, err)
  }
}
