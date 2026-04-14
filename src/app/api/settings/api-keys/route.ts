import { createApiKey, listApiKeys } from '@/backend/services/mission/flight-request-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CreateSchema = z.object({
  key_name:   z.string().min(1, 'Key name is required').max(100),
  expires_at: z.string().optional(),
});

export async function GET() {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const keys = await listApiKeys(session!.user.ownerId);
    return NextResponse.json({ code: 1, items: keys });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const result = await createApiKey(
      session!.user.ownerId,
      parsed.data.key_name,
      session!.user.userId,
      parsed.data.expires_at,
    );

    return NextResponse.json({ code: 1, ...result }, { status: 201 });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
