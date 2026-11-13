import { SlotBookingError } from '@/backend/services/slot-booking/slot-booking-service';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';

/** Maps domain errors thrown by the slot booking service (not found, conflict, forbidden…) to HTTP responses. */
export function slotBookingErrorResponse(err: unknown) {
  if (err instanceof SlotBookingError) {
    return NextResponse.json({ code: 0, error: err.message, ...(err.extra ?? {}) }, { status: err.status });
  }
  return internalError(E.SV001, err);
}

/** Positive integer route id, or null when the segment is not one */
export function parseRouteId(raw: string): number | null {
  const id = /^\d+$/.test(raw) ? Number(raw) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
