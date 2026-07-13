
import { listClients } from "@/backend/services/client/client-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const { session, error } = await requirePermission('view_planning');
        if (error) return error;

        const result = await listClients(session!.user.ownerId);

        return NextResponse.json(result);
    } catch (err) {
        return internalError(E.SV001, err);
    }
}
