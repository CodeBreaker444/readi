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
        uas_serial_number: true,
        gcs_serial_number: true,
        license_plate: true,
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

    const matchedComponentIds = new Set<number>();

    const dFlightRows: DFlightDroneRow[] = activeDrones.map((d) => {
      const candidateSerials = [d.fcsSerialNumber, d.serialNumber, d.gcsSerialNumber]
        .filter((s): s is string => !!s)
        .map((s) => s.trim().toLowerCase());

      let match: (typeof components)[0] | null = null;
      for (const sn of candidateSerials) {
        const found = componentBySerial.get(sn);
        if (found) { match = found; break; }
      }
      if (match) matchedComponentIds.add(match.component_id);

      return {
        dFlightId: d.id,
        dFlightName: d.name,
        serialNumber: d.fcsSerialNumber ?? d.serialNumber,
        uasSerialNumber: d.serialNumber,
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
        storedLicensePlate: match?.license_plate ?? null,
        storedUasSerial: match?.uas_serial_number ?? null,
        storedGcsSerial: match?.gcs_serial_number ?? null,
        origin: 'DFLIGHT',
      };
    });

    // Components that exist in ReADI but have no counterpart in the (active) d-flight
    // fleet — the spec requires the listing to show all drone components "regardless
    // of their origin", not just the ones that came from d-flight.
    const readiOnlyRows: DFlightDroneRow[] = components
      .filter((c) => !matchedComponentIds.has(c.component_id))
      .map((c) => ({
        dFlightId: null,
        dFlightName: c.component_name,
        serialNumber: c.serial_number,
        uasSerialNumber: c.uas_serial_number,
        gcsSerialNumber: c.gcs_serial_number,
        matriculationNumber: c.license_plate,
        status: null,
        modelName: null,
        manufacturerName: null,
        insuranceCompany: null,
        insuranceExpiryDate: null,
        uasClassId: null,
        qrCodeImage: null,
        modelId: null,
        manufacturerId: null,
        linked: false,
        componentId: c.component_id,
        systemId: c.tool.tool_id,
        systemName: c.tool.tool_name,
        componentName: c.component_name,
        storedDrc: c.drone_registration_code,
        storedLicensePlate: c.license_plate,
        storedUasSerial: c.uas_serial_number,
        storedGcsSerial: c.gcs_serial_number,
        origin: 'READI_ONLY',
      }));

    // Unlinked d-flight rows are the actionable ones — surface them first, then
    // already-linked d-flight rows, then components ReADI has that d-flight doesn't.
    const rows = [...dFlightRows, ...readiOnlyRows].sort((a, b) => {
      const rank = (r: DFlightDroneRow) => (r.origin === 'READI_ONLY' ? 2 : r.linked ? 1 : 0);
      return rank(a) - rank(b);
    });

    return NextResponse.json({ code: 1, data: rows });
  } catch (err: any) {
    return internalError(E.SV001, err);
  }
}
