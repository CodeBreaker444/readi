import { logEvent } from '@/backend/services/auditLog/audit-log';
import { createDocument } from '@/backend/services/document/document-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const DocumentCreateSchema = z.object({
  doc_type_id:     z.number().int().positive(),
  s3_key:          z.string().min(1, 'S3 key is required'),
  file_name:       z.string().min(1, 'File name is required'),
  file_size:       z.number().int().positive(),
  doc_code:        z.string().max(50).optional(),
  status:          z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'OBSOLETE']).default('DRAFT'),
  title:           z.string().min(1, 'Title is required').max(255),
  confidentiality: z.enum(['INTERNAL', 'PUBLIC', 'CONFIDENTIAL', 'RESTRICTED']).default('INTERNAL'),
  owner_role:      z.string().max(150).optional().nullable(),
  effective_date:  z.string().optional().nullable(),
  expiry_date:     z.string().optional().nullable(),
  description:     z.string().max(2000).optional().nullable(),
  keywords:        z.string().max(500).optional().nullable(),
  tags:            z.string().max(1000).optional().nullable(),
  version_label:   z.string().max(20).optional().nullable(),
  change_log:      z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_repository');
    if (error) return error;
    const ownerId = session!.user.ownerId;

    const body = await req.json();
    const parsed = DocumentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const { s3_key, file_name, file_size, owner_role, description, keywords, tags, version_label, change_log, ...rest } = parsed.data;

    const docInput = {
      ...rest,
      owner_role:    owner_role    ?? undefined,
      description:   description   ?? undefined,
      keywords:      keywords      ?? undefined,
      tags:          tags          ?? undefined,
      version_label: version_label ?? undefined,
      change_log:    change_log    ?? undefined,
    };

    const result = await createDocument(docInput, s3_key, file_name, file_size, ownerId);

    logEvent({
      eventType: 'CREATE',
      entityType: 'document',
      entityId: result?.document_id,
      description: `Created document '${parsed.data.title}'`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId,
      metadata: { code: parsed.data.doc_code, status: parsed.data.status },
    });

    return NextResponse.json({ code: 1, message: 'Document created', ...result }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'A document with code already exists.') {
      return apiError(E.DB005, 409);
    }

    console.error('[document_create]', err);
    return internalError(E.SV001, err);
  }
}
