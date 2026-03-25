import { getOperationLogbookFilters } from "@/backend/services/logbook/flight-logbook-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_logbooks');
    if (error) return error;

    const result = await getOperationLogbookFilters(session!.user.ownerId);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { code: 0, status: "ERROR", message: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}