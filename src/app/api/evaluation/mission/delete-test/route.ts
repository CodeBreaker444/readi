import { deleteMissionTestLogbook } from "@/backend/services/planning/mission-test-logbook";
import { getUserSession } from "@/lib/auth/server-session";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DeleteSchema = z.object({
  test_id: z.number().int().positive("Test ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = DeleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const ownerId = session.user.ownerId;
    await deleteMissionTestLogbook(ownerId, parsed.data.test_id);

    return NextResponse.json({ success: true, message: "Test deleted successfully" });
  } catch (error) {
    console.error("DELETE mission-test-logbook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}