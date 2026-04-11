import { supabase } from '@/backend/database/database';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const requestId = Number((await params).id);
    if (!requestId || requestId <= 0) {
      return NextResponse.json({ code: 0, error: 'Invalid request ID' }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from('flight_requests')
      .delete()
      .eq('request_id', requestId)
      .eq('fk_owner_id', session!.user.ownerId);

    if (dbError) throw new Error(dbError.message);

    return NextResponse.json({ code: 1, message: 'Flight request deleted' });
  } catch (err: any) {
    return NextResponse.json({ code: 0, error: err.message }, { status: 500 });
  }
}
