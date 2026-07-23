import { getDFlightIntegration } from '@/backend/services/integrations/dflight-settings-service';
import { computeEffectiveComponentStatus } from '@/backend/services/system/system-service';
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
        component_active: 'Y',
      },
      select: {
        component_id: true,
        component_name: true,
        serial_number: true,
        uas_serial_number: true,
        gcs_serial_number: true,
        drone_registration_code: true,
        dcc_drone_id: true,
        component_metadata: true,
        expiration_date: true,
        expiry_type: true,
        expiration_flights: true,
        expiration_flight_hours: true,
        current_maintenance_flights: true,
        current_usage_hours: true,
        fk_tool_id: true,
        tool: {
          select: { tool_id: true, tool_name: true },
        },
      },
    });

    const modelIds = [...new Set(
      components
        .map((c) => (c.component_metadata as { fk_tool_model_id?: number } | null)?.fk_tool_model_id)
        .filter((id): id is number => !!id),
    )];
    const models = modelIds.length
      ? await prisma.tool_model.findMany({
          where: { model_id: { in: modelIds } },
          select: { model_id: true, model_name: true, manufacturer: true },
        })
      : [];
    const modelById = new Map(models.map((m) => [m.model_id, m]));

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

    // Any drone in d-flight can be listed here, regardless of status — only
    // exclude ones actually deleted in d-flight.
    const listedDrones = dFlightDrones.filter((d) => d.timeOfDelete == null);

    const componentBySerial = new Map<string, (typeof components)[0]>();
    for (const c of components) {
      const sn = c.serial_number?.trim().toLowerCase();
      if (sn) componentBySerial.set(sn, c);
    }

    const dFlightRows: DFlightDroneRow[] = listedDrones.map((d) => {
      const candidateSerials = [d.fcsSerialNumber, d.serialNumber, d.gcsSerialNumber]
        .filter((s): s is string => !!s)
        .map((s) => s.trim().toLowerCase());

      let match: (typeof components)[0] | null = null;
      for (const sn of candidateSerials) {
        const found = componentBySerial.get(sn);
        if (found) { match = found; break; }
      }

      const matchedModelId = (match?.component_metadata as { fk_tool_model_id?: number } | null)?.fk_tool_model_id;
      const matchedModel = matchedModelId ? modelById.get(matchedModelId) : undefined;
      const componentStatus = match ? computeEffectiveComponentStatus(match) : null;

      return {
        dFlightId: d.id,
        dFlightName: d.name,
        serialNumber: d.fcsSerialNumber ?? d.serialNumber,
        uasSerialNumber: d.serialNumber,
        gcsSerialNumber: d.gcsSerialNumber,
        matriculationNumber: d.matriculationNumber,
        status: d.status,
        modelName: matchedModel?.model_name ?? d['model.modelName'],
        manufacturerName: matchedModel?.manufacturer ?? d['model.manufacturer.name'],
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
        storedUasSerial: match?.uas_serial_number ?? null,
        storedGcsSerial: match?.gcs_serial_number ?? null,
        storedDccDroneId: match?.dcc_drone_id ?? null,
        componentStatus,
        origin: 'DFLIGHT',
      };
    });

    // Unlinked d-flight rows are the actionable ones — surface them first, then
    // already-linked d-flight rows.
    const rows = [...dFlightRows].sort((a, b) => {
      const rank = (r: DFlightDroneRow) => (r.linked ? 1 : 0);
      return rank(a) - rank(b);
    });

    return NextResponse.json({ code: 1, data: rows });
  } catch (err: any) {
    return internalError(E.SV001, err);
  }
}
