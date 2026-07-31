import { getDFlightIntegration } from '@/backend/services/integrations/dflight-settings-service';
import { internalError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { getDFlightManufacturer, getDFlightToken } from '@/lib/dflight-service';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const manufacturerId = req.nextUrl.searchParams.get('id');
    if (!manufacturerId) {
      return NextResponse.json({ code: 0, message: 'Missing id', data: null });
    }

    const config = await getDFlightIntegration(session!.user.ownerId);
    if (!config) {
      return NextResponse.json({ code: 0, message: 'D-Flight integration not configured', data: null });
    }

    // Check if either certificate+password or just password is available
    const hasCertificateWithPassword = config.pfx_content && config.pfx_password;
    const hasPasswordOnly = config.password;

    if (!hasCertificateWithPassword && !hasPasswordOnly) {
      return NextResponse.json({ code: 0, message: 'D-Flight credentials are missing. Either a PFX certificate with password or just the password is required for authentication.', data: null });
    }

    const token = await getDFlightToken({
      base_url: config.base_url,
      username: config.username,
      password: config.password ?? undefined,
      client_id: config.client_id,
    }, config.pfx_content ?? undefined, config.pfx_password ?? undefined);

    const result = await getDFlightManufacturer(config.base_url, token.access_token, manufacturerId, config.pfx_content ?? undefined, config.pfx_password ?? undefined);
    return NextResponse.json({ code: 1, data: result });
  } catch (err: any) {
    return internalError(E.SV001, err);
  }
}
