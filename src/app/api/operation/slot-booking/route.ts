import { getMe, getSettings, listGroups } from '@/backend/services/slot-booking/slot-booking-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const user = session!.user;
    const [defaults, groups] = await Promise.all([getSettings(user.ownerId), listGroups(user)]);
    return NextResponse.json({ code: 1, data: { me: getMe(user), defaults, groups } });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
