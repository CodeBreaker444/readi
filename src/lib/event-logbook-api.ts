import { EventLogbookError } from '@/backend/services/logbook/event-logbook-service';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';

/** Maps domain errors thrown by the event logbook services to HTTP responses. */
export function eventLogbookErrorResponse(err: unknown) {
  if (err instanceof EventLogbookError) {
    return NextResponse.json({ code: 0, error: err.message }, { status: err.status });
  }
  return internalError(E.SV001, err);
}
