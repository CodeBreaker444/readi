import { listSpiKpiDefinitions } from '@/backend/services/safetyManagement/spi-kpi-service'
import { AREAS, TYPES } from '@/config/types/safetyMng'
import { getUserSession } from '@/lib/auth/server-session'
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
        const session = await getUserSession();
        if (!session) {
            return NextResponse.json({ code: 0, error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)

        const parsed = spiKpiListSchema.safeParse({
            q: searchParams.get('q') ?? '',
            area: searchParams.get('area') ?? '',
            type: searchParams.get('type') ?? '',
            active: searchParams.get('active') ?? '',
        })

        if (!parsed.success) {
            return NextResponse.json(
                { code: 0, error: parsed.error.issues[0].message },
                { status: 400 }
            )
        }

        const data = await listSpiKpiDefinitions(parsed.data)
        return NextResponse.json({ code: 1, data })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json({ code: 0, error: message }, { status: 500 })
    }
}