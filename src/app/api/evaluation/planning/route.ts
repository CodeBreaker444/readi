
import { addPlanning, deletePlanning, getPlanningData, getPlanningList, updatePlanning } from "@/backend/services/planning/planning-dashboard";
import { getUserSession } from "@/lib/auth/server-session";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export async function GET(req: NextRequest) {
    try {
        const session = await getUserSession()
        if (!session) {
            return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const planningId = searchParams.get("planning_id");


        if (planningId) {
            const data = await getPlanningData(session.user.ownerId, Number(planningId));
            return NextResponse.json({ code: 1, message: "success", data, dataRows: 1 });
        }

        const result = await getPlanningList(session.user.ownerId);
        return NextResponse.json({ code: 1, message: "success", ...result });
    } catch (err: any) {
        return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
    }
}

const createPlanningSchema = z.object({
  fk_evaluation_id: z.number().int().positive("Evaluation is required"),
  fk_client_id: z.number().int().positive(),
  fk_luc_procedure_id: z.number().int().positive("Procedure is required"),
  planning_desc: z.string().min(1, "Description is required").max(500),
  planning_status: z.enum([
    "NEW",
    "PROCESSING",
    "REQ_FEEDBACK",
    "POSITIVE_RESULT",
    "NEGATIVE_RESULT",
  ]),
  planning_request_date: z.string().min(1, "Request date is required"),
  planning_year: z.number().int().min(2020).max(2030),
  planning_type: z.string().max(100).optional().default(""),
  planning_folder: z.string().max(255).optional().default(""),
  planning_result: z.string().max(50).default("PROGRESS"),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getUserSession()
        if (!session) {
            return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = createPlanningSchema.safeParse(body);
        if (!parsed.success)
            return NextResponse.json({ code: 0, message: "Validation failed", errors: parsed.error.flatten().fieldErrors }, { status: 400 });

        const data = await addPlanning(parsed.data, session.user.userId, session.user.ownerId);
        return NextResponse.json({ code: 1, message: "Planning added", data });
    } catch (err: any) {
        return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
    }
}

const updatePlanningSchema = createPlanningSchema.extend({
  planning_id: z.number().int().positive("Planning ID is required"),
});

export async function PUT(req: NextRequest) {
    try {
        const session = await getUserSession()
        if (!session) {
            return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = updatePlanningSchema.safeParse(body);
        if (!parsed.success)
            return NextResponse.json({ code: 0, message: "Validation failed", errors: parsed.error.flatten().fieldErrors }, { status: 400 });

        const data = await updatePlanning(parsed.data);
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
        const session = await getUserSession()
        if (!session) {
            return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = deletePlanningSchema.safeParse(body);
        if (!parsed.success)
            return NextResponse.json({ code: 0, message: "Validation failed" }, { status: 400 });

        await deletePlanning(session.user.ownerId, parsed.data.planning_id);
        return NextResponse.json({ code: 1, message: "Planning deleted" });
    } catch (err: any) {
        return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
    }
}