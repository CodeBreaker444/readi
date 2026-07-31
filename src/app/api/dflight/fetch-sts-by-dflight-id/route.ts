import { getDFlightIntegration } from '@/backend/services/integrations/dflight-settings-service';
import { internalError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getDFlightToken,
  getDFlightUserInfo,
  getDFlightDroneDeclarations,
  type DFlightDroneDeclaration,
} from '@/lib/dflight-service';

const FetchStsSchema = z.object({
  dFlightId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const body = await req.json();
    const validation = FetchStsSchema.safeParse(body);
    if (!validation.success) return zodError(E.VL001, validation.error);

    const { dFlightId } = validation.data;

    // Get D-Flight configuration and token
    const config = await getDFlightIntegration(session!.user.ownerId);
    if (!config) {
      return NextResponse.json({
        code: 0,
        message: 'D-Flight configuration not found',
      });
    }

    if (!config.pfx_content || !config.pfx_password) {
      return NextResponse.json({
        code: 0,
        message: 'PFX certificate not configured',
      });
    }

    const tokenConfig: any = {
      base_url: config.base_url,
      username: config.username,
      client_id: config.client_id,
    };
    if (config.password !== null) {
      tokenConfig.password = config.password;
    }

    const tokenResponse = await getDFlightToken(tokenConfig, config.pfx_content ?? undefined, config.pfx_password ?? undefined);
    const accessToken = tokenResponse.access_token;

    // Get operator registration number
    const userInfo = await getDFlightUserInfo(config.base_url, accessToken, config.pfx_content ?? undefined, config.pfx_password ?? undefined);
    if (!userInfo.operatorRegistrationNumber) {
      return NextResponse.json({
        code: 0,
        message: 'Operator registration number not found',
      });
    }

    // Get drone declarations using D-Flight ID
    const declarations = await getDFlightDroneDeclarations(
      config.base_url,
      accessToken,
      userInfo.operatorRegistrationNumber,
      dFlightId,
      config.pfx_content,
      config.pfx_password,
    );

    if (declarations.length === 0) {
      return NextResponse.json({
        code: 1,
        message: 'No STS declarations found',
        data: { declarations: [] },
      });
    }

    // Process declarations to extract STS information
    const stsData = declarations.map((decl: DFlightDroneDeclaration) => {
      const startDate = decl.statusHistory.length > 0 ? decl.statusHistory[0].ltu : null;
      const scenarios = decl.authorizedScenarios;
      
      // Determine STS type based on scenarios
      const stsType = scenarios.includes('STS-01') ? 'STS-01' : 
                      scenarios.includes('STS-02') ? 'STS-02' : 
                      scenarios.length > 0 ? scenarios[0] : 'UNKNOWN';

      return {
        declarationId: decl.declarationId,
        stsType,
        startDate,
        scenarios: scenarios.join(', '),
      };
    });

    return NextResponse.json({
      code: 1,
      message: 'STS declarations fetched successfully',
      data: { declarations: stsData },
    });
  } catch (err) {
    console.error('Fetch STS by D-Flight ID error:', err);
    return internalError(E.SV001, err);
  }
}
