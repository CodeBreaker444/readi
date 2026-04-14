import { logSpiKpiMeasurement } from '@/backend/services/safetyManagement/spi-kpi-service'
import { requirePermission } from '@/lib/auth/api-auth'
import { internalError, zodError } from '@/lib/api-error'
import { E } from '@/lib/error-codes'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'

const schema = z.object({
  definition_id: z.coerce.number().int().positive(),
  measurement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  actual_value: z.coerce.number(),
  target_value: z.coerce.number(),
  status: z.enum(['GREEN', 'YELLOW', 'RED']),
})

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_safety_mgmt')
    if (error) return error

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error)
    }

    const data = await logSpiKpiMeasurement({
      ...parsed.data,
      owner_id: session!.user.ownerId,
    })

    return NextResponse.json({ code: 1, data }, { status: 201 })
  } catch (err) {
    return internalError(E.SV001, err)
  }
}
