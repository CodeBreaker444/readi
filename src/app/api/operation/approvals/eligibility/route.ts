import { getApprovalEligibility } from '@/backend/services/operation/mission-approval-service';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';

/** Tells the mission creation modal whether approval applies and whether an OPM exists to give it. */
export async function GET() {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const eligibility = await getApprovalEligibility(session!.user);
    return NextResponse.json({ code: 1, ...eligibility });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
