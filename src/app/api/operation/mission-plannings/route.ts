import { getPlanningLogbookList } from '@/backend/services/planning/planning-dashboard';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const ownerId = session!.user.ownerId;
    const { searchParams } = new URL(req.url);
    const planningId = searchParams.get('planning_id');

    if (!planningId) {
      return NextResponse.json(
        { error: 'planning_id parameter is required' },
        { status: 400 }
      );
    }

    const planningIdNum = Number(planningId);
    if (isNaN(planningIdNum)) {
      return NextResponse.json(
        { error: 'Invalid planning_id' },
        { status: 400 }
      );
    }

    // Use the existing service function to fetch mission planning data
    const data = await getPlanningLogbookList(ownerId, planningIdNum);

    // Transform data to match MissionPlanningOption interface expected by ImportOperationDialog
    const transformedData = data.map((row) => ({
      mission_planning_id: row.mission_planning_id,
      mission_planning_code: row.mission_planning_code,
      mission_planning_desc: row.mission_planning_desc,
      mission_planning_active: row.mission_planning_active,
      fk_planning_id: row.fk_planning_id,
      tool_code: row.tool_code,
      mission_planning_name: `${row.mission_planning_code} — ${row.mission_planning_desc}`,
    }));

    return NextResponse.json({
      mission_plannings: transformedData,
    });
  } catch (err) {
    console.error('[GET /api/operation/mission-plannings]', err);
    return internalError(E.SV001, err);
  }
}
