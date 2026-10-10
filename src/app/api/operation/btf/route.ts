import { fetchBtfForecast, getBtfFleet } from '@/backend/services/operation/btf-service'
import { apiError, internalError } from '@/lib/api-error'
import { requirePermission } from '@/lib/auth/api-auth'
import { E } from '@/lib/error-codes'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  days: z.coerce.number().int().min(1).max(7).default(7),
})

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations')
    if (error) return error

    const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams))
    if (!parsed.success) return apiError(E.VL004, 400, parsed.error.flatten().fieldErrors)

    const { lat, lon, days } = parsed.data
    const [fleet, forecast] = await Promise.all([
      getBtfFleet(session!.user.ownerId),
      fetchBtfForecast(lat, lon, days),
    ])

    if (!forecast) {
      return NextResponse.json({ success: false, error: 'Weather service unavailable' }, { status: 502 })
    }
    return NextResponse.json({ success: true, data: { fleet, forecast } })
  } catch (err) {
    console.error('[GET /api/operation/btf]', err)
    return internalError(E.SV001, err)
  }
}
