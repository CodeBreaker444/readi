import { countNodes, getOrganizationTree } from "@/backend/services/organization/organization-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const ownerId = session!.user.ownerId;

    if (!ownerId || isNaN(Number(ownerId))) {
      return NextResponse.json(
        { message: "error", error: `Invalid ownerId in session: "${ownerId}"` },
        { status: 400 }
      );
    }

    const tree = await getOrganizationTree(Number(ownerId));
    const totalNodes = countNodes(tree);

    return NextResponse.json({
      message:  "success",
      dataRows: totalNodes,
      data:     tree,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[/api/organization] 500 →", message);

    return NextResponse.json(
      { message: "error", error: message },    
      { status: 500 }
    );
  }
}