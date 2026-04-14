import { logEvent } from '@/backend/services/auditLog/audit-log';
import { batchAutofill } from '@/backend/services/operation/operation-service';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const schema = z.object({
  mission_ids: z.array(z.number().int().positive()).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const ownerId = session!.user.ownerId;
    const body = await req.json();
    const { mission_ids } = schema.parse(body);

    //autofill only for COMPLETED missions with a pilot assigned
    const result = await batchAutofill(mission_ids, ownerId);

    logEvent({
      eventType: 'UPDATE',
      entityType: 'operation',
      description: `Batch autofill on ${result.processed.length} operation(s)`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId,
      metadata: {
        processed_ids: result.processed,
        skipped_ids: result.skipped,
      },
    });

    return NextResponse.json({
      processed: result.processed.length,
      skipped: result.skipped.length,
      processed_ids: result.processed,
      skipped_ids: result.skipped,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.flatten() }, { status: 400 });
    }
    console.error('[POST /api/operation/batch/autofill]', err);
    return internalError(E.SV001,err)
  }
}
