import { countNodes, getOrganizationTree } from "@/backend/services/organization/organization-service";
import { getUserSession } from "@/lib/auth/server-session";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getUserSession();

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const ownerId = session.user.ownerId;

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