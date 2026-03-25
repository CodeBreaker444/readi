import {
  addMissionTestLogbook,
  buildMissionTestS3Key,
} from "@/backend/services/planning/mission-test-logbook";
import { requirePermission } from "@/lib/auth/api-auth";
import { buildS3Url, uploadFileToS3 } from "@/lib/s3Client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const AddTestSchema = z
  .object({
    fk_mission_planning_id: z.coerce
      .number()
      .int()
      .positive("Mission planning ID is required"),
    fk_planning_id: z.coerce
      .number()
      .int()
      .positive("Planning ID is required"),
    fk_evaluation_id: z.coerce
      .number()
      .int()
      .positive("Evaluation ID is required"),
    fk_pic_id: z.coerce
      .number()
      .int()
      .positive("Pilot in Command is required"),
    fk_observer_id: z.coerce
      .number()
      .int()
      .positive("Observer is required"),
    mission_test_code: z
      .string()
      .min(1, "Test code is required")
      .max(50, "Test code max 50 characters"),
    mission_test_date_start: z.string().min(1, "Start date is required"),
    mission_test_date_end: z.string().min(1, "End date is required"),
    mission_test_result: z.enum(["error", "success"]),
  })
 

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_planning');
    if (error) return error;

    const formData = await req.formData();

    const fields: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        fields[key] = value;
      }
    }

    const parsed = AddTestSchema.safeParse(fields);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const ownerId = session!.user.ownerId;
    const userId = session!.user.userId;

    let fileData:
      | { s3Key: string; s3Url: string; filename: string; filesize: number }
      | undefined;

    const file = formData.get("mission_planning_test_file") as File | null;

    if (file && file.size > 0) {
      const s3Key = buildMissionTestS3Key(
        ownerId,
        parsed.data.fk_evaluation_id,
        parsed.data.fk_planning_id,
        parsed.data.fk_mission_planning_id,
        file.name
      );

      await uploadFileToS3(s3Key, file);

      const s3Url = buildS3Url(s3Key);
      const fileSizeMB =
        Math.round((file.size / (1024 * 1024)) * 100) / 100;

      fileData = {
        s3Key,
        s3Url,
        filename: file.name,
        filesize: fileSizeMB,
      };
    }

    const newEntry = await addMissionTestLogbook(
      ownerId,
      userId,
      parsed.data,
      fileData
    );

    return NextResponse.json({ success: true, data: newEntry });
  } catch (error) {
    console.error("ADD mission-test-logbook error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}