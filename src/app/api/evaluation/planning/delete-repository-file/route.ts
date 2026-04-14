import { deleteRepositoryFile } from "@/backend/services/planning/planning-dashboard";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError, zodError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  file_id: z.number().int().positive(),
  file_type: z.enum(["mission_planning_logbook", "mission_planning_test_logbook"]),
  s3_key: z.string().optional().default(""),
});

export async function POST(request: Request) {
  try {
    const { session, error } = await requirePermission('view_planning');
    if (error) return error;

    const body = await request.json();
    const parsed = schema.safeParse(body);
    
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const { file_id, file_type, s3_key } = parsed.data;
    
    await deleteRepositoryFile(
      file_id, 
      file_type, 
      s3_key, 
      session!.user.ownerId
    );

    return NextResponse.json({ code: 1, message: "File deleted successfully" });
    
  } catch (err) {
    console.error("API Route Error:", err);
    return internalError(E.SV001, err);
  }
}