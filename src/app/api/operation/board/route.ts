
import { getMissionBoard } from "@/backend/services/operation/operation-board-service";
import { getUserSession } from "@/lib/auth/server-session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {

    const session = await getUserSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await getMissionBoard(
            session.user.ownerId,
            session.user.userId,
            session.user.role
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