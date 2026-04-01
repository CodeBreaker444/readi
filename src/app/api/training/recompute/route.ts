import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_training');
    if (error) return error;

    // const user = session!.user;

    // let period = '';
    // try {
    //   const body = await req.json();
    //   if (body?.period) period = body.period;
    // } catch {
    // }

    // const payload = {
    //   owner_id: user.ownerId,
    //   user_id: user.userId,
    //   user_timezone: user.timezone || 'UTC',
    //   user_profile_code: user.role || '',
    //   period,
    // };

    // const cookieStore = await cookies();
    // const token = cookieStore.get('readi_auth_token')?.value ?? '';

    // const apiUri = process.env.READI_API_URI || 'http://localhost/api/';
    // const xApiKey = process.env.READI_X_API_KEY || '';
    // const url = `${apiUri}owner/${user.ownerId}/training/run/monthly`;

    // const upstream = await fetch(url, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     Authorization: `Bearer ${token}`,
    //     'X-API-KEY': xApiKey,
    //     'cache-control': 'no-cache',
    //   },
    //   body: JSON.stringify(payload),
    // });

    // const data = await upstream.text();

    return NextResponse.json({ code: 1, message: 'Recompute triggered' });

    // return new NextResponse(data, {
    //   status: upstream.status,
    //   headers: { 'Content-Type': 'application/json' },
    // });
  } catch (err: any) {
    console.error('[POST /api/training/recompute]', err);
    return NextResponse.json(
      { code: 0, error: err?.message ?? 'Error' },
      { status: 500 }
    );
  }
}
