 
import { createSpiKpiDefinition, updateSpiKpiDefinition } from '@/backend/services/safetyManagement/spi-kpi-service'
import { AREAS, FREQUENCIES, TYPES } from '@/config/types/safetyMng'
import { getUserSession } from '@/lib/auth/server-session'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'

const spiKpiCreateSchema = z.object({
  indicator_code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(50, 'Code must be at most 50 characters')
    .regex(/^[A-Z0-9_]+$/, 'Only uppercase letters, numbers, and underscores'),
  indicator_type: z.enum(TYPES),
  indicator_area: z.enum(AREAS),
  indicator_name: z.string().min(2, 'Name is required').max(255),
  indicator_desc: z.string().max(1000).optional().nullable(),
  target_value: z.coerce.number().min(0, 'Target must be positive'),
  unit: z.string().min(1, 'Unit is required').max(20),
  frequency: z.enum(FREQUENCIES).default('MONTHLY'),
  is_active: z.coerce.number().int().min(0).max(1).default(1),
})

const spiKpiUpdateSchema = spiKpiCreateSchema
  .omit({ indicator_code: true, indicator_type: true, indicator_area: true })
  .extend({
    id: z.coerce.number().int().positive(),
  })


export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ code: 0, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json()
    const isUpdate = body.id && Number(body.id) > 0

    if (isUpdate) {
      const parsed = spiKpiUpdateSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { code: 0, error: parsed.error.issues[0].message },
          { status: 400 }
        )
      }
      const data = await updateSpiKpiDefinition(parsed.data)
      return NextResponse.json({ code: 1, data })
    } else {
      const parsed = spiKpiCreateSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { code: 0, error: parsed.error.issues[0].message },
          { status: 400 }
        )
      }
      const data = await createSpiKpiDefinition(parsed.data)
      return NextResponse.json({ code: 1, data }, { status: 201 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ code: 0, error: message }, { status: 500 })
  }
}