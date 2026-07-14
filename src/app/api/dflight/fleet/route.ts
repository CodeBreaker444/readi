import { getDFlightIntegration } from '@/backend/services/integrations/dflight-settings-service';
import { internalError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { getDFlightDrones, getDFlightToken } from '@/lib/dflight-service';
import { E } from '@/lib/error-codes';
import { prisma } from '@/lib/prisma';
import type { DFlightDroneRow } from '@/types/dflight';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requireFullAccessRole();
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
        serial_number: true,
        drone_registration_code: true,
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

    // Only consider drones the doc marks as currently valid in d-flight.
    const activeDrones = dFlightDrones.filter(
      (d) => d.status === 'ACTIVE' && d.timeOfDelete == null,
    );

    const componentBySerial = new Map<string, (typeof components)[0]>();
    for (const c of components) {
      const sn = c.serial_number?.trim().toLowerCase();
      if (sn) componentBySerial.set(sn, c);
    }

    const rows: DFlightDroneRow[] = activeDrones.map((d) => {
      const candidateSerials = [d.fcsSerialNumber, d.serialNumber, d.gcsSerialNumber]
        .filter((s): s is string => !!s)
        .map((s) => s.trim().toLowerCase());

      let match: (typeof components)[0] | null = null;
      for (const sn of candidateSerials) {
        const found = componentBySerial.get(sn);
        if (found) { match = found; break; }
      }

      return {
        dFlightId: d.id,
        dFlightName: d.name,
        serialNumber: d.fcsSerialNumber ?? d.serialNumber,
        gcsSerialNumber: d.gcsSerialNumber,
        matriculationNumber: d.matriculationNumber,
        status: d.status,
        modelName: d['model.modelName'],
        manufacturerName: d['model.manufacturer.name'],
        insuranceCompany: d.insuranceCompany,
        insuranceExpiryDate: d.insuranceExpiryDate,
        uasClassId: d.uasClassId,
        qrCodeImage: d.qrCodeImage,
        modelId: d.modelId,
        manufacturerId: d.manufacturerId,
        linked: match !== null,
        componentId: match?.component_id ?? null,
        systemId: match?.tool.tool_id ?? null,
        systemName: match?.tool.tool_name ?? null,
        componentName: match?.component_name ?? null,
        storedDrc: match?.drone_registration_code ?? null,
      };
    });

    // Unlinked rows are the actionable ones — surface them first.
    rows.sort((a, b) => Number(a.linked) - Number(b.linked));

    return NextResponse.json({ code: 1, data: rows });
  } catch (err: any) {
    return internalError(E.SV001, err);
  }
}
