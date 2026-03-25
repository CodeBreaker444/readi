
import { getPilotList } from "@/backend/services/planning/planning-dashboard";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { session, error } = await requirePermission('view_planning');
        if (error) return error;
 
        const data = await getPilotList(session!.user.ownerId);

        return NextResponse.json({ code: 1, message: "Success", data, dataRows: data.length });
    } catch (err: any) {
        return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
    }
}