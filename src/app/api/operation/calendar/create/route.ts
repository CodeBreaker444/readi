import { createOperationCalendarEntry } from '@/backend/services/operation/operation-calendar-service'
import { getUserSession } from '@/lib/auth/server-session'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const operationId = await createOperationCalendarEntry(body, session.user.ownerId)

    return NextResponse.json({ success: true, operationId })
  } catch (err: any) {
    console.error('[POST /api/operation/calendar/create]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}