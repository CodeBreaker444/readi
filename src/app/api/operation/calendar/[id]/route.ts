import { deleteOperationCalendarEntry } from '@/backend/services/operation/operation-calendar-service'
import { getUserSession } from '@/lib/auth/server-session'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const operationId = Number((await params).id)
    if (isNaN(operationId)) {
      return NextResponse.json({ success: false, error: 'Invalid operation ID' }, { status: 400 })
    }

    await deleteOperationCalendarEntry(operationId, session.user.ownerId)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/operation/calendar/[id]]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

 