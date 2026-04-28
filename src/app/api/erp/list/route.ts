import { listErp } from '@/backend/services/emergencyContact/erp-service'
import { internalError } from '@/lib/api-error'
import { requirePermission } from '@/lib/auth/api-auth'
import { E } from '@/lib/error-codes'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_erp')
    if (error) return error

    const data = await listErp({ owner_id: session!.user.ownerId })
    return NextResponse.json({ code: 1, data })
  } catch (err) {
    return internalError(E.SV001, err)
  }
}
