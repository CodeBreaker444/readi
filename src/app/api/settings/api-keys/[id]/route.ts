import { deleteApiKey, revokeApiKey } from '@/backend/services/mission/flight-request-service';
import { internalError } from '@/lib/api-error';
import { requireAuth, requireFeatureAccess } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('settings_security_api_keys', 'edit');
    if (featureError) return featureError;

    const { id } = await params;
    await revokeApiKey(Number(id), session!.user.ownerId);
    return NextResponse.json({ code: 1, message: 'API key revoked' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('settings_security_api_keys', 'delete');
    if (featureError) return featureError;

    const { id } = await params;
    await deleteApiKey(Number(id), session!.user.ownerId);
    return NextResponse.json({ code: 1, message: 'API key deleted' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
