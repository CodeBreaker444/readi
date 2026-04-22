import { getAuthorizationKey } from '@/backend/services/authorization/authorization-service';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const key = await getAuthorizationKey(session!.user.userId);

    if (!key) {
      return NextResponse.json({ code: 1, data: null, has_pin: false });
    }

    // We return the encrypted key so the client can decrypt it using their PIN.
    // The private key can only be unlocked in the browser with the correct PIN.
    return NextResponse.json({
      code: 1,
      has_pin: true,
      data: {
        encrypted_private_key: key.encrypted_private_key,
        public_key: key.public_key,
        salt: key.salt,
        iv: key.iv,
        key_fingerprint: key.key_fingerprint,
        created_at: key.created_at,
      },
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
