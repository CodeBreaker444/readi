import { createOperationCalendarEntry } from '@/backend/services/operation/operation-calendar-service'
import { requirePermission } from '@/lib/auth/api-auth'
import { internalError } from '@/lib/api-error'
import { E } from '@/lib/error-codes'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations')
    if (error) return error

    const body = await req.json()
    const operationId = await createOperationCalendarEntry(body, session!.user.ownerId)

    return NextResponse.json({ success: true, operationId })
  } catch (err) {
    console.error('[POST /api/operation/calendar/create]', err)
    return internalError(E.SV001, err)
  }
}
