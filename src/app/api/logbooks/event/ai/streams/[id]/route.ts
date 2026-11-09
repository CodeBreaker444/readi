import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteStreamMapping, streamMappingUpdateSchema, updateStreamMapping } from '@/backend/services/logbook/ai-event-service';
import { apiError, zodError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const id = Number((await params).id);
    if (!Number.isInteger(id)) return apiError(E.VL002);

    const parsed = streamMappingUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    await updateStreamMapping(user.ownerId, id, parsed.data);

    logEvent({
      eventType: 'UPDATE',
      entityType: 'ai_stream_mapping',
      entityId: id,
      description: 'Updated AI stream mapping',
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

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const id = Number((await params).id);
    if (!Number.isInteger(id)) return apiError(E.VL002);

    const user = session!.user;
    await deleteStreamMapping(user.ownerId, id);

    logEvent({
      eventType: 'DELETE',
      entityType: 'ai_stream_mapping',
      entityId: id,
      description: 'Deleted AI stream mapping',
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
