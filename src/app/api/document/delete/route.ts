import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteDocument } from '@/backend/services/document/document-service';
import { internalError, unauthorized, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { getUserSession } from '@/lib/auth/server-session';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const DocumentDeleteSchema = z.object({
  document_id: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_repository');
    if (error) return error;
    const ownerId = session!.user.ownerId;
    const body = await req.json();
    const parsed = DocumentDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }
    await deleteDocument({ document_id: parsed.data.document_id });

    logEvent({
      eventType: 'DELETE',
      entityType: 'document',
      entityId: parsed.data.document_id,
      description: `Deleted document ID ${parsed.data.document_id}`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
    });

    return NextResponse.json({ code: 1, message: 'Documento eliminato' });
  } catch (error: any) {
    console.error('[document_delete]', error);
    return internalError(E.AU002, error);
  }
}