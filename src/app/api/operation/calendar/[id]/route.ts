import { notifyDccBulkCancellation } from '@/backend/services/mission/dcc-callback-service'
import { deleteOperationCalendarEntry } from '@/backend/services/operation/operation-calendar-service'
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

    const { deletedDccId } = await deleteOperationCalendarEntry(operationId, session!.user.ownerId)

    let dcc
    if (deletedDccId) {
      dcc = await notifyDccBulkCancellation(session!.user.ownerId, [deletedDccId])
      if (dcc.outcome !== 'success' && dcc.outcome !== 'skipped') {
        console.warn('[DELETE /api/operation/calendar] DCC cancellation notification failed:', dcc)
      }
    }

    return NextResponse.json({ success: true, ...(dcc ? { dcc } : {}) })
  } catch (err) {
    console.error('[DELETE /api/operation/calendar/[id]]', err)
    return internalError(E.SV001, err)
  }
}
