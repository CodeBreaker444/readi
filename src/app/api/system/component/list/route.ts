import { getComponentList } from '@/backend/services/system/system-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
      const { session, error } = await requirePermission('view_config');
      if (error) return error;

    const body = await request.json();
    const ownerId = body.o_id || session!.user.ownerId;
    const toolId = body.tool_id;

    const result = await getComponentList(ownerId, toolId);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}