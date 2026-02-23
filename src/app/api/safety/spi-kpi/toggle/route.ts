import { toggleSpiKpiDefinition } from '@/backend/services/safetyManagement/spi-kpi-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const spiKpiToggleSchema = z.object({
  id: z.coerce.number().int().positive(),
  is_active: z.coerce.number().int().min(0).max(1),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ code: 0, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json()

    const parsed = spiKpiToggleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = await toggleSpiKpiDefinition(parsed.data)
    return NextResponse.json({ code: 1, data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ code: 0, error: message }, { status: 500 })
  }
}