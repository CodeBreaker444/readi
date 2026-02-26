import { getOperationLogbookFilters } from "@/backend/services/logbook/flight-logbook-service";
import { getUserSession } from "@/lib/auth/server-session";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { code: 0, status: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const result = await getOperationLogbookFilters(session.user.ownerId);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { code: 0, status: "ERROR", message: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}