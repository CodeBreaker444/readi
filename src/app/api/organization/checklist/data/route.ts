import { getChecklistByCode } from '@/backend/services/organization/checklist-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { session: _session, error } = await requirePermission('view_config');
    if (error) return error;

    const body = await req.json();
    const { o_id, checklist_code } = body;

    const checklist = await getChecklistByCode(checklist_code, o_id);

    if (!checklist) {
      return NextResponse.json({
        code: 0,
        message: 'Checklist not found',
        dataRows: 0,
      });
    }

    return NextResponse.json({
      code: 1,
      message: 'success',
      dataRows: 1,
      data: checklist,
    });
  } catch (error) {
    console.error('Error fetching checklist:', error);
    return NextResponse.json(
      { code: 0, message: 'Internal server error' },
      { status: 500 }
    );
  }
}