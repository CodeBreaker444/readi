import { createCommunication } from "@/backend/services/planning/planning-dashboard";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
    pic_id: z.number().default(0),
    client_id: z.number(),
    planning_id: z.number(),
    evaluation_id: z.number(),
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

        const data = await createCommunication({
            fk_owner_id: session!.user.ownerId,
            client_id: parsed.data.client_id,
            planning_id: parsed.data.planning_id,
            evaluation_id: parsed.data.evaluation_id,
            pic_id: parsed.data.pic_id,
        });

        return NextResponse.json({ code: 1, message: "Success", data });
    } catch (err: any) {
        return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
    }
}
