import { getShifts } from '@/backend/services/shift/crew-shift-service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const ownerId = Number(req.headers.get('x-owner-id') ?? 1)

    if (!ownerId || isNaN(ownerId)) {
      return NextResponse.json({ error: 'Invalid or missing owner ID' }, { status: 400 })
    }

    const { calendarEvents } = await getShifts(ownerId)

    return NextResponse.json({ success: true, data: calendarEvents })
  } catch (err: any) {
    console.error('[GET /api/shifts]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}