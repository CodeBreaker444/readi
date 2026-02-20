import { deleteShift } from '@/backend/services/shift/crew-shift-service'
import { getUserSession } from '@/lib/auth/server-session'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'

const deleteShiftSchema = z.object({
  shift_id: z.number().int().positive('Shift ID must be a positive integer'),
})

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const shiftId = Number((await params).id)

   const session = await getUserSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }   

    const parsed = deleteShiftSchema.safeParse({ shift_id: shiftId })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }
    
    const ownerId = session.user.ownerId

    await deleteShift(parsed.data.shift_id, ownerId)

    return NextResponse.json({ success: true, message: 'Shift deleted successfully' })
  } catch (err: any) {
    console.error('[DELETE /api/shifts/[id]]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}