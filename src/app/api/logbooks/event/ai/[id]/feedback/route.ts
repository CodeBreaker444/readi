import { logEvent } from '@/backend/services/auditLog/audit-log';
import { aiFeedbackSchema, submitAiFeedback } from '@/backend/services/logbook/ai-event-service';
import { apiError, zodError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

/** multipart/form-data: feedback_type, comment (optional), files (up to 2: PDF or image). */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const id = Number((await params).id);
    if (!Number.isInteger(id)) return apiError(E.VL002);

    const form = await request.formData().catch(() => null);
    if (!form) return apiError(E.VL001);

    const parsed = aiFeedbackSchema.safeParse({
      feedback_type: form.get('feedback_type'),
      comment: (form.get('comment') as string | null) ?? undefined,
    });
    if (!parsed.success) return zodError(E.VL001, parsed.error);
    const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);

    const user = session!.user;
    await submitAiFeedback({ ownerId: user.ownerId, isSuperAdmin: user.role === 'SUPERADMIN' }, { userId: user.userId, email: user.email }, id, parsed.data, files);

    logEvent({
      eventType: 'UPDATE',
      entityType: 'ai_event',
      entityId: id,
      description: `Sent AI detection feedback (${parsed.data.feedback_type})`,
      userId: user.userId,
      userName: user.fullname,
      userEmail: user.email,
      userRole: user.role,
      ownerId: user.ownerId,
    });
    return NextResponse.json({ code: 200 });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
