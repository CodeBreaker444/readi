import { syncDroneRegistrationCodes } from '@/backend/services/system/system-service';
import { internalError, zodError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { verifyFlytrelayJwt } from '@/lib/drone-atc-jwt';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  drones: z.array(
    z.object({
      serial_number: z.string().min(1),
      drone_registration_code: z.string().min(1),
    }),
  ).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = verifyFlytrelayJwt(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const userId = Number(payload.userId);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid userId in token' }, { status: 400 });
    }
    const { session, error } = await requireAuth();
    if (error) return error;

    const { ownerId } = session!.user;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return zodError(E.VL009, parsed.error);

    const result = await syncDroneRegistrationCodes(ownerId, parsed.data.drones);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
