import {
  hasFlytbaseToken,
  removeFlytbaseToken,
  saveFlytbaseConfig,
  verifyFlytbaseTokenAndGetUser,
} from '@/backend/services/integrations/flytbase-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const saveSchema = z.object({
  user_id: z.number().int().positive(),
  token: z.string().min(8, 'Token too short').max(2048, 'Token too long'),
  orgId: z.string().min(4, 'Org ID too short').max(128, 'Org ID too long'),
  tokenName: z.string().max(100, 'Name too long').optional(),
});

const deleteSchema = z.object({
  user_id: z.number().int().positive(),
});

export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission('manage_users');
    if (error) return error;

    const userId = parseInt(req.nextUrl.searchParams.get('user_id') ?? '');
    if (!userId || isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'user_id is required' }, { status: 400 });
    }

    const { exists, tokenName } = await hasFlytbaseToken(userId);
    return NextResponse.json({ success: true, hasToken: exists, tokenName });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await requirePermission('manage_users');
    if (error) return error;

    const body = await req.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const flytbaseUser = await verifyFlytbaseTokenAndGetUser(
      parsed.data.token,
      parsed.data.orgId,
    );

    await saveFlytbaseConfig(
      parsed.data.user_id,
      parsed.data.token,
      parsed.data.orgId,
      parsed.data.tokenName,
    );

    return NextResponse.json({ success: true, flytbaseUser });
  } catch (err: any) {
    if (err?.message?.includes('Invalid') || err?.message?.includes('verify')) {
      return NextResponse.json({ success: false, message: err.message }, { status: 422 });
    }
    return internalError(E.SV001, err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { error } = await requirePermission('manage_users');
    if (error) return error;

    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    await removeFlytbaseToken(parsed.data.user_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
