import { listSpiKpiDefinitions } from '@/backend/services/safetyManagement/spi-kpi-service'
import { AREAS, TYPES } from '@/config/types/safetyMng'
import { requirePermission } from '@/lib/auth/api-auth'
import { internalError, zodError } from '@/lib/api-error'
import { E } from '@/lib/error-codes'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'

const spiKpiListSchema = z.object({
    q: z.string().optional().default(''),
    area: z.enum([...AREAS, '']).optional().default(''),
    type: z.enum([...TYPES, '']).optional().default(''),
    active: z.enum(['1', '0', '']).optional().default(''),
})

export async function GET(req: NextRequest) {
    try {
        const { session: _session, error } = await requirePermission('view_safety_mgmt');
        if (error) return error;

        const { searchParams } = new URL(req.url)

        const parsed = spiKpiListSchema.safeParse({
            q: searchParams.get('q') ?? '',
            area: searchParams.get('area') ?? '',
            type: searchParams.get('type') ?? '',
            active: searchParams.get('active') ?? '',
        })

        if (!parsed.success) {
            return zodError(E.VL001, parsed.error)
        }

        const data = await listSpiKpiDefinitions(parsed.data)
        return NextResponse.json({ code: 1, data })
    } catch (err) {
        return internalError(E.SV001, err)
    }
}