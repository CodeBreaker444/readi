import { getDFlightIntegration } from '@/backend/services/integrations/dflight-settings-service';
import { internalError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDFlightDeclarationPdf, getDFlightToken } from '@/lib/dflight-service';

const PdfSchema = z.object({
  declarationId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const body = await req.json();
    const validation = PdfSchema.safeParse(body);
    if (!validation.success) return zodError(E.VL001, validation.error);

    const { declarationId } = validation.data;

    // Get D-Flight configuration and token
    const config = await getDFlightIntegration(session!.user.ownerId);
    if (!config) {
      return NextResponse.json({
        code: 0,
        message: 'D-Flight configuration not found',
      });
    }

    // Check if either certificate+password or just password is available
    const hasCertificateWithPassword = config.pfx_content && config.pfx_password;
    const hasPasswordOnly = config.password;

    if (!hasCertificateWithPassword && !hasPasswordOnly) {
      return NextResponse.json({
        code: 0,
        message: 'D-Flight credentials are missing. Either a PFX certificate with password or just the password is required for authentication.',
      });
    }

    const tokenResponse = await getDFlightToken({
      base_url: config.base_url,
      username: config.username,
      password: config.password ?? undefined,
      client_id: config.client_id,
    }, config.pfx_content?? undefined, config.pfx_password ?? undefined);
    const accessToken = tokenResponse.access_token;

    const pdfBuffer = await getDFlightDeclarationPdf(
      config.base_url,
      accessToken,
      declarationId,
      config.pfx_content ?? undefined,
      config.pfx_password ?? undefined,
    );

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="declaration-${declarationId}.pdf"`,
      },
    });
  } catch (err) {
    console.error('Declaration PDF error:', err);
    return internalError(E.SV001, err);
  }
}
