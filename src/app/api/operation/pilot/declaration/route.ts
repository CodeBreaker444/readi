import {
  checkDailyDeclaration,
  getPilotDeclarations,
  insertPilotDeclaration,
} from "@/backend/services/operation/pilot-declaration-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const insertSchema = z.object({
  fk_tool_id: z.number().int().positive().nullable().optional(),
  declaration_type: z.string().min(1),
  declaration_data: z.record(z.string(), z.unknown()),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requirePermission('view_operations');
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? undefined;

  try {
    if (!date) {
      const hasDeclared = await checkDailyDeclaration(session!.user.userId);
      return NextResponse.json({ code: 1, check_daily_declaration: hasDeclared ? "Y" : "N" });
    }

    const declarations = await getPilotDeclarations(session!.user.userId, date);
    return NextResponse.json({ code: 1, data: declarations, dataRows: declarations.length });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requirePermission('view_operations');
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: 0, message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = insertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 0, message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const declaration = await insertPilotDeclaration({
      fk_user_id: session!.user.userId,
      fk_tool_id: parsed.data.fk_tool_id,
      declaration_type: parsed.data.declaration_type,
      declaration_data: parsed.data.declaration_data,
    });
    return NextResponse.json({ code: 1, message: "Declaration saved", data: declaration });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
