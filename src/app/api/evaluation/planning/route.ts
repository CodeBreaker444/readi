
import { addPlanningWithAssignment, deletePlanning, getPlanningData, getPlanningList, updatePlanning } from "@/backend/services/planning/planning-dashboard";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export async function GET(req: NextRequest) {
    try {
        const { session, error } = await requirePermission('view_planning');
        if (error) return error;
        
        const { searchParams } = new URL(req.url);
        const planningId = searchParams.get("planning_id");


        if (planningId) {
            const data = await getPlanningData(session!.user.ownerId, Number(planningId));
            return NextResponse.json({ code: 1, message: "success", data, dataRows: 1 });
        }

        const result = await getPlanningList(session!.user.ownerId);
        return NextResponse.json({ code: 1, message: "success", ...result });
    } catch (err: any) {
        return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
    }
}


const addEvaluationPlanningSchema = z.object({
  fk_evaluation_id: z.number().int().positive("Evaluation ID is required"),
  fk_client_id: z.number().int().positive("Client ID is required"),
  fk_luc_procedure_id: z.number().int().positive("LUC Procedure is required"),
  assigned_to_user_id: z
    .number()
    .int()
    .positive("Pilot in Command is required"),
  planning_desc: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description too long"),
  planning_status: z
    .enum([
      "NEW",
      "PROCESSING",
      "REQ_FEEDBACK",
      "POSITIVE_RESULT",
      "NEGATIVE_RESULT",
    ])
    .default("NEW"),
  planning_request_date: z.string().min(1, "Request date is required"),
  planning_year: z
    .number()
    .int()
    .min(2020, "Year too far in past")
    .max(2035, "Year too far in future"),
  planning_type: z.string().max(100).optional().default(""),
  planning_folder: z.string().max(255).optional().default(""),
  planning_result: z.string().max(50).optional().default("PROGRESS"),
});


export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_planning');
    if (error) return error;

    const body = await req.json();
    const parsed = addEvaluationPlanningSchema.safeParse(body);

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

    const data = await addPlanningWithAssignment(
      {
        ...parsed.data,
        assigned_by_user_id: session!.user.userId, 
        assigned_to_user_id: parsed.data.assigned_to_user_id,  
      },
      session!.user.userId,
      session!.user.ownerId
    );

    return NextResponse.json({
      code: 1,
      message: "Planning created successfully",
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { code: 0, message: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

const updatePlanningSchema = addEvaluationPlanningSchema.extend({
  planning_id: z.number().int().positive("Planning ID is required"),
});

const PLANNING_ALLOWED_ROLES = ['SUPERADMIN', 'ADMIN', 'OPM'];

export async function PUT(req: NextRequest) {
    try {
        const { session, error } = await requirePermission('view_planning');
        if (error) return error;
        if (!PLANNING_ALLOWED_ROLES.includes(session!.user.role)) return NextResponse.json({ code: 0, message: 'Forbidden' }, { status: 403 });

        const body = await req.json();
        const parsed = updatePlanningSchema.safeParse(body);
        if (!parsed.success)
            return NextResponse.json({ code: 0, message: "Validation failed", errors: parsed.error.flatten().fieldErrors }, { status: 400 });

        const data = await updatePlanning(parsed.data, session!.user.ownerId);
        return NextResponse.json({ code: 1, message: "Planning updated", data });
    } catch (err: any) {
        return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
    }
}

const deletePlanningSchema = z.object({
  planning_id: z.number().int().positive(),
});

export async function DELETE(req: NextRequest) {
    try {
        const { session, error } = await requirePermission('view_planning');
        if (error) return error;

        const body = await req.json();
        const parsed = deletePlanningSchema.safeParse(body);
        if (!parsed.success)
            return NextResponse.json({ code: 0, message: "Validation failed" }, { status: 400 });

        await deletePlanning(session!.user.ownerId, parsed.data.planning_id);
        return NextResponse.json({ code: 1, message: "Planning deleted" });
    } catch (err: any) {
        return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
    }
}