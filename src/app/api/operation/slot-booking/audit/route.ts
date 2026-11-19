import { listAuditLogs } from '@/backend/services/slot-booking/slot-booking-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') ?? '10', 10);
    const groupId = parseInt(searchParams.get('group_id') ?? '', 10);

    const result = await listAuditLogs(session!.user, {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 10,
      eventType: searchParams.get('event_type') || undefined,
      entityType: searchParams.get('entity_type') || undefined,
      groupId: Number.isFinite(groupId) ? groupId : undefined,
      dateFrom: searchParams.get('date_from') || undefined,
      dateTo: searchParams.get('date_to') || undefined,
    });
    return NextResponse.json({ code: 1, data: result });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
