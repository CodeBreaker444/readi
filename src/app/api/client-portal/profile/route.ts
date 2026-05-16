import { getProfile } from '@/backend/services/user/user-profile';
import { supabase } from '@/backend/database/database';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requirePermission('view_client_portal');
    if (error) return error;

    const { userId, clientId } = session!.user;

    const [userProfile, clientRow] = await Promise.all([
      getProfile(userId),
      clientId
        ? supabase
            .from('client')
            .select('client_name, client_legal_name, client_code, client_email, client_phone, client_website, client_city, client_state, client_postal_code, contract_start_date, contract_end_date')
            .eq('client_id', clientId)
            .single()
            .then(({ data }) => data)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({ success: true, user: userProfile, client: clientRow });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_client_portal');
    if (error) return error;

    const { userId, clientId } = session!.user;
    if (!clientId) {
      return NextResponse.json({ error: 'No client associated with this account' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const phone = typeof body.client_phone === 'string' ? body.client_phone.trim() : '';

    const [clientUpdate, userUpdate] = await Promise.all([
      supabase.from('client').update({ client_phone: phone || null }).eq('client_id', clientId),
      supabase.from('users').update({ phone: phone || null }).eq('user_id', userId),
    ]);

    if (clientUpdate.error) return NextResponse.json({ error: clientUpdate.error.message }, { status: 500 });
    if (userUpdate.error) return NextResponse.json({ error: userUpdate.error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
