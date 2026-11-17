
import { getMissionBoard } from "@/backend/services/operation/operation-board-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { DEFAULT_SLOT_TIMEZONE, normalizeTimeZone } from "@/lib/slot-booking-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { session, error } = await requirePermission('view_operations');
        if (error) return error;

        const data = await getMissionBoard(
            session!.user.ownerId,
            session!.user.userId,
            session!.user.role,
            // The board's "today" follows the viewer's own time zone (profile setting), falling back to UTC.
            normalizeTimeZone(session!.user.timezone) ?? DEFAULT_SLOT_TIMEZONE
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
