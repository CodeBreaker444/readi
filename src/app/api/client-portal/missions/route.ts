import { listClientPortalMissions } from '@/backend/services/client/client-portal-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ABORTED']).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { clientId, ownerId } = session!.user;

    if (!clientId) {
      return NextResponse.json({ error: 'No client associated with this account' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const params = querySchema.parse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    });

    const result = await listClientPortalMissions(clientId, ownerId, params);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
    }
    return internalError(E.SV001, err);
  }
}
