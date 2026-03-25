import { getDocTypesList } from "@/backend/services/document/document-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextResponse } from "next/server";

export async function POST() {
  const { error } = await requirePermission('view_repository');
  if (error) return error;

  try {
    const data = await getDocTypesList();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[doc_types_list]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}