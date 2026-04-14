import { fetchCommunicationList } from "@/backend/services/organization/communication-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { type NextRequest, NextResponse } from "next/server";
import { internalError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

   const ownerId = session!.user.ownerId

    const data = await fetchCommunicationList(ownerId);

      return NextResponse.json({
        code: 1,
        message: 'Communication list fetched successfully',
        data,
        dataRows: data.dataRows,
    });
  } catch (error) {
    return internalError(E.SV001, error);
  }
}