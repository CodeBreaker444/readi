import { getDocTypesList } from "@/backend/services/document/document-service";
import { internalError } from "@/lib/api-error";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextResponse } from "next/server";
import { E } from "@/lib/error-codes";

export async function POST() {
  const { session, error } = await requirePermission('view_repository');
  if (error) return error;

  try {
    const data = await getDocTypesList(session!.user.ownerId);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[doc_types_list]", error);
    return internalError(E.AU002, error);
  }
}
