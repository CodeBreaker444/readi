import { logEvent } from '@/backend/services/auditLog/audit-log';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) return NextResponse.json({ code: 0 }, { status: 401 });

    const { title, dcc } = await req.json();

    logEvent({
      eventType: 'CREATE',
      entityType: 'dcc_bug_report',
      description: `DCC Error — ${title}: ${dcc?.message ?? 'unknown error'} (${dcc?.outcome ?? ''} ${dcc?.path ?? ''})`,
      userId: session.user.userId,
      userName: session.user.fullname,
      userEmail: session.user.email,
      userRole: session.user.role,
      ownerId: session.user.ownerId,
      metadata: { title, dcc },
    });

    return NextResponse.json({ code: 1 });
  } catch (err: any) {
    return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
  }
}
