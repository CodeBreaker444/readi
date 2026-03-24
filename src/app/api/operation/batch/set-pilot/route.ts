import { logEvent } from '@/backend/services/auditLog/audit-log';
import { batchSetPilot } from '@/backend/services/operation/operation-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const schema = z.object({
  mission_ids: z.array(z.number().int().positive()).min(1),
  pilot_id: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ownerId = session.user.ownerId;
    const body = await req.json();
    const { mission_ids, pilot_id } = schema.parse(body);

    // pilot can only be set on PLANNED missions
    const result = await batchSetPilot(mission_ids, pilot_id, ownerId);

    logEvent({
      eventType: 'UPDATE',
      entityType: 'operation',
      description: `Batch set pilot '${result.pilotName}' on ${result.updated.length} operation(s)`,
      userId: session.user.userId,
      userName: session.user.fullname,
      userEmail: session.user.email,
      userRole: session.user.role,
      ownerId,
      metadata: {
        pilot_id,
        updated_ids: result.updated,
        skipped_ids: result.skipped,
      },
    });

    return NextResponse.json({
      updated: result.updated.length,
      skipped: result.skipped.length,
      updated_ids: result.updated,
      skipped_ids: result.skipped,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.flatten() }, { status: 400 });
    }
    console.error('[POST /api/operation/batch/set-pilot]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
