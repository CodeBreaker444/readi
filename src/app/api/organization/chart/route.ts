import { countNodes, getOrganizationTree } from "@/backend/services/organization/organization-service";
import { requirePermission } from "@/lib/auth/api-auth";
import {  internalError, notFound } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const ownerId = session!.user.ownerId;

    if (!ownerId || isNaN(Number(ownerId))) {
      return notFound(E.VL001);
    }

    const tree = await getOrganizationTree(Number(ownerId));
    const totalNodes = countNodes(tree);

    return NextResponse.json({
      code: 1,
      message:  "Organization chart fetched successfully",
      dataRows: totalNodes,
      data:     tree, 
    });

  } catch (error) {
    return internalError(E.SV001, error);
  }
}