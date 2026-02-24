import { getClientList, getEvaluationList, getPilotList, getPlanningList } from "@/backend/services/logbook/mission-service";
import { getUserSession } from "@/lib/auth/server-session";
import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {
    try {

        const session = await getUserSession();
        if (!session) {
            return NextResponse.json({ code: 0, status: "UNAUTHORIZED", message: "User not authenticated" }, { status: 401 });
        }
        const ownerId = session.user.ownerId


        const [clients, pilots, evaluations, plannings] = await Promise.all([
            getClientList(ownerId),
            getPilotList(ownerId),
            getEvaluationList(ownerId),
            getPlanningList(ownerId),
        ]);

        return NextResponse.json({ code: 200, status: "SUCCESS", clients, pilots, evaluations, plannings });
    } catch (err: any) {
        return NextResponse.json(
            { code: 0, status: "ERROR", message: err?.message ?? "Internal server error" },
            { status: 500 }
        );
    }
}