import { getClientList, getDroneList, getEvaluationList, getPilotList, getPlanningList } from "@/backend/services/logbook/mission-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {
    try {

        const { session, error } = await requirePermission('view_logbooks');
        if (error) return error;
        const ownerId = session!.user.ownerId


        const [clients, pilots, evaluations, plannings, drones] = await Promise.all([
            getClientList(ownerId),
            getPilotList(ownerId),
            getEvaluationList(ownerId),
            getPlanningList(ownerId),
            getDroneList(ownerId),
        ]);

        return NextResponse.json({ code: 200, status: "SUCCESS", clients, pilots, evaluations, plannings, drones });
    } catch (err) {
        return internalError(E.SV001, err);
    }
}