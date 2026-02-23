import { deleteNotification } from "@/backend/services/notification/notification-service";
import { getUserSession } from "@/lib/auth/server-session";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const deleteNotificationSchema = z.object({
  notification_id: z.coerce.number().int().positive("notification_id is required"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const body = await req.json();

    const parsed = deleteNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error },
        { status: 400 }
      );
    }

    await deleteNotification(parsed.data.notification_id, session.user.userId);

    return NextResponse.json({ success: true, message: "Notification deleted." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}