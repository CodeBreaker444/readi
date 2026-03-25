import { toggleSpiKpiDefinition } from '@/backend/services/safetyManagement/spi-kpi-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const spiKpiToggleSchema = z.object({
  id: z.coerce.number().int().positive(),
  is_active: z.coerce.number().int().min(0).max(1),
})

export async function POST(req: NextRequest) {
  try {
    const { session: _session, error } = await requirePermission('view_safety_mgmt');
    if (error) return error;
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