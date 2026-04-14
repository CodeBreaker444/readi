import { listDocuments } from '@/backend/services/document/document-service';
import { internalError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
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
            return zodError(E.VL001, parsed.error);
        }
        const data = await listDocuments({ ...parsed.data, ownerId: session!.user.ownerId });
        return NextResponse.json({ code: 1, message: 'Success', ...data });
    } catch (error: any) {
        console.error('[document_list]', error);
        return internalError(E.AU002, error);
    }
}