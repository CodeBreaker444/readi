import { deleteRepositoryFile } from "@/backend/services/planning/planning-dashboard";
import { requirePermission } from "@/lib/auth/api-auth";
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
      return NextResponse.json(
        { code: 0, message: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { file_id, file_type, s3_key } = parsed.data;
    
    await deleteRepositoryFile(
      file_id, 
      file_type, 
      s3_key, 
      session!.user.ownerId
    );

    return NextResponse.json({ code: 1, message: "File deleted successfully" });
    
  } catch (err: any) {
    console.error("API Route Error:", err);
    return NextResponse.json(
      { code: 0, message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}