import { getBtfFleet } from '@/backend/services/operation/btf-service'
import { internalError } from '@/lib/api-error'
import { requirePermission } from '@/lib/auth/api-auth'
import { E } from '@/lib/error-codes'
import { NextResponse } from 'next/server'

/** The owner's drones with their system location and model limits. */
export async function GET() {
  try {
    const { session, error } = await requirePermission('view_operations')
    if (error) return error

    return NextResponse.json({ success: true, data: { fleet: await getBtfFleet(session!.user.ownerId) } })
  } catch (err) {
    console.error('[GET /api/operation/btf/fleet]', err)
    return internalError(E.SV001, err)
  }
}
