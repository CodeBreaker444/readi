import { getProfile } from '@/backend/services/user/user-profile';
import { prisma } from '@/lib/prisma';
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
        ? prisma.client.findUnique({
            where: { client_id: clientId },
            select: {
              client_name: true,
              client_legal_name: true,
              client_code: true,
              client_email: true,
              client_phone: true,
              client_website: true,
              client_city: true,
              client_state: true,
              client_postal_code: true,
              contract_start_date: true,
              contract_end_date: true,
            },
          })
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

    await Promise.all([
      prisma.client.update({
        where: { client_id: clientId },
        data: { client_phone: phone || null },
      }),
      prisma.public_users.update({
        where: { user_id: userId },
        data: { phone: phone || null },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
