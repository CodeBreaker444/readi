import {
    deleteAssignment,
    getAssignmentById,
    updateAssignment,
} from '@/backend/services/organization/assignment-service'
import { getUserSession } from '@/lib/auth/server-session'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'


export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getUserSession()
    if (!session?.user) {
      return NextResponse.json(
        { code: 0, message: 'Unauthorized', dataRows: 0, data: null },
        { status: 401 }
      )
    }

    const id = parseInt((await params).id)
    if (isNaN(id)) {
      return NextResponse.json(
        { code: 0, message: 'Invalid ID', dataRows: 0, data: null },
        { status: 400 }
      )
    }

    const result = await getAssignmentById(session.user.ownerId, id)
    return NextResponse.json({ ...result, message: 'Assignment retrieved successfully' }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json(
      { code: 0, message, dataRows: 0, data: null },
      { status: 500 }
    )
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
    const session = await getUserSession()
    if (!session?.user) {
      return NextResponse.json(
        { code: 0, message: 'Unauthorized', dataRows: 0, data: null },
        { status: 401 }
      )
    }

    const id = parseInt((await params).id)
    

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 0,
          message: 'Validation failed',
          errors: parsed.error.flatten().fieldErrors,
          dataRows: 0,
          data: null,
        },
        { status: 400 }
      )
    }

    const result = await updateAssignment({
      assignment_id: id,
      fk_owner_id: session.user.ownerId,
      fk_user_id: session.user.userId,
      ...parsed.data,
    })

    return NextResponse.json({ ...result, message: 'Assignment updated successfully' }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json(
      { code: 0, message, dataRows: 0, data: null },
      { status: 500 }
    )
  }
}


export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getUserSession()
    if (!session?.user) {
      return NextResponse.json(
        { code: 0, message: 'Unauthorized', dataRows: 0, data: null },
        { status: 401 }
      )
    }

    const id = parseInt((await params).id)
    if (isNaN(id)) {
      return NextResponse.json(
        { code: 0, message: 'Invalid ID', dataRows: 0, data: null },
        { status: 400 }
      )
    }

    const result = await deleteAssignment(session.user.ownerId, id)
    return NextResponse.json({...result, message: 'Assignment deleted successfully'}, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json(
      { code: 0, message, dataRows: 0, data: null },
      { status: 500 }
    )
  }
}