
import { addMissionPlanningLogbook } from "@/backend/services/planning/planning-dashboard";
import { getUserSession } from "@/lib/auth/server-session";
import { uploadFileToS3 } from "@/lib/s3Client";
import { NextResponse } from "next/server";
import { z } from "zod";

function buildPlanningLogbookS3Key(
  planningId: number,
  originalName: string
): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `planning-logbook/${planningId}/${Date.now()}_${safe}`;
}

const schema = z.object({
  fk_planning_id: z.coerce.number(),
  fk_evaluation_id: z.coerce.number(),
  fk_client_id: z.coerce.number(),
  mission_planning_code: z.string().min(1, "Mission code is required"),
  mission_planning_desc: z.string().default(""),
  mission_planning_limit_json: z.string().default(""),
  mission_planning_active: z.string().default("N"),
  mission_planning_ver: z.string().default(""),
  mission_planning_tool: z.coerce.number().default(0),
});

export async function POST(request: Request) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { code: 0, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const rawObj: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      if (key !== "mission_planning_file") {
        rawObj[key] = value;
      }
    });

    const parsed = schema.safeParse(rawObj);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 0,
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const file = formData.get("mission_planning_file") as File | null;
    let filename = "";
    let filesize = 0;
    let s3Key = "";

    if (file && file.size > 0) {
      filename = file.name;
      filesize = file.size;

      s3Key = buildPlanningLogbookS3Key(
        parsed.data.fk_planning_id,
        file.name
      );

      await uploadFileToS3(s3Key, file);
    }

    let limitJson: Record<string, unknown> | null = null;
    if (parsed.data.mission_planning_limit_json) {
      try {
        limitJson = JSON.parse(parsed.data.mission_planning_limit_json);
      } catch {
        limitJson = null;
      }
    }

    const data = await addMissionPlanningLogbook({
      fk_planning_id: parsed.data.fk_planning_id,
      fk_evaluation_id: parsed.data.fk_evaluation_id,
      fk_client_id: parsed.data.fk_client_id,
      fk_owner_id: session.user.ownerId,
      fk_user_id: session.user.userId,
      mission_planning_code: parsed.data.mission_planning_code,
      mission_planning_desc: parsed.data.mission_planning_desc,
      mission_planning_limit_json: limitJson,
      mission_planning_active: parsed.data.mission_planning_active,
      mission_planning_ver: parsed.data.mission_planning_ver,
      fk_tool_id: parsed.data.mission_planning_tool || null,
      mission_planning_filename: filename,
      mission_planning_filesize: filesize,
      mission_planning_folder: s3Key,  
    });

    return NextResponse.json({ code: 1, message: "Success", data });
  } catch (err: any) {
    console.error("add-mission-planning-logbook error:", err);
    return NextResponse.json(
      { code: 0, message: err.message },
      { status: 500 }
    );
  }
}