import { listDocuments } from '@/backend/services/document/document-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const DocumentListSchema = z.object({
    area: z.enum([
        'BOARD', 'COMPLIANCE', 'DATACONTROLLER', 'MAINTENANCE',
        'OPERATION', 'SAFETY', 'SECURITY', 'TRAINING', 'VENDOR',
    ]).optional(),
    category: z.string().max(100).optional(),
    status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'OBSOLETE']).optional(),
    owner_role: z.string().max(150).optional(),
    search: z.string().max(255).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { session, error } = await requirePermission('view_repository');
        if (error) return error;
        const parsed = DocumentListSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const data = await listDocuments({ ...parsed.data, ownerId: session!.user.ownerId });
        return NextResponse.json(data);
    } catch (err) {
        console.error('[document_list]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}