
import { getMissionBoard } from "@/backend/services/operation/operation-board-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { session, error } = await requirePermission('view_operations');
        if (error) return error;

        const data = await getMissionBoard(
            session!.user.ownerId,
            session!.user.userId,
            session!.user.role
        );

        return NextResponse.json({
            code: 1,
            message: "Success",
            data,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ code: 0, message }, { status: 500 });
    }
}
