import { getTicketAttachments } from "@/backend/services/system/maintenance-ticket";
import { getUserSession } from "@/lib/auth/server-session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user) {
      return NextResponse.json(
        { code: 0, message: "Unauthorized", data: [] },
        { status: 401 }
      );
    }

    const ticketId = req.nextUrl.searchParams.get("ticket_id");
    if (!ticketId) {
      return NextResponse.json(
        { code: 0, message: "ticket_id is required", data: [] },
        { status: 400 }
      );
    }

    const data = await getTicketAttachments(Number(ticketId));

    return NextResponse.json({
      code: 1,
      message: "success",
      data,
    });
  } catch (error) {
    console.error("[attachments] error:", error);
    return NextResponse.json(
      {
        code: 0,
        message: error instanceof Error ? error.message : "Internal server error",
        data: [],
      },
      { status: 500 }
    );
  }
}