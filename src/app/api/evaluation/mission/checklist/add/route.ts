import { addChecklistToPlanning } from "@/backend/services/planning/planning-dashboard";
import { getUserSession } from "@/lib/auth/server-session";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  planning_id: z.number().int().positive(),
  checklist_code: z.string().min(1, "Checklist code is required"),
  checklist_desc: z.string().min(1, "Description is required"),
  checklist_json: z.string().min(1, "JSON schema is required"),
  checklist_ver: z.string().optional().default("1.0"),
  checklist_active: z.enum(["Y", "N"]).optional().default("Y"),
});

export async function POST(request: Request) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ code: 0, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ code: 0, message: parsed.error.flatten() }, { status: 400 });
    }

    let jsonObj: Record<string, unknown>;
    try {
      jsonObj = JSON.parse(parsed.data.checklist_json);
      if (typeof jsonObj !== "object" || Array.isArray(jsonObj)) {
        return NextResponse.json(
          { code: 0, message: "JSON must be an object" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { code: 0, message: "Invalid JSON format" },
        { status: 400 }
      );
    }

    const data = await addChecklistToPlanning({
      fk_owner_id: session.user.ownerId,
      fk_user_id: session.user.userId,
      fk_planning_id: parsed.data.planning_id,
      checklist_code: parsed.data.checklist_code,
      checklist_desc: parsed.data.checklist_desc,
      checklist_json: jsonObj,
      checklist_ver: parsed.data.checklist_ver,
      checklist_active: parsed.data.checklist_active,
    });

    return NextResponse.json({
      code: 1,
      message: "Checklist added successfully",
      data,
    });
  } catch (err: any) {
    return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
  }
}