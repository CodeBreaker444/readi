import { getPlanningTestLogbookList } from "@/backend/services/planning/planning-dashboard";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError, zodError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
    p_id: z.number(),
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

        const { p_id } = parsed.data;
        const data = await getPlanningTestLogbookList(session!.user.ownerId, p_id);

        return NextResponse.json({ code: 1, message: "Success", data, dataRows: data.length });
    } catch (err) {
        return internalError(E.SV001, err);
    }
}
