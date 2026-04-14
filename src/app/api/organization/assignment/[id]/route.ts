import {
    deleteAssignment,
    getAssignmentById,
    updateAssignment,
} from '@/backend/services/organization/assignment-service'
import { requirePermission } from '@/lib/auth/api-auth'
import { apiError, internalError, zodError } from '@/lib/api-error'
import { E } from '@/lib/error-codes'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'


export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('view_config')
    if (error) return error

    const id = parseInt((await params).id)
    if (isNaN(id)) {
      return apiError(E.VL002, 400)
    }

    const result = await getAssignmentById(session!.user.ownerId, id)
    return NextResponse.json({ ...result, message: 'Assignment retrieved successfully' }, { status: 200 })
  } catch (err) {
    return internalError(E.SV001, err)
  }
}


const updateSchema = z.object({
  assignment_code: z.string().min(1, 'Code is required'),
  assignment_desc: z.string().min(1, 'Description is required'),
  assignment_ver: z.coerce.number().optional().default(1.0),
  assignment_active: z.enum(['Y', 'N']),
  assignment_json: z.string().optional().default('{}'),
})

export async function PUT(request: NextRequest,  { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('view_config')
    if (error) return error

    const id = parseInt((await params).id)
    

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return zodError(E.VL001, parsed.error)
    }

    const result = await updateAssignment({
      assignment_id: id,
      fk_owner_id: session!.user.ownerId,
      fk_user_id: session!.user.userId,
      ...parsed.data,
    })

    return NextResponse.json({ ...result, message: 'Assignment updated successfully' }, { status: 200 })
  } catch (err) {
    return internalError(E.SV001, err)
  }
}


export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('view_config')
    if (error) return error

    const id = parseInt((await params).id)
    if (isNaN(id)) {
      return apiError(E.VL002, 400)
    }

    const result = await deleteAssignment(session!.user.ownerId, id)
    return NextResponse.json({...result, message: 'Assignment deleted successfully'}, { status: 200 })
  } catch (err) {
    return internalError(E.SV001, err)
  }
}