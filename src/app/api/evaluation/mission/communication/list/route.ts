import { getCommunicationsByPlanning } from "@/backend/services/planning/planning-dashboard";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  planning_id: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const { session, error } = await requirePermission('view_planning');
    if (error) return error;

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ code: 0, message: parsed.error.flatten() }, { status: 400 });
    }

    const data = await getCommunicationsByPlanning(
      session!.user.ownerId,
      parsed.data.planning_id
    );

    return NextResponse.json({ code: 1, message: "Success", data, dataRows: data.length });
  } catch (err: any) {
    return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
  }
}