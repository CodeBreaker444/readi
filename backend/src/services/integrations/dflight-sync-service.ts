import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface SyncDFlightDroneInput {
  fk_owner_id: number;
  component_id: number;
  dFlightId: string;
  drone_classes?: string[] | null;
  uas_serial_number?: string | null;
  gcs_serial_number?: string | null;
  license_plate?: string | null;
  insurance_name?: string | null;
  insurance_company?: string | null;
  insurance_expiry_date?: string | null;
  qr_code_image?: string | null;
}

// Scenario A of the d-flight spec: a ReADI component already matched (by serial
// number) to a d-flight drone re-pulls DRC/insurance/QR/classes/identifiers from
// d-flight, overwriting the previously-synced values on the existing component.
export async function syncDFlightDrone(input: SyncDFlightDroneInput) {
  const component = await prisma.tool_component.findFirst({
    where: { component_id: input.component_id, tool: { fk_owner_id: input.fk_owner_id } },
    select: { component_id: true, component_metadata: true },
  });
  if (!component) {
    return { code: 0, message: 'Component not found for this owner.' };
  }

  const baseMeta = (component.component_metadata as Record<string, unknown>) ?? {};

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.tool_component.update({
      where: { component_id: input.component_id },
      data: {
        drone_registration_code: input.dFlightId,
        drc_synced_at: new Date(),
        qr_code_image: input.qr_code_image || null,
        uas_serial_number: input.uas_serial_number || null,
        gcs_serial_number: input.gcs_serial_number || null,
        license_plate: input.license_plate || null,
        component_metadata: {
          ...baseMeta,
          drone_classes: input.drone_classes?.length ? input.drone_classes : (baseMeta as any).drone_classes ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    if (input.insurance_company || input.insurance_expiry_date || input.insurance_name) {
      await tx.component_insurance.upsert({
        where: { fk_component_id: input.component_id },
        create: {
          fk_component_id: input.component_id,
          insurance_name: input.insurance_name || null,
          insurance_company: input.insurance_company || null,
          expiry_date: input.insurance_expiry_date ? new Date(input.insurance_expiry_date) : null,
        },
        update: {
          insurance_name: input.insurance_name || null,
          insurance_company: input.insurance_company || null,
          expiry_date: input.insurance_expiry_date ? new Date(input.insurance_expiry_date) : null,
          updated_at: new Date(),
        },
      });
    }

    return updated;
  });

  return { code: 1, message: 'Component synced from D-Flight', data: result };
}
