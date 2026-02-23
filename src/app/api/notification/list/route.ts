import { listNotifications } from "@/backend/services/notification/notification-service";
import { getUserSession } from "@/lib/auth/server-session";
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
    const session = await getUserSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const userId = session.user.userId;

    const parsed = notificationListSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error  },
        { status: 400 }
      );
    }

    const items = await listNotifications(parsed.data,userId);

    return NextResponse.json({ success: true, data: items });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}