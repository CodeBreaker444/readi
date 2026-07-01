import { getDFlightIntegration } from '@/backend/services/integrations/dflight-settings-service';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { getDFlightDrones, getDFlightToken } from '@/lib/dflight-service';
import { E } from '@/lib/error-codes';
import { prisma } from '@/lib/prisma';
import type { FleetRow } from '@/types/dflight';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requirePermission('view_drone_atc');
    if (error) return error;

    const ownerId = session!.user.ownerId;

    const config = await getDFlightIntegration(ownerId);
    if (!config) {
      return NextResponse.json({ code: 0, message: 'D-Flight integration not configured', data: [] });
    }

    const components = await prisma.tool_component.findMany({
      where: {
        tool: { fk_owner_id: ownerId },
        component_type: 'DRONE',
      },
      select: {
        component_id: true,
        component_name: true,
        component_type: true,
        serial_number: true,
        fk_tool_id: true,
        tool: {
          select: { tool_id: true, tool_name: true },
        },
      },
    });

    let dFlightDrones: Awaited<ReturnType<typeof getDFlightDrones>> = [];
    try {
      const token = await getDFlightToken({
        base_url: config.base_url,
        username: config.username,
        password: config.password,
        client_id: config.client_id,
      });
      dFlightDrones = await getDFlightDrones(config.base_url, token.access_token, config.username);
    } catch (e: any) {
      return NextResponse.json({
        code: 0,
        message: `Failed to connect to D-Flight: ${e?.message ?? 'Unknown error'}`,
        data: [],
      });
    }
console.log('dflight drones', dFlightDrones);
    const droneBySerial = new Map<string, (typeof dFlightDrones)[0]>();
    for (const drone of dFlightDrones) {
      if (drone.serialNumber) droneBySerial.set(drone.serialNumber.toLowerCase(), drone);
      if (drone.fcsSerialNumber) droneBySerial.set(drone.fcsSerialNumber.toLowerCase(), drone);
      if (drone.gcsSerialNumber) droneBySerial.set(drone.gcsSerialNumber.toLowerCase(), drone);
    }

    const rows: FleetRow[] = components.map((c) => {
      const sn = c.serial_number?.trim().toLowerCase() ?? null;
      const match = sn ? droneBySerial.get(sn) ?? null : null;

      return {
        componentId: c.component_id,
        systemId: c.tool.tool_id,
        systemName: c.tool.tool_name ?? '',
        componentName: c.component_name,
        serialNumber: c.serial_number ?? null,
        dFlightId: match?.id ?? null,
        dFlightDroneName: match?.name ?? null,
        dFlightStatus: match?.status ?? null,
        dFlightMatriculation: match?.matriculationNumber ?? null,
        dFlightModel: match?.['model.modelName'] ?? null,
        linked: match !== null,
      };
    });

    rows.sort((a, b) => Number(b.linked) - Number(a.linked));

    return NextResponse.json({ code: 1, data: rows });
  } catch (err: any) {
    return internalError(E.SV001, err);
  }
}
