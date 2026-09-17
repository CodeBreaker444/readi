import { authorizeMissionWithDFlight } from '@/backend/services/integrations/dflight-mission-authorization-service';
import { getOperation } from '@/backend/services/operation/operation-service';
import { apiError, internalError, notFound } from '@/lib/api-error';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  params: Promise<{ id: string }>;
}

/** Manual retry/first-submit of D-Flight flight authorization for one mission — the
 * automatic attempt at creation time only fires for PDRA missions with trajectory
 * data; this lets a pilot/ops-manager (re)trigger it from the mission table. */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('operation_mission_table', 'edit');
    if (featureError) return featureError;

    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return apiError(E.VL002, 400);

    const existing = await getOperation(id);
    if (!existing) return notFound(E.NF004);

    const { create, watch } = await authorizeMissionWithDFlight(id, session!.user.ownerId);

    const updated = await getOperation(id);

    return NextResponse.json({
      success: create.outcome !== 'error',
      create,
      watch,
      operation: updated,
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
