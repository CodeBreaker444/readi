import { getTicketAttachments } from "@/backend/services/system/maintenance-ticket";
import { internalError, zodError } from "@/lib/api-error";
import { requireAnyPermission } from "@/lib/auth/api-auth";
import { E } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export async function GET(req: NextRequest) {
  try {
      const { session, error } = await requireAnyPermission('view_config', 'view_maintenance_tickets');
      if (error) return error;

    const ticketId = req.nextUrl.searchParams.get("ticket_id");
 
    const validation = z.object({ ticket_id: z.string().min(1, "ticket_id is required") }).safeParse({ ticket_id: ticketId });
    if (!validation.success) {
      return zodError(E.VL001, validation.error);
    }

    const data = await getTicketAttachments(Number(ticketId));

    return NextResponse.json({
      code: 1,
      message: "success",
      data,
    });
  } catch (error) {
    console.error("[attachments] error:", error);
    return internalError(E.SV001, error);
  }
}