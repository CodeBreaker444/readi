import { getCommunicationsByPlanning } from "@/backend/services/planning/planning-dashboard";
import { getUserSession } from "@/lib/auth/server-session";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  planning_id: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ code: 0, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ code: 0, message: parsed.error.flatten() }, { status: 400 });
    }

    const data = await getCommunicationsByPlanning(
      session.user.ownerId,
      parsed.data.planning_id
    );

    return NextResponse.json({ code: 1, message: "Success", data, dataRows: data.length });
  } catch (err: any) {
    return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
  }
}