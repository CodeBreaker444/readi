import { deleteOperationCalendarEntry } from '@/backend/services/operation/operation-calendar-service'
import { requirePermission } from '@/lib/auth/api-auth'
import { internalError } from '@/lib/api-error'
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

    await deleteOperationCalendarEntry(operationId, session!.user.ownerId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/operation/calendar/[id]]', err)
    return internalError(E.SV001, err)
  }
}
