import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface ImportDFlightDroneInput {
  fk_owner_id: number;
  fk_client_id: number;
  dFlightId: string;
  tool_code: string;
  tool_description?: string | null;
  component_code: string;
  component_sn: string;
  fk_tool_model_id: number;
  drone_classes?: string[] | null;
  uas_serial_number?: string | null;
  gcs_serial_number?: string | null;
  license_plate?: string | null;
  insurance_name?: string | null;
  insurance_company?: string | null;
  insurance_expiry_date?: string | null;
  insurance_alert_recipients?: string[] | null;
  insurance_alert_days_before?: number | null;
  certifications?: { enac_authorizations?: string | null; sts_declarations?: string | null } | null;
  qr_code_image?: string | null;
}

export async function importDFlightDrone(input: ImportDFlightDroneInput) {
  const existingTools = await prisma.tool.findMany({
    where: { fk_owner_id: input.fk_owner_id, tool_code: input.tool_code },
    select: { tool_id: true, tool_metadata: true },
  });
  const toolCodeTaken = existingTools.some((t) => (t.tool_metadata as any)?.deleted !== true);
  if (toolCodeTaken) {
    return { code: 0, message: `System code "${input.tool_code}" already exists for this owner.` };
  }

  const normalizedSerial = input.component_sn.trim();
  if (normalizedSerial) {
    const duplicate = await prisma.tool_component.findFirst({
      where: {
        serial_number: { equals: normalizedSerial, mode: 'insensitive' },
        tool: { fk_owner_id: input.fk_owner_id },
      },
      select: { component_id: true },
    });
    if (duplicate) {
      return { code: 0, message: `Component serial number "${normalizedSerial}" already exists.` };
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const tool = await tx.tool.create({
      data: {
        fk_owner_id: input.fk_owner_id,
        tool_code: input.tool_code,
        tool_name: input.tool_code,
        tool_description: input.tool_description || null,
        tool_active: 'Y',
        tool_metadata: {
          clientId: input.fk_client_id,
          latitude: null,
          longitude: null,
          activationDate: null,
          maintenanceLogbook: 'N',
          files: [],
          source: 'D_FLIGHT_IMPORT',
        } as unknown as Prisma.InputJsonValue,
      },
    });

    const component = await tx.tool_component.create({
      data: {
        fk_tool_id: tool.tool_id,
        component_name: input.component_code,
        component_type: 'DRONE',
        component_code: input.component_code,
        serial_number: normalizedSerial || null,
        component_active: 'Y',
        drone_registration_code: input.dFlightId,
        drc_synced_at: new Date(),
        qr_code_image: input.qr_code_image || null,
        uas_serial_number: input.uas_serial_number || null,
        gcs_serial_number: input.gcs_serial_number || null,
        license_plate: input.license_plate || null,
        // Manual entry for now — d-flight has no documented endpoint for these.
        certifications: input.certifications?.enac_authorizations || input.certifications?.sts_declarations
          ? (input.certifications as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        component_metadata: {
          cc_platform: null,
          gcs_type: null,
          component_status: 'OPERATIONAL',
          component_category: 'STANDARD',
          fk_tool_model_id: input.fk_tool_model_id,
          fk_parent_component_id: null,
          component_purchase_date: null,
          component_guarantee_day: null,
          component_vendor: null,
          battery_cycle_ratio: null,
          latitude: null,
          longitude: null,
          drone_classes: input.drone_classes?.length ? input.drone_classes : null,
          location_history: [],
        } as unknown as Prisma.InputJsonValue,
      },
    });

    if (input.insurance_company || input.insurance_expiry_date) {
      await tx.component_insurance.create({
        data: {
          fk_component_id: component.component_id,
          insurance_name: input.insurance_name || null,
          insurance_company: input.insurance_company || null,
          expiry_date: input.insurance_expiry_date ? new Date(input.insurance_expiry_date) : null,
          alert_recipients: input.insurance_alert_recipients?.length
            ? (input.insurance_alert_recipients as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          alert_days_before: input.insurance_alert_days_before ?? 30,
        },
      });
    }

    return { tool, component };
  });

  return { code: 1, message: 'Drone imported successfully', data: result };
}
