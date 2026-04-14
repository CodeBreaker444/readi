import { logEvent } from '@/backend/services/auditLog/audit-log';
import { apiError, internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const { title, dcc } = body ?? {};

    if (!title || !dcc) return apiError(E.VL020, 400);

    logEvent({
      eventType: 'CREATE',
      entityType: 'dcc_bug_report',
      description: `DCC Error — ${title}: ${dcc?.message ?? 'unknown error'} (${dcc?.outcome ?? ''} ${dcc?.path ?? ''})`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
      metadata: { title, dcc },
    });

    return NextResponse.json({ code: 1 });
  } catch (err) {
    return internalError(E.DC006, err);
  }
}
