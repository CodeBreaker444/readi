import { fetchCommunicationList } from "@/backend/services/organization/communication-service";
import { getUserSession } from "@/lib/auth/server-session";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ code: 0, message: "Unauthorized" }, { status: 401 });
    }

   const ownerId = session.user.ownerId

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