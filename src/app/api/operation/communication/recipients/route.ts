import { fetchUsers } from '@/backend/services/operation/communication-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const ownerId: number = session!.user.ownerId
    const { searchParams } = new URL(req.url);
    const procedure = searchParams.get('procedure') ?? 'operation';

    const data = await fetchUsers(ownerId)

    const recipients = (data ?? []).map((u: any) => ({
      id: u.user_id,
      name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
      role: u.user_role ?? '',
      email: u.email ?? '',
      text: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
        + (u.user_role ? ` — ${u.user_role}` : ''),
    }));

    return NextResponse.json({ recipients, procedure });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}