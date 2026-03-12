import {
    getMissionTemplateLogbook
} from '@/backend/services/planning/mission-template';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';


const logbookQuerySchema = z.object({
  client_id: z.coerce.number().int().nonnegative().optional(),
  pilot_id: z.coerce.number().int().nonnegative().optional(),
  evaluation_id: z.coerce.number().int().nonnegative().optional(),
  planning_id: z.coerce.number().int().nonnegative().optional(),
  date_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  date_end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { code: 0, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const rawParams: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (value) rawParams[key] = value;
    }

    const validated = logbookQuerySchema.parse(rawParams);

    const data = await getMissionTemplateLogbook(session.user.ownerId, {
      client_id: validated.client_id,
      pilot_id: validated.pilot_id,
      evaluation_id: validated.evaluation_id,
      planning_id: validated.planning_id,
      date_start: validated.date_start,
      date_end: validated.date_end,
    });

    return NextResponse.json({ code: 1, data });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { code: 0, errors: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { code: 0, message: err.message ?? 'Server error' },
      { status: 500 },
    );
  }
}

 