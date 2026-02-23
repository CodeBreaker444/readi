import { markAllNotificationsRead } from "@/backend/services/notification/notification-service";
import { getUserSession } from "@/lib/auth/server-session";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {

    const session = await getUserSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const userId = session.user.userId;

    const result = await markAllNotificationsRead(userId);

    return NextResponse.json({
      success: true,
      message: `${result.updated} notification(s) marked as read.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}