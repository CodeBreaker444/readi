import { markAllNotificationsRead } from "@/backend/services/notification/notification-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {

    const { session, error } = await requirePermission('view_notifications');
    if (error) return error;
    const userId = session!.user.userId;

    const result = await markAllNotificationsRead(userId);

    return NextResponse.json({
      success: true,
      message: `${result.updated} notification(s) marked as read.`,
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}