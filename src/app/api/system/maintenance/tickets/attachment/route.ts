import { getTicketAttachments } from "@/backend/services/system/maintenance-ticket";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
      const { session, error } = await requirePermission('view_config');
      if (error) return error;

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