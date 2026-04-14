import { deleteCommunication } from "@/backend/services/organization/communication-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError, zodError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const deleteCommunicationSchema = z.object({
  communication_id: z.number().int().positive("Communication ID is required"),
});

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const body = await request.json();

    const parsed = deleteCommunicationSchema.safeParse({
      communication_id: Number(body.communication_id),
    });

    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const ownerId = session!.user.ownerId;

    const result = await deleteCommunication(parsed.data, ownerId);

    const status = result.code === 1 ? 200 : 422;
    return NextResponse.json(result, { status });

  } catch (err) {
    return internalError(E.SV001, err);
  }
}