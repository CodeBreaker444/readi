import { fetchCommunicationList } from "@/backend/services/organization/communication-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

   const ownerId = session!.user.ownerId

    const data = await fetchCommunicationList(ownerId);

      return NextResponse.json({
             data,
            message: 'Communication list fetched successfully',
            code: 1,
            dataRows: 1,
        }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}