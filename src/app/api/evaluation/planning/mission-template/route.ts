import { getMissionTemplateList } from "@/backend/services/planning/planning-dashboard";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { session, error } = await requirePermission('view_planning');
        if (error) return error;

        const data = await getMissionTemplateList(session!.user.ownerId);

        return NextResponse.json({ code: 1, message: "Success", data, dataRows: data.length });
    } catch (err) {
        return internalError(E.SV001, err);
    }
}
