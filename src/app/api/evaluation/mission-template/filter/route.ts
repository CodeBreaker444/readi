
import { getMissionTemplateFilterOptions } from '@/backend/services/planning/mission-template';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_planning');
    if (error) return error;

    const data = await getMissionTemplateFilterOptions(session!.user.ownerId);
    return NextResponse.json({ code: 1, data });
  } catch (err: any) {
    return NextResponse.json(
      { code: 0, message: err.message ?? 'Server error' },
      { status: 500 },
    );
  }
}