import { listNotifications } from "@/backend/services/notification/notification-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError, zodError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const notificationListSchema = z.object({
  status: z.enum(["READ", "UNREAD", ""]).optional().default(""),
  procedure_name: z.string().max(100).optional().default(""),
  search: z.string().max(200).optional().default(""),
  date_from: z.string().optional().default(""),
  date_to: z.string().optional().default(""),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_notifications');
    if (error) return error;

    const body = await req.json();

    const userId = session!.user.userId;

    const parsed = notificationListSchema.safeParse(body);

    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const items = await listNotifications(parsed.data,userId);

    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}