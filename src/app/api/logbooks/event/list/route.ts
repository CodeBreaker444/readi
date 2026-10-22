import { listEvents } from '@/backend/services/logbook/event-logbook-service';
import { requireFeatureAccess } from '@/lib/auth/api-auth';
import { zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  tool_id: z.coerce.number().int().optional(),
  mission_id: z.coerce.number().int().optional(),
  event_type_id: z.coerce.number().int().optional(),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireFeatureAccess('logbook_event', 'create');
    if (error) return error;

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const data = await listEvents(session!.user, {
      ...parsed.data,
      tool_id: parsed.data.tool_id || undefined,
      mission_id: parsed.data.mission_id || undefined,
      event_type_id: parsed.data.event_type_id || undefined,
    });
    return NextResponse.json({ code: 200, data });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
