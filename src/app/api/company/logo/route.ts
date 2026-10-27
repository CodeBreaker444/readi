import { getOwnerLogoDataUrl } from '@/backend/services/company/owner-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Company logo of the signed-in user as a data URL (same-origin, so PDF exports avoid S3 CORS). */
export async function GET() {
  const session = await getUserSession();
  if (!session) return NextResponse.json({ logoDataUrl: null }, { status: 401 });

  const logoDataUrl = await getOwnerLogoDataUrl(session.user.ownerId);
  return NextResponse.json({ logoDataUrl });
}
