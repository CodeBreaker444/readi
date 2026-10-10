import { saveModelFlightLimits } from '@/backend/services/operation/btf-service'
import { apiError, internalError } from '@/lib/api-error'
import { requirePermission } from '@/lib/auth/api-auth'
import { E } from '@/lib/error-codes'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const bodySchema = z
  .object({
    modelId: z.number().int().positive(),
    limits: z.object({
      maxWindMs: z.number().min(0).max(40),
      maxGustMs: z.number().min(0).max(50),
      maxPrecipMmH: z.number().min(0).max(50),
      minVisibilityM: z.number().min(0).max(10000),
      minTempC: z.number().min(-60).max(60),
      maxTempC: z.number().min(-60).max(80),
    }),
  })
  .refine((b) => b.limits.minTempC < b.limits.maxTempC, { message: 'minTempC must be below maxTempC', path: ['limits', 'minTempC'] })

export async function PUT(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations_full')
    if (error) return error

    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return apiError(E.VL001, 400, parsed.error.flatten().fieldErrors)

    const saved = await saveModelFlightLimits(session!.user.ownerId, parsed.data.modelId, parsed.data.limits)
    if (!saved) return NextResponse.json({ success: false, error: 'Drone model not found' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PUT /api/operation/btf/limits]', err)
    return internalError(E.SV001, err)
  }
}
