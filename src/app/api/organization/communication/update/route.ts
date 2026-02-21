import { updateCommunication } from "@/backend/services/organization/communication-service";
import { getUserSession } from "@/lib/auth/server-session";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateCommunicationSchema = z.object({
  communication_id: z.number().int().positive("Communication ID is required"),
  communication_code: z
    .string()
    .min(1, "Code is required")
    .max(50, "Code must be under 50 characters"),
  communication_desc: z
    .string()
    .min(1, "Description is required")
    .max(255, "Description must be under 255 characters"),
  communication_ver: z
    .string()
    .min(1, "Version is required")
    .max(20, "Version must be under 20 characters"),
  communication_active: z.enum(["Y", "N"], "Active must be 'Y' or 'N'"),
  communication_json: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ code: 0, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const parsed = updateCommunicationSchema.safeParse({
      ...body,
      communication_id: Number(body.communication_id),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ownerId = session.user.ownerId;
    const { communication_id, ...updatePayload } = parsed.data;

    const result = await updateCommunication(communication_id, ownerId, updatePayload);

    const status = result.code === 1 ? 200 : 422;
    return NextResponse.json(result, { status });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}