import { createShiftSchema } from '@/app/api/team/shift/schema'
import { createShift } from '@/backend/services/shift/crew-shift-service'
import { requirePermission } from '@/lib/auth/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'


export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('manage_users');
    if (error) return error;

    const ownerId = session!.user.ownerId

    const body = await req.json()

    const parsed = createShiftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 422 }
      )
    }

    const newShiftIds = await createShift(parsed.data, ownerId)

    return NextResponse.json(
      {
        success: true,
        newShiftIds,
        message: `Created ${newShiftIds.length} shift(s) successfully`,
      },
      { status: 201 }
    )
  } catch (err: any) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.flatten().fieldErrors },
        { status: 422 }
      )
    }
    console.error('[POST /api/shifts/create]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}