import { getComponentList, getDroneList, getUserList } from '@/backend/services/system/maintenance-ticket';
import { getUserSession } from '@/lib/auth/server-session';
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

    const session = await getUserSession();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }

    const validation = getLookupsSchema.safeParse({
      type:    searchParams.get('type'),
      tool_id: searchParams.get('tool_id'),    
      profile: searchParams.get('profile'),   
    });

    if (!validation.success) {
      return NextResponse.json(
        { code: 0, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { type, tool_id, profile } = validation.data;

    switch (type) {
      case 'drones': {
        const owner_id = session.user.ownerId;
        if (!owner_id)
          return NextResponse.json({ status: 'ERROR', message: 'Missing owner_id' }, { status: 400 });

        const drones = await getDroneList(owner_id);
        return NextResponse.json({ status: 'OK', data: drones });
      }

      case 'components': {
        if (!tool_id)
          return NextResponse.json({ status: 'ERROR', message: 'Missing tool_id' }, { status: 400 });

        const components = await getComponentList(Number(tool_id));
        return NextResponse.json({ status: 'OK', data: components });
      }

      case 'users': {
        const users = await getUserList(profile ?? undefined);
        return NextResponse.json({ status: 'OK', data: users });
      }

      default:
        return NextResponse.json(
          { status: 'ERROR', message: 'Invalid type. Use: drones | components | users' },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error('[GET /api/system/maintenance/lookups]', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}