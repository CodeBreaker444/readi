import { aiEventFiltersSchema, listAiEvents } from '@/backend/services/logbook/ai-event-service';
import { zodError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const parsed = aiEventFiltersSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    // Only super admins see events beyond their own company's streams.
    const result = await listAiEvents({ ownerId: user.ownerId, isSuperAdmin: user.role === 'SUPERADMIN' }, parsed.data);
    return NextResponse.json({ code: 200, ...result });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
