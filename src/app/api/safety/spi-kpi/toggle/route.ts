import { toggleSpiKpiDefinition } from '@/backend/services/safetyManagement/spi-kpi-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
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
      return zodError(E.VL001, parsed.error);
    }

    const data = await toggleSpiKpiDefinition(parsed.data)
    return NextResponse.json({ code: 1, data })
  } catch (err) {
    return internalError(E.SV001, err);
  }
}