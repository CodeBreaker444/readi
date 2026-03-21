import { createQualifications, listQualifications } from '@/backend/services/user/qualification-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const qualificationItemSchema = z.object({
  qualification_name: z.string().min(1, 'Name is required'),
  qualification_type: z.enum(['Certification', 'Training']),
  description: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
});

const postSchema = z.object({
  user_id: z.number().int().positive(),
  qualifications: z.array(qualificationItemSchema).min(1).max(10),
});

const getSchema = z.object({
  user_id: z.coerce.number().int().positive(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { user_id } = getSchema.parse({ user_id: req.nextUrl.searchParams.get('user_id') });

    const data = await listQualifications(user_id, session.user.ownerId);
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { user_id, qualifications } = postSchema.parse(body);

    const data = await createQualifications(user_id, session.user.ownerId, qualifications);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
