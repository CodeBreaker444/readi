import { updateLocationGroup } from '@/backend/services/emergency-contact/erp-location-group-service'
import { ERP_TYPES } from '@/config/types/erp'
import { internalError, zodError } from '@/lib/api-error'
import { requirePermission } from '@/lib/auth/api-auth'
import { E } from '@/lib/error-codes'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'

const locationSchema = z.object({
  name: z.string().min(1),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
})

const newContactSchema = z.object({
  type: z.enum(ERP_TYPES),
  contact: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
})

const updateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  notes: z.string().max(2000).nullable().optional(),
  is_active: z.boolean(),
  locations: z.array(locationSchema).default([]),
  existing_contact_ids: z.array(z.number().int().positive()).default([]),
  new_contacts: z.array(newContactSchema).default([]),
})

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_erp')
    if (error) return error

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return zodError(E.VL001, parsed.error)

    const { id, ...input } = parsed.data
    const data = await updateLocationGroup(id, input, session!.user.ownerId)
    return NextResponse.json({ code: 1, data })
  } catch (err) {
    return internalError(E.SV001, err)
  }
}
