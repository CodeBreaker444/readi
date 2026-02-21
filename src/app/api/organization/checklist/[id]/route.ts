import { deleteChecklist, getChecklistById, updateChecklist } from '@/backend/services/organization/checklist-service'
import type { ChecklistUpdatePayload } from '@/config/types/checklist'
import { getUserSession } from '@/lib/auth/server-session'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const session = await getUserSession()
        if (!session || !session.user) {
            return NextResponse.json(
                { code: 0, message: 'Unauthorized', dataRows: 0, data: null },
                { status: 401 }
            )
        }

        const result = await getChecklistById(Number(id))
        return NextResponse.json(result, { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { code: 0, message: 'Error retrieving checklist', dataRows: 0, data: null },
            { status: 500 }
        )
    }
}

const checklistSchema = z.object({
    checklist_code: z.string().min(1, 'Checklist code is required'),
    checklist_desc: z.string().min(1, 'Checklist description is required'),
    checklist_ver: z.string().optional(),
    checklist_active: z.enum(['Y', 'N']).optional(),
    checklist_json: z.string().optional(),
})

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const session = await getUserSession()
        if (!session || !session.user) {
            return NextResponse.json(
                { code: 0, message: 'Unauthorized', dataRows: 0, data: null },
                { status: 401 }
            )
        }


        let body: Omit<ChecklistUpdatePayload, 'checklist_id'>

        body = await request.json()


        if (!body.checklist_code || !body.checklist_desc) {
            return NextResponse.json(
                { code: 0, message: 'Missing required fields', dataRows: 0, data: null },
                { status: 400 }
            )
        }

        const validatedBody = checklistSchema.safeParse(body)
        if (!validatedBody.success) {
            return NextResponse.json(
                { code: 0, message: 'Invalid checklist data', dataRows: 0, data: null },
                { status: 400 }
            )
        }

        const result = await updateChecklist({ 
            ...validatedBody.data,
            checklist_id: Number(id), 
            checklist_ver: validatedBody.data.checklist_ver || '1.0', 
            checklist_active: validatedBody.data.checklist_active || 'Y', 
            checklist_json: validatedBody.data.checklist_json || '{}', 
            fk_owner_id: session.user.ownerId ,
            fk_user_id: session.user.userId })

        return NextResponse.json({ ...result, message: 'Checklist updated successfully' }, { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { code: 0, message: 'Error updating checklist', dataRows: 0, data: null },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try{
     const { id } = await params
        const session = await getUserSession()
        if (!session || !session.user) {
            return NextResponse.json(
                { code: 0, message: 'Unauthorized', dataRows: 0, data: null },
                { status: 401 }
            )
        }
    const ownerId = session.user.ownerId

    const result = await deleteChecklist(ownerId, Number(id))
    return NextResponse.json({ ...result, message: 'Checklist deleted successfully' }, { status:  200  })
    }catch (error) {
        return NextResponse.json(
            { code: 0, message: 'Error deleting checklist', dataRows: 0, data: null },
            { status: 500 }
        )
    }
}