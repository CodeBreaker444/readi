import { markNotificationRead } from "@/backend/services/notification/notification-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError, zodError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const markReadSchema = z.object({
  notification_id: z.coerce.number().int().positive("notification_id is required"),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_notifications');
    if (error) return error;
    const body = await req.json();

    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    await markNotificationRead(parsed.data,session!.user.userId );

    return NextResponse.json({ success: true, message: "Marked as read." });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}