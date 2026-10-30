import { createChecklist, getChecklistsByOwner } from '@/backend/services/organization/checklist-service'
import type { ChecklistCreatePayload } from '@/config/types/checklist'
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'
import { zodError } from '@/lib/api-error'
import { E } from '@/lib/error-codes'

export async function GET(request: NextRequest) {
    try {
        const { session, error } = await requirePermission('view_config')
        if (error) return error

        const ownerId = session!.user.ownerId

        const result = await getChecklistsByOwner(ownerId)
        return NextResponse.json({result, message: 'Checklists retrieved successfully'}, {status: 200 })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error';
        return NextResponse.json({ message, code: 0, data: [], dataRows: 0 }, { status: 500 });

    }
}
const checklistSchema = z.object({
    checklist_code: z.string().max(50).min(1, 'Checklist code is required'),
    checklist_desc: z.string().min(1, 'Checklist description is required'),
    checklist_ver: z.string().refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) < 1000), 'must be a number between 0 and 999.99').optional(),
    checklist_active: z.enum(['Y', 'N']).optional(),
    checklist_json: z.string().optional(),
})
export async function POST(request: NextRequest) {
    let body: ChecklistCreatePayload

    try {
        body = await request.json()

        const { session, error } = await requirePermission('view_config')
        if (error) return error

        const { error: featureError } = await requireFeatureAccess('org_checklist', 'create')
        if (featureError) return featureError

        const validationResult = checklistSchema.safeParse(body)

        if (!validationResult.success) {
            return zodError(E.VL001, validationResult.error)
        }

        const result = await createChecklist(
            {
                checklist_code: body.checklist_code,
                checklist_desc: body.checklist_desc,
                checklist_ver: body.checklist_ver ?? '1.0',
                checklist_active: body.checklist_active ?? 'Y',
                checklist_json: body.checklist_json ?? '{}',
                fk_owner_id: session!.user.ownerId,
                fk_user_id: session!.user.userId,
            },
            session!.user.fullname,
            session!.user.email,
            session!.user.role
        )

        return NextResponse.json({...result, message: 'Checklist created successfully'}, { status: 201 })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error';
        return NextResponse.json({ message, code: 0, data: null, dataRows: 0 }, { status: 500 });
    }
}