
import { getMissionTemplateFilterOptions } from '@/backend/services/planning/mission-template';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { code: 0, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const data = await getMissionTemplateFilterOptions(session.user.ownerId);
    return NextResponse.json({ code: 1, data });
  } catch (err: any) {
    return NextResponse.json(
      { code: 0, message: err.message ?? 'Server error' },
      { status: 500 },
    );
  }
}