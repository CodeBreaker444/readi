import { deleteLocationGroup } from '@/backend/services/emergency-contact/erp-location-group-service'
import { internalError, zodError } from '@/lib/api-error'
import { requirePermission } from '@/lib/auth/api-auth'
import { E } from '@/lib/error-codes'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'

const deleteSchema = z.object({ id: z.number().int().positive() })

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_erp')
    if (error) return error

    const body = await req.json()
    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) return zodError(E.VL001, parsed.error)

    await deleteLocationGroup(parsed.data.id, session!.user.ownerId)
    return NextResponse.json({ code: 1 })
  } catch (err) {
    return internalError(E.SV001, err)
  }
}
