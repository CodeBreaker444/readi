import { getOperationCalendarEvents } from '@/backend/services/operation/operation-calendar-service'
import { requirePermission } from '@/lib/auth/api-auth'
import { internalError } from '@/lib/api-error'
import { E } from '@/lib/error-codes'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { session, error } = await requirePermission('view_operations')
    if (error) return error

    const { calendarEvents } = await getOperationCalendarEvents(session!.user.ownerId)
    return NextResponse.json({ success: true, data: calendarEvents })
  } catch (err) {
    console.error('[GET /api/operation/calendar]', err)
    return internalError(E.SV001, err)
  }
}
