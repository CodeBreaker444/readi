import { getOperationCalendarEvents } from '@/backend/services/operation/operation-calendar-service'
import { getUserSession } from '@/lib/auth/server-session'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
 const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { calendarEvents } = await getOperationCalendarEvents(session.user.ownerId)
    return NextResponse.json({ success: true, data: calendarEvents })
  } catch (err: any) {
    console.error('[GET /api/operation/calendar]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}