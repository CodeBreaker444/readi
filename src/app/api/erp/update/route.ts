import { updateErp } from '@/backend/services/emergency-contact/erp-service'
import { ERP_TYPES } from '@/config/types/erp'
import { internalError, zodError } from '@/lib/api-error'
import { requirePermission } from '@/lib/auth/api-auth'
import { E } from '@/lib/error-codes'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'

const erpUpdateSchema = z.object({
  id: z.number().int().positive(),
  description: z.string().min(1).max(1000),
  contact: z.string().min(1).max(255),
  type: z.enum(ERP_TYPES),
})

export async function POST(req: NextRequest) {
  try {
    const { error } = await requirePermission('view_erp')
    if (error) return error

    const body = await req.json()
    const parsed = erpUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error)
    }

    const { id, ...rest } = parsed.data
    const data = await updateErp(id, rest)
    return NextResponse.json({ code: 1, data })
  } catch (err) {
    return internalError(E.SV001, err)
  }
}
