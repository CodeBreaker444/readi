import { getUsers } from "@/backend/services/planning/planning-dashboard";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextResponse } from "next/server";

 

export async function POST(request: Request) {
  try {
    const { session, error } = await requirePermission('view_planning');
    if (error) return error;

    const users = await getUsers({
      fk_owner_id: session!.user.ownerId,
    });

    return NextResponse.json({ code: 1, data: users });
  } catch (err: any) {
    return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
  }
}