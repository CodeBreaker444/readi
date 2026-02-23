import { getDocTypesList } from "@/backend/services/document/document-service";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const data = await getDocTypesList();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[doc_types_list]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}