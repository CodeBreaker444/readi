import { getDFlightIntegration } from '@/backend/services/integrations/dflight-settings-service';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { getDFlightDrones, getDFlightToken } from '@/lib/dflight-service';
import { E } from '@/lib/error-codes';
import type { DFlightDroneRow } from '@/types/dflight';
import { NextRequest, NextResponse } from 'next/server';

// Requirement: when adding/updating a drone in ReADI, the user enters the drone's
// license plate / registration number to look it up directly in d-flight, rather
// than going through the bulk fleet comparison page.
export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const plate = req.nextUrl.searchParams.get('plate')?.trim();
    if (!plate) {
      return NextResponse.json({ code: 0, message: 'License plate is required' }, { status: 400 });
    }

    const ownerId = session!.user.ownerId;
    const config = await getDFlightIntegration(ownerId);
    if (!config) {
      return NextResponse.json({ code: 0, message: 'D-Flight integration not configured' });
    }

    const token = await getDFlightToken({
      base_url: config.base_url,
      username: config.username,
      password: config.password,
      client_id: config.client_id,
    });
    const dFlightDrones = await getDFlightDrones(config.base_url, token.access_token, config.username);

    const activeDrones = dFlightDrones.filter((d) => d.status === 'ACTIVE' && d.timeOfDelete == null);
    const match = activeDrones.find(
      (d) => (d.matriculationNumber ?? '').trim().toLowerCase() === plate.toLowerCase(),
    );

    if (!match) {
      return NextResponse.json({ code: 0, message: `No active D-Flight drone found with license plate "${plate}"` });
    }

    const row: DFlightDroneRow = {
      dFlightId: match.id,
      dFlightName: match.name,
      serialNumber: match.fcsSerialNumber ?? match.serialNumber,
      gcsSerialNumber: match.gcsSerialNumber,
      matriculationNumber: match.matriculationNumber,
      status: match.status,
      modelName: match['model.modelName'],
      manufacturerName: match['model.manufacturer.name'],
      insuranceCompany: match.insuranceCompany,
      insuranceExpiryDate: match.insuranceExpiryDate,
      uasClassId: match.uasClassId,
      qrCodeImage: match.qrCodeImage,
      modelId: match.modelId,
      manufacturerId: match.manufacturerId,
      linked: false,
      componentId: null,
      systemId: null,
      systemName: null,
      componentName: null,
      storedDrc: null,
    };

    return NextResponse.json({ code: 1, data: row });
  } catch (err: any) {
    return internalError(E.SV001, err);
  }
}
