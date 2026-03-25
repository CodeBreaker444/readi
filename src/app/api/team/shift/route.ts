import { getShifts } from '@/backend/services/shift/crew-shift-service'
import { requirePermission } from '@/lib/auth/api-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest) {
  const { session, error } = await requirePermission('manage_users')
  if (error) return error

  try {
    const ownerId = session!.user.ownerId

    const { calendarEvents } = await getShifts(ownerId)

    return NextResponse.json({ success: true, data: calendarEvents })
  } catch (err: any) {
    console.error('[GET /api/shifts]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
