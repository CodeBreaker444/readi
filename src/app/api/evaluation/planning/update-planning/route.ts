
import { updatePlanning } from "@/backend/services/planning/planning-dashboard";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
    planning_id: z.number(),
    fk_evaluation_id: z.number(),
    fk_client_id: z.number().optional(),
    planning_status: z.string(),
    planning_request_date: z.string().default(""),
    planning_desc: z.string().default(""),
    planning_type: z.string().default(""),
});

export async function POST(request: Request) {
    try {
        const { session, error } = await requirePermission('view_planning');
        if (error) return error;
        const body = await request.json();
        
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { code: 0, message: parsed.error },
                { status: 400 }
            );
        }

        await updatePlanning(parsed.data,session!.user.ownerId);

        return NextResponse.json({ code: 1, message: "Updated" });
    } catch (err: any) {
        return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
    }
}