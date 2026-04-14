
import { getMissionBoard } from "@/backend/services/operation/operation-board-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
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
    } catch (err) {
        return internalError(E.SV001, err);
    }
}
