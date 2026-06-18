import { getUserSubroles, grantSubRole, revokeSubRole } from '@/backend/services/system/user-subrole';
import { forbidden, internalError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { SubRole } from '@/lib/auth/roles';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const MANAGE_SUBROLE_ROLES = ['RM', 'ADMIN', 'SUPERADMIN'];

const subroleSchema = z.object({
  user_id: z.coerce.number(),
  subrole: z.enum(['PIC_TECHNICIAN']),
  action: z.enum(['grant', 'revoke']),
});

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('manage_users');
    if (error) return error;

    const userId = Number(req.nextUrl.searchParams.get('user_id'));
    if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

    const subroles = await getUserSubroles(userId);
    return NextResponse.json({ subroles });
  } catch (err) {
    console.error('[GET /api/team/user/subrole]', err);
    return internalError(E.SV001, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('manage_users');
    if (error) return error;

    if (!MANAGE_SUBROLE_ROLES.includes(session!.user.role ?? '')) {
      return forbidden(E.PX001);
    }

    const body = await req.json();
    const validation = subroleSchema.safeParse(body);
    if (!validation.success) return zodError(E.VL001, validation.error);

    const { user_id, subrole, action } = validation.data;

    if (action === 'grant') {
      await grantSubRole(user_id, subrole as SubRole, session!.user.userId);
      return NextResponse.json({ status: 'OK', message: `${subrole} granted` });
    }

    const { hadOpenIntervention } = await revokeSubRole(user_id, subrole as SubRole, session!.user.userId);

    if (hadOpenIntervention) {
      return NextResponse.json(
        {
          status: 'ERROR',
          error: 'Cannot revoke: this technician has an active intervention in progress. End the intervention first, then revoke the sub-role.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ status: 'OK', message: `${subrole} revoked` });
  } catch (err) {
    console.error('[POST /api/team/user/subrole]', err);
    return internalError(E.SV001, err);
  }
}
