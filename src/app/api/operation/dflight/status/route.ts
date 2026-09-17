import { requirePermission } from '@/lib/auth/api-auth';
import { NextResponse } from 'next/server';

/** Lightweight check for whether D-Flight is toggled on for the caller's
 * organization — session-backed, so it costs no D-Flight/DB round trip,
 * unlike /api/operation/dflight/uspace-list which also fetches the uspace list. */
export async function GET() {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    return NextResponse.json({ enabled: !!session!.user.dFlightEnabled });
}
