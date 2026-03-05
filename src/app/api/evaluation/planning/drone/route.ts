import { getDroneToolList } from "@/backend/services/planning/planning-dashboard";
import { getUserSession } from "@/lib/auth/server-session";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
    client_id: z.number(),
    active: z.string().default("ALL"),
    status: z.string().default("ALL"),
});

export async function POST(request: Request) {
    try {
        const session = await getUserSession()
        if (!session) {
            return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { code: 0, message: parsed.error },
                { status: 400 }
            );
        }

        const { client_id, active, status } = parsed.data;
        const data = await getDroneToolList(session.user.ownerId, client_id, active, status);

        return NextResponse.json({ code: 1, message: "Success", data, dataRows: data.length });
    } catch (err: any) {
        return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
    }
}