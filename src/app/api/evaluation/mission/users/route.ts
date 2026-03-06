import { getUsers } from "@/backend/services/planning/planning-dashboard";
import { getUserSession } from "@/lib/auth/server-session";
import { NextResponse } from "next/server";

 

export async function POST(request: Request) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ code: 0, message: "Unauthorized" }, { status: 401 });
    }

    const users = await getUsers({
      fk_owner_id: session.user.ownerId,
    });

    return NextResponse.json({ code: 1, data: users });
  } catch (err: any) {
    return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
  }
}