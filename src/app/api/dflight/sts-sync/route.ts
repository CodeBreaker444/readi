import { logEvent } from '@/backend/services/auditLog/audit-log';
import { getDFlightIntegration } from '@/backend/services/integrations/dflight-settings-service';
import { prisma } from '@/lib/prisma';
import { internalError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getDFlightUserInfo,
  getDFlightDroneDeclarations,
  getDFlightToken,
  type DFlightDroneDeclaration,
} from '@/lib/dflight-service';

const StsSyncSchema = z.object({
  componentId: z.number().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const body = await req.json();
    const validation = StsSyncSchema.safeParse(body);
    if (!validation.success) return zodError(E.VL001, validation.error);

    const { componentId } = validation.data;

    // Fetch component with dFlight ID
    const component = await prisma.tool_component.findFirst({
      where: {
        component_id: componentId,
        tool: { fk_owner_id: session!.user.ownerId },
      },
      select: {
        component_id: true,
        drone_registration_code: true,
        component_metadata: true,
      },
    });

    if (!component || !component.drone_registration_code) {
      return NextResponse.json({
        code: 0,
        message: 'Component not found or not linked to D-Flight',
      });
    }

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
        message: 'PFX certificate not configured. Please upload PFX file and password in D-Flight settings.',
      });
    }

    const tokenResponse = await getDFlightToken({
      base_url: config.base_url,
      username: config.username,
      password: config.password,
      client_id: config.client_id,
    }, config.pfx_content, config.pfx_password);
    const accessToken = tokenResponse.access_token;

    // Get operator registration number
    const userInfo = await getDFlightUserInfo(config.base_url, accessToken, config.pfx_content, config.pfx_password);
    if (!userInfo.operatorRegistrationNumber) {
      return NextResponse.json({
        code: 0,
        message: 'Operator registration number not found',
      });
    }

    // Get drone declarations
    const declarations = await getDFlightDroneDeclarations(
      config.base_url,
      accessToken,
      userInfo.operatorRegistrationNumber,
      component.drone_registration_code,
      config.pfx_content,
      config.pfx_password,
    );

    if (declarations.length === 0) {
      return NextResponse.json({
        code: 1,
        message: 'No STS declarations found for this drone',
        data: {
          hasDeclarations: false,
          declarations: [],
        },
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

    // Update component metadata with STS information
    const baseMeta = (component.component_metadata as Record<string, unknown>) ?? {};
    const updatedMeta = {
      ...baseMeta,
      sts_declarations: stsData,
    };

    await prisma.tool_component.update({
      where: { component_id: componentId },
      data: {
        component_metadata: updatedMeta as any,
      },
    });

    logEvent({
      eventType: 'UPDATE',
      entityType: 'component',
      description: `Synced STS declarations for component #${componentId} from D-Flight`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
    });

    return NextResponse.json({
      code: 1,
      message: 'STS declarations synced successfully',
      data: {
        hasDeclarations: true,
        declarations: stsData,
      },
    });
  } catch (err) {
    console.error('STS sync error:', err);
    return internalError(E.SV001, err);
  }
}
