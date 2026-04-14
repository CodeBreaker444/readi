import { getOperationLogbookFilters } from "@/backend/services/logbook/flight-logbook-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_logbooks');
    if (error) return error;

    const result = await getOperationLogbookFilters(session!.user.ownerId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}