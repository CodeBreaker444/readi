import { createErp } from '@/backend/services/emergencyContact/erp-service'
import { ERP_TYPES } from '@/config/types/erp'
import { internalError, zodError } from '@/lib/api-error'
import { requirePermission } from '@/lib/auth/api-auth'
import { E } from '@/lib/error-codes'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'

const erpCreateSchema = z.object({
  description: z.string().min(1, 'Description is required').max(1000),
  contact: z.string().min(1, 'Contact is required').max(255),
  type: z.enum(ERP_TYPES),
})

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_erp')
    if (error) return error

    const body = await req.json()
    const parsed = erpCreateSchema.safeParse(body)
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error)
    }

    const data = await createErp({
      ...parsed.data,
      owner_id: session!.user.ownerId,
    })
    return NextResponse.json({ code: 1, data }, { status: 201 })
  } catch (err) {
    return internalError(E.SV001, err)
  }
}
