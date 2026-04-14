import { getComponentList, getDroneList, getUserList } from '@/backend/services/system/maintenance-ticket';
import { requirePermission } from '@/lib/auth/api-auth';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const getLookupsSchema = z.object({
  type: z.enum(['drones', 'components', 'users']),
  tool_id: z.string().nullable().optional(),
  profile: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const validation = getLookupsSchema.safeParse({
      type: searchParams.get('type'),
      tool_id: searchParams.get('tool_id'),
      profile: searchParams.get('profile'),
    });

    if (!validation.success) {
      return zodError(E.VL001, validation.error);
    }

    const { type, tool_id, profile } = validation.data;

    const owner_id = session!.user.ownerId;

    switch (type) {
      case 'drones': {
        if (!owner_id) return apiError(E.SS002, 400);

        const drones = await getDroneList(owner_id);
        return NextResponse.json({ status: 'OK', data: drones });
      }

      case 'components': {
        if (!tool_id) return apiError(E.VL002, 400);

        const components = await getComponentList(Number(tool_id));
        return NextResponse.json({ status: 'OK', data: components });
      }

      case 'users': {
        const users = await getUserList(owner_id, profile ?? undefined);
        return NextResponse.json({ status: 'OK', data: users });
      }

      default:
        return NextResponse.json(
          { status: 'ERROR', message: 'Invalid type. Use: drones | components | users' },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('[GET /api/system/maintenance/lookups]', err);
    return internalError(E.SV001, err);
  }
}
