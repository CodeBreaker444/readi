import { updateDocument } from '@/backend/services/document/document-service';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const DocumentUpdateSchema = z.object({
  document_id:     z.number().int().positive(),
  doc_type_id:     z.number().int().positive(),
  doc_code:        z.string().max(50).optional().nullable(),
  status:          z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'OBSOLETE']),
  title:           z.string().min(1).max(255),
  confidentiality: z.enum(['INTERNAL', 'PUBLIC', 'CONFIDENTIAL', 'RESTRICTED']),
  owner_role:      z.string().max(150).optional().nullable(),
  effective_date:  z.string().optional().nullable(),
  expiry_date:     z.string().optional().nullable(),
  description:     z.string().max(2000).optional().nullable(),
  keywords:        z.string().max(500).optional().nullable(),
  tags:            z.string().max(1000).optional().nullable(),
  fk_component_id: z.number().int().positive().optional().nullable(),
});
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_repository');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('document_repository', 'edit');
    if (featureError) return featureError;

    const body = await req.json();
    const parsed = DocumentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }
    await updateDocument({ ...parsed.data, owner_id: session!.user.ownerId });
    return NextResponse.json({ code: 1, message: 'Documento aggiornato' });
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'A document with code already exists.') {
      return apiError(E.DB005, 409);
    }

    console.error('[document_update]', error);
    return internalError(E.SV001, error);
    }
}