import {
    createAssignment,
    getAssignmentsByOwner,
} from '@/backend/services/organization/assignment-service'
import { requirePermission } from '@/lib/auth/api-auth'
import { internalError, zodError } from '@/lib/api-error'
import { E } from '@/lib/error-codes'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'


export async function GET() {
  try {
    const { session, error } = await requirePermission('view_config')
    if (error) return error

    const result = await getAssignmentsByOwner(session!.user.ownerId)
    return NextResponse.json({ code: 1, data: result, dataRows: result.length, message: 'Assignments retrieved successfully' }, { status: 200 })
  } catch (err) {
    return internalError(E.SV001, err)
  }
}


const createSchema = z.object({
  assignment_code: z.string().min(1, 'Code is required'),
  assignment_desc: z.string().min(1, 'Description is required'),
  assignment_ver: z.string().optional().default('1.0'),
  assignment_active: z.enum(['Y', 'N']).optional().default('Y'),
  assignment_json: z.string().optional().default('{}'),
})

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config')
    if (error) return error

    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return zodError(E.VL001, parsed.error)
    }

    const result = await createAssignment({
      ...parsed.data,
      fk_owner_id: session!.user.ownerId,
      fk_user_id: session!.user.userId,
    })

   return NextResponse.json({ 
      code: 1, 
      data: result, 
      message: 'Assignment created successfully' 
    }, { status: 201 })
  } catch (err) {
    return internalError(E.SV001, err)
  }
}