import { createChecklist, getChecklistsByOwner } from '@/backend/services/organization/checklist-service'
import type { ChecklistCreatePayload } from '@/config/types/checklist'
import { getUserSession } from '@/lib/auth/server-session'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'

export async function GET(request: NextRequest) {
    try {
        const session = await getUserSession()
        if (!session || !session.user) {
            return NextResponse.json(
                { code: 0, message: 'Unauthorized', dataRows: 0, data: [] },
                { status: 401 }
            )
        }

        const ownerId = session.user.ownerId

        const result = await getChecklistsByOwner(ownerId)
        return NextResponse.json({result, message: 'Checklists retrieved successfully'}, {status: 200 })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error';
        return NextResponse.json({ message, code: 0, data: [], dataRows: 0 }, { status: 500 });

    }
}
const checklistSchema = z.object({
    checklist_code: z.string().min(1, 'Checklist code is required'),
    checklist_desc: z.string().min(1, 'Checklist description is required'),
    checklist_ver: z.string().optional(),
    checklist_active: z.enum(['Y', 'N']).optional(),
    checklist_json: z.string().optional(),
})
export async function POST(request: NextRequest) {
    let body: ChecklistCreatePayload

    try {
        body = await request.json()

        const session = await getUserSession()
        if (!session || !session.user) {
            return NextResponse.json(
                { code: 0, message: 'Unauthorized', dataRows: 0, data: null },
                { status: 401 } 
            )
        }


        const validationResult = checklistSchema.safeParse(body)

        if (!validationResult.success) {
            return NextResponse.json(
                { code: 0, message: 'Invalid checklist data', dataRows: 0, data: null },
                { status: 400 }
            )
        }

        const result = await createChecklist({
            checklist_code: body.checklist_code,
            checklist_desc: body.checklist_desc,
            checklist_ver: body.checklist_ver ?? '1.0',
            checklist_active: body.checklist_active ?? 'Y',
            checklist_json: body.checklist_json ?? '{}',
            fk_owner_id: session.user.ownerId,
            fk_user_id: session.user.userId,
        })

        return NextResponse.json({...result, message: 'Checklist created successfully'}, { status: 201 })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error';
        return NextResponse.json({ message, code: 0, data: null, dataRows: 0 }, { status: 500 });
    }
}