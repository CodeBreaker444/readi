import { deleteCommunication } from "@/backend/services/organization/communication-service";
import { getUserSession } from "@/lib/auth/server-session";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const deleteCommunicationSchema = z.object({
  communication_id: z.number().int().positive("Communication ID is required"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ code: 0, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const parsed = deleteCommunicationSchema.safeParse({
      communication_id: Number(body.communication_id),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ownerId = session.user.ownerId;

    const result = await deleteCommunication(parsed.data, ownerId);

    const status = result.code === 1 ? 200 : 422;
    return NextResponse.json(result, { status });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}