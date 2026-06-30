import { refreshMaintenanceDaysForOwner, refreshMaintenanceDaysForTool } from '@/backend/utils/refresh-maintenance-days';
import { prisma } from '@/lib/prisma';
import { buildS3Url, getPresignedDownloadUrl, uploadFileToS3 } from '@/lib/s3Client';
import { Prisma } from '@prisma/client';

export interface StoredFile {
  filename: string;
  filekey: string;
  fileurl: string;
  filesize: number;
  uploaded_at: string;
}

export interface AddSystemInput {
  fk_owner_id: number;
  tool_code: string;
  tool_name?: string;
  tool_description?: string | null;
  tool_active?: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  activationDate?: string | null;
  clientId?: number | null;
  files?: File[];
}

export async function getSystemList(
  ownerId: number,
  clientId?: number,
  active: string = 'ALL',
) {
  const rawTools = await prisma.tool.findMany({
    where: {
      fk_owner_id: ownerId,
      ...(active !== 'ALL' && { tool_active: active }),
    },
    orderBy: { tool_id: 'desc' },
  });

  const data = rawTools.filter(
    (t) => (t.tool_metadata as any)?.deleted !== true && (t.tool_metadata as any)?.is_warehouse !== true,
  );

  const clientIds = [
    ...new Set(
      data.map((t) => (t.tool_metadata as any)?.clientId).filter(Boolean) as number[],
    ),
  ];

  let clientMap: Record<number, string> = {};
  if (clientIds.length > 0) {
    const clients = await prisma.client.findMany({
      where: { client_id: { in: clientIds } },
      select: { client_id: true, client_name: true },
    });
    clientMap = clients.reduce(
      (acc, c) => { acc[c.client_id] = c.client_name; return acc; },
      {} as Record<number, string>,
    );
  }

  const toolIds = data.map((t) => t.tool_id);
  let missionData: Record<number, { count: number; time: number; distance: number }> = {};
  const toolsInMaintenance = new Set<number>();
  const toolsNonOperational = new Set<number>();

  if (toolIds.length > 0) {
    const [missions, openTickets, openComponentTickets, expiredComps, flightExpirableComps] = await Promise.all([
      // Mission stats per tool
      prisma.pilot_mission.findMany({
        where: { fk_owner_id: ownerId, fk_tool_id: { in: toolIds } },
        select: { fk_tool_id: true, fk_mission_status_id: true, flight_duration: true, distance_flown: true },
      }),
      // Tools with open maintenance tickets
      prisma.maintenance_ticket.findMany({
        where: { fk_tool_id: { in: toolIds }, ticket_status: { not: 'CLOSED' } },
        select: { fk_tool_id: true },
      }),
      // Tools whose components are in maintenance
      prisma.tool_component.findMany({
        where: { fk_tool_id: { in: toolIds }, component_metadata: { path: ['component_status'], equals: 'MAINTENANCE' } },
        select: { fk_tool_id: true },
      }),
      // Tools with at least one date-expired component
      prisma.tool_component.findMany({
        where: { fk_tool_id: { in: toolIds }, component_active: 'Y', expiration_date: { lte: new Date(), not: null } },
        select: { fk_tool_id: true, component_id: true, component_name: true, expiration_date: true },
      }),
      // Tools with components that may be flight-expired
      prisma.tool_component.findMany({
        where: { fk_tool_id: { in: toolIds }, component_active: 'Y', expiry_type: { in: ['FLIGHTS', 'FLIGHT_HOURS', 'MIXED'] } },
        select: { fk_tool_id: true, expiration_flights: true, current_maintenance_flights: true, expiration_flight_hours: true, current_usage_hours: true },
      }),
    ]);

    missions.forEach((m) => {
      if (m.fk_tool_id == null) return;
      if (!missionData[m.fk_tool_id]) {
        missionData[m.fk_tool_id] = { count: 0, time: 0, distance: 0 };
      }
      missionData[m.fk_tool_id].count++;
      missionData[m.fk_tool_id].time += m.flight_duration || 0;
      missionData[m.fk_tool_id].distance += Number(m.distance_flown) || 0;
    });

    openTickets.forEach((t) => { if (t.fk_tool_id != null) toolsInMaintenance.add(t.fk_tool_id); });
    openComponentTickets.forEach((c) => { if (c.fk_tool_id != null) toolsInMaintenance.add(c.fk_tool_id); });
    expiredComps.forEach((c) => { if (c.fk_tool_id != null) toolsNonOperational.add(c.fk_tool_id); });
    flightExpirableComps
      .filter((c) =>
        (c.expiration_flights != null && Number(c.current_maintenance_flights) >= Number(c.expiration_flights)) ||
        (c.expiration_flight_hours != null && Number(c.current_usage_hours) >= Number(c.expiration_flight_hours))
      )
      .forEach((c) => { if (c.fk_tool_id != null) toolsNonOperational.add(c.fk_tool_id); });

    // Fire-and-forget expiration notifications for managers
    if (expiredComps.length > 0) {
      const { sendExpirationNotifications } = await import('@/backend/services/system/expiration-notification');
      const expiredItems = expiredComps
        .filter((c) => c.fk_tool_id != null)
        .map((c) => {
          const tool = data.find((t) => t.tool_id === c.fk_tool_id);
          return {
            tool_component_id: c.component_id,
            component_name: c.component_name,
            tool_id: c.fk_tool_id as number,
            tool_code: tool?.tool_code ?? String(c.fk_tool_id),
            expiration_date: c.expiration_date?.toISOString() ?? '',
          };
        });
      sendExpirationNotifications(ownerId, expiredItems).catch(() => { });
    }
  }

  let filtered = data;
  if (clientId && clientId !== 0) {
    filtered = filtered.filter((t) => (t.tool_metadata as any)?.clientId === clientId);
  }

  return {
    code: 1,
    message: 'Success',
    dataRows: filtered.length,
    data: await Promise.all(
      filtered.map(async (item) => {
        const metaClientId = (item.tool_metadata as any)?.clientId;

        const storedFiles: StoredFile[] = (item.tool_metadata as any)?.files ?? [];
        const filesWithUrls = await Promise.all(
          storedFiles.map(async (f: StoredFile) => {
            let downloadUrl = '#';
            if (f.filekey) {
              try {
                downloadUrl = await getPresignedDownloadUrl(f.filekey, 1800);
              } catch {
                downloadUrl = '#';
              }
            }
            return { ...f, download_url: downloadUrl };
          }),
        );

        const primaryDownloadUrl = filesWithUrls[0]?.download_url ?? null;

        return {
          tool_id: item.tool_id,
          fk_owner_id: item.fk_owner_id,
          fk_client_id: metaClientId || null,
          tool_code: item.tool_code,
          tool_desc: item.tool_description,
          active: item.tool_active,
          location: item.location || '',
          date_activation: (item.tool_metadata as any)?.activationDate || '',
          client_name: clientMap[metaClientId] || '',
          tool_latitude: (item.tool_metadata as any)?.latitude,
          tool_longitude: (item.tool_metadata as any)?.longitude,
          tool_status: (() => {
            const stored = (item.tool_metadata as any)?.status as string | undefined;
            if (stored) return stored;
            if (toolsNonOperational.has(item.tool_id)) return 'NOT_OPERATIONAL';
            if (toolsInMaintenance.has(item.tool_id)) return 'MAINTENANCE';
            return 'OPERATIONAL';
          })(),
          tot_mission: missionData[item.tool_id]?.count || 0,
          tot_flown_time: missionData[item.tool_id]?.time || 0,
          tot_flown_meter: missionData[item.tool_id]?.distance || 0,
          tool_maintenance_logbook: (item.tool_metadata as any)?.maintenanceLogbook || 'N',
          files: filesWithUrls,
          file_count: filesWithUrls.length,
          file_key: item.filekey ?? null,
          file_download_url: primaryDownloadUrl,
        };
      }),
    ),
  };
}

const sanitizeFilename = (original: string): string => {
  return original
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/['"\\/:*?<>|()[\]{},;@!]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    || 'file';
}

export async function addSystem(toolData: AddSystemInput) {
  const existingTools = await prisma.tool.findMany({
    where: { fk_owner_id: toolData.fk_owner_id, tool_code: toolData.tool_code },
    select: { tool_id: true, tool_metadata: true },
  });

  const existing = existingTools.find((t) => (t.tool_metadata as any)?.deleted !== true);
  if (existing) throw new Error('System code already exists for this owner');

  const filesToUpload: File[] = Array.isArray(toolData.files)
    ? toolData.files.filter((f) => f instanceof File && f.size > 0)
    : [];

  const uploadedFiles: StoredFile[] = [];

  for (const f of filesToUpload) {
    const safeFilename = sanitizeFilename(f.name);
    const key = `system/${toolData.fk_owner_id}/${toolData.tool_code}/${Date.now()}_${safeFilename}`;
    await uploadFileToS3(key, f);
    const url = buildS3Url(key);
    uploadedFiles.push({
      filename: f.name,
      filekey: key,
      fileurl: url,
      filesize: f.size,
      uploaded_at: new Date().toISOString(),
    });
  }

  const primaryFile = uploadedFiles[0] ?? null;

  const data = await prisma.tool.create({
    data: {
      fk_owner_id: toolData.fk_owner_id,
      tool_code: toolData.tool_code,
      tool_name: toolData.tool_name || toolData.tool_code,
      tool_description: toolData.tool_description || null,
      location: toolData.location || null,
      tool_active: toolData.tool_active || 'Y',
      filekey: primaryFile?.filekey ?? null,
      fileurl: primaryFile?.fileurl ?? null,
      tool_metadata: {
        clientId: toolData.clientId ?? null,
        latitude: toolData.latitude ?? null,
        longitude: toolData.longitude ?? null,
        activationDate: toolData.activationDate ?? null,
        maintenanceLogbook: 'N',
        files: uploadedFiles,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return { code: 1, message: 'System added successfully', data };
}


export async function updateTool(toolId: number, toolData: any) {
  const current = await prisma.tool.findUnique({
    where: { tool_id: toolId },
    select: { tool_metadata: true },
  });

  const data = await prisma.tool.update({
    where: { tool_id: toolId },
    data: {
      tool_code: toolData.tool_code,
      tool_description: toolData.tool_desc,
      location: toolData.location || null,
      tool_active: toolData.tool_active,
      tool_metadata: {
        ...(current?.tool_metadata as Record<string, unknown> ?? {}),
        clientId: toolData.fk_client_id,
        latitude: toolData.tool_latitude,
        longitude: toolData.tool_longitude,
        activationDate: toolData.date_activation || null,
        status: toolData.tool_status,
        maintenanceLogbook: toolData.tool_maintenance_logbook,
      } as Prisma.InputJsonValue,
    },
  });

  return { code: 1, message: 'system updated successfully', data };
}


export async function getOrCreateWarehouseTool(ownerId: number): Promise<number> {
  const tools = await prisma.tool.findMany({
    where: { fk_owner_id: ownerId },
    select: { tool_id: true, tool_metadata: true },
  });

  const existing = tools.find((t) => (t.tool_metadata as any)?.is_warehouse === true);
  if (existing) return existing.tool_id;

  const created = await prisma.tool.create({
    data: {
      fk_owner_id: ownerId,
      tool_code: '__WAREHOUSE__',
      tool_name: 'Warehouse',
      tool_active: 'Y',
      tool_metadata: { is_warehouse: true } as Prisma.InputJsonValue,
    },
    select: { tool_id: true },
  });

  return created.tool_id;
}


export async function deleteSystem(ownerId: number, toolId: number) {
  const tool = await prisma.tool.findFirst({
    where: { tool_id: toolId, fk_owner_id: ownerId },
    select: { tool_id: true, tool_code: true, tool_metadata: true },
  });

  if (!tool) throw new Error('System not found or unauthorized');

  const currentStatus = (tool.tool_metadata as any)?.status || 'OPERATIONAL';

  if (currentStatus !== 'NOT_OPERATIONAL') {
    await prisma.tool.update({
      where: { tool_id: toolId },
      data: {
        tool_metadata: {
          ...(tool.tool_metadata as Record<string, unknown> ?? {}),
          status: 'NOT_OPERATIONAL',
        } as Prisma.InputJsonValue,
      },
    });
    return { code: 2, message: 'System set to non-operational. Delete again to permanently remove it.' };
  }

  const components = await prisma.tool_component.findMany({
    where: { fk_tool_id: toolId },
    select: { component_id: true, component_metadata: true },
  });

  if (components.length > 0) {
    const warehouseToolId = await getOrCreateWarehouseTool(ownerId);

    await prisma.$executeRaw`
    UPDATE tool_component AS tc
    SET fk_tool_id = ${warehouseToolId},
        component_metadata = v.metadata::jsonb
    FROM (VALUES ${Prisma.join(
      components.map(
        (comp) =>
          Prisma.sql`(${comp.component_id}::int, ${JSON.stringify({
            ...(comp.component_metadata as Record<string, unknown> ?? {}),
            system_detached: true,
          })}::text)`,
      ),
    )}) AS v(component_id, metadata)
    WHERE tc.component_id = v.component_id
  `;

  }

  await prisma.tool.delete({ where: { tool_id: toolId } });

  return { code: 1, message: 'System permanently deleted. All components moved to warehouse.', toolCode: tool.tool_code };
}


export async function getModelList(ownerId: number) {
  const data = await prisma.tool_model.findMany({
    where: {
      specifications: { path: ['fk_owner_id'], equals: ownerId },
    },
    select: {
      model_id: true,
      model_code: true,
      model_name: true,
      manufacturer: true,
      specifications: true,
      model_description: true,
      model_active: true,
    },
    orderBy: { model_id: 'desc' },
  });

  return {
    code: 1,
    message: 'Success',
    dataRows: data.length,
    data: data.map((item) => {
      const specs = (item.specifications as Record<string, any>) || {};
      const notes: string = typeof specs.notes === 'string' ? specs.notes : '';
      const cycleMatch = notes.match(/^Maintenance Cycle:\s*(.+)$/m);
      const hoursMatch = notes.match(/^Maint\. Hours:\s*([\d.]+)$/m);
      const daysMatch = notes.match(/^Maint\. Days:\s*([\d.]+)$/m);
      const flightsMatch = notes.match(/^Maint\. Flights:\s*([\d.]+)$/m);

      return {
        tool_model_id: item.model_id,
        factory_type: item.manufacturer,
        factory_name: item.manufacturer,
        factory_serie: item.model_code,
        factory_model: item.model_name,
        model_type: item.model_description || '',
        model_active: item.model_active ?? 'Y',
        specifications: item.specifications,
        max_flight_time: specs.max_flight_time ?? null,
        max_speed: specs.max_speed ?? null,
        max_altitude: specs.max_altitude ?? null,
        weight: specs.weight ?? null,
        maintenance_cycle: cycleMatch ? cycleMatch[1].trim() : null,
        maintenance_cycle_hour: hoursMatch ? Number(hoursMatch[1]) : null,
        maintenance_cycle_day: daysMatch ? Number(daysMatch[1]) : null,
        maintenance_cycle_flight: flightsMatch ? Number(flightsMatch[1]) : null,
      };
    }),
  };
}


export async function deleteModel(ownerId: number, modelId: number) {
  const modelRow = await prisma.tool_model.findUnique({
    where: { model_id: modelId },
    select: { model_code: true, model_name: true },
  });

  const ownerTools = await prisma.tool.findMany({
    where: { fk_owner_id: ownerId },
    select: { tool_id: true },
  });

  const toolIds = ownerTools.map((t) => t.tool_id);

  if (toolIds.length > 0) {
    const comps = await prisma.tool_component.findMany({
      where: { fk_tool_id: { in: toolIds } },
      select: { component_id: true, component_metadata: true },
    });

    const referencing = comps.filter(
      (c) => (c.component_metadata as any)?.fk_tool_model_id == modelId,
    );

    if (referencing.length > 0) {
      await prisma.$executeRaw`
    UPDATE tool_component AS tc
    SET component_metadata = v.metadata::jsonb
    FROM (VALUES ${Prisma.join(
        referencing.map(
          (comp) =>
            Prisma.sql`(${comp.component_id}::int, ${JSON.stringify({
              ...(comp.component_metadata as Record<string, unknown> ?? {}),
              fk_tool_model_id: null,
            })}::text)`,
        ),
      )}) AS v(component_id, metadata)
    WHERE tc.component_id = v.component_id
  `;
    }
  }

  await prisma.tool_model.delete({ where: { model_id: modelId } });

  return { code: 1, message: 'Model deleted successfully', modelCode: modelRow?.model_code ?? null, modelName: modelRow?.model_name ?? null };
}


export async function deleteComponent(ownerId: number, componentId: number, force: boolean = false) {
  const comp = await prisma.tool_component.findUnique({
    where: { component_id: componentId },
    select: { component_id: true, fk_tool_id: true, component_code: true, component_name: true, component_type: true, component_metadata: true },
  });

  if (!comp) throw new Error('Component not found');

  if (comp.fk_tool_id !== null) {
    const tool = await prisma.tool.findFirst({
      where: { tool_id: comp.fk_tool_id, fk_owner_id: ownerId },
      select: { tool_id: true, tool_code: true },
    });

    if (!tool) throw new Error('Component not found or unauthorized');

    const isDetached = (comp.component_metadata as any)?.system_detached === true;

    if (!force && !isDetached) {
      return {
        code: 2,
        message: `Component is attached to system "${tool.tool_code}". Detach it from the system before deleting.`,
        system_code: tool.tool_code,
      };
    }
  }

  await prisma.tool_component.delete({ where: { component_id: componentId } });

  return {
    code: 1,
    message: 'Component deleted successfully',
    componentCode: comp.component_code ?? null,
    componentName: comp.component_name ?? null,
    componentType: comp.component_type ?? null,
  };
}


export async function getToolCode(toolId: number, ownerId: number): Promise<string | null> {
  const data = await prisma.tool.findFirst({
    where: { tool_id: toolId, fk_owner_id: ownerId },
    select: { tool_code: true },
  });
  return data?.tool_code ?? null;
}


export async function detachComponent(ownerId: number, componentId: number) {
  const comp = await prisma.tool_component.findUnique({
    where: { component_id: componentId },
    select: { component_id: true, fk_tool_id: true, component_code: true, component_name: true, component_type: true, component_metadata: true },
  });

  if (!comp) throw new Error('Component not found');

  const tool = await prisma.tool.findFirst({
    where: { tool_id: comp.fk_tool_id ?? undefined, fk_owner_id: ownerId },
    select: { tool_id: true, tool_code: true, tool_metadata: true },
  });

  if (!tool) throw new Error('Component not found or unauthorized');

  const updatedMetadata = {
    ...(comp.component_metadata as Record<string, unknown> ?? {}),
    system_detached: true,
    component_status: 'DISMISSED',
  };

  await prisma.tool_component.update({
    where: { component_id: componentId },
    data: { component_metadata: updatedMetadata as Prisma.InputJsonValue },
  });

  // Cascade: also detach all children that reference this component as parent
  const siblings = await prisma.tool_component.findMany({
    where: { fk_tool_id: comp.fk_tool_id ?? undefined, component_id: { not: componentId } },
    select: { component_id: true, component_metadata: true },
  });

  const children = siblings.filter(
    (c) => (c.component_metadata as any)?.fk_parent_component_id === componentId,
  );

  for (const child of children) {
    const childMeta = {
      ...(child.component_metadata as Record<string, unknown> ?? {}),
      system_detached: true,
      component_status: 'DISMISSED',
    };
    await prisma.tool_component.update({
      where: { component_id: child.component_id },
      data: { component_metadata: childMeta as Prisma.InputJsonValue },
    });
  }

  // Set the system itself to DISMISSED
  const toolMeta = (tool.tool_metadata as Record<string, unknown>) ?? {};
  if (toolMeta.status !== 'DISMISSED') {
    await prisma.tool.update({
      where: { tool_id: tool.tool_id },
      data: { tool_metadata: { ...toolMeta, status: 'DISMISSED' } as Prisma.InputJsonValue },
    });
  }

  return {
    code: 1,
    message: 'Component detached from system successfully',
    componentCode: comp.component_code ?? null,
    componentName: comp.component_name ?? null,
    componentType: comp.component_type ?? null,
    toolCode: tool.tool_code ?? null,
    childrenDetached: children.length,
  };
}


export async function addModel(modelData: any) {
  const specsWithOwner = {
    ...(modelData.technical_specs || {}),
    fk_owner_id: modelData.fk_owner_id,
  };

  const data = await prisma.tool_model.create({
    data: {
      model_code: modelData.factory_serie,
      model_name: modelData.factory_model,
      manufacturer: modelData.factory_type,
      model_description: modelData.model_type || null,
      specifications: specsWithOwner as Prisma.InputJsonValue,
      model_active: 'Y',
    },
  });

  return { code: 1, message: 'Model added successfully', data };
}


export async function updateModel(modelId: number, modelData: any) {
  const existing = await prisma.tool_model.findUnique({
    where: { model_id: modelId },
    select: { specifications: true },
  });

  const updatedSpecs = {
    ...(existing?.specifications as Record<string, unknown> ?? {}),
    ...(modelData.max_flight_time !== undefined ? { max_flight_time: modelData.max_flight_time } : {}),
    ...(modelData.max_speed !== undefined ? { max_speed: modelData.max_speed } : {}),
    ...(modelData.max_altitude !== undefined ? { max_altitude: modelData.max_altitude } : {}),
    ...(modelData.weight !== undefined ? { weight: modelData.weight } : {}),
    ...(modelData.notes !== undefined ? { notes: modelData.notes } : {}),
  };

  const updatePayload: any = {
    manufacturer: modelData.manufacturer,
    model_code: modelData.model_code,
    model_name: modelData.model_name,
    model_description: modelData.model_type || null,
    specifications: updatedSpecs as Prisma.InputJsonValue,
  };
  if (modelData.model_active !== undefined) {
    updatePayload.model_active = modelData.model_active;
  }

  const data = await prisma.tool_model.update({
    where: { model_id: modelId },
    data: updatePayload,
  });

  return { code: 1, message: 'Model updated successfully', data };
}


export async function getComponentList(ownerId: number, toolId?: number, includeDetached: boolean = false) {
  if (toolId && toolId !== 0) {
    await refreshMaintenanceDaysForTool(toolId);
  } else {
    await refreshMaintenanceDaysForOwner(ownerId);
  }

  const selectFields = `
    component_id,
    fk_tool_id,
    component_code,
    component_name,
    component_type,
    component_description,
    serial_number,
    component_active,
    installation_date,
    component_metadata,
    maintenance_cycle,
    maintenance_cycle_hour,
    maintenance_cycle_day,
    maintenance_cycle_flight,
    current_usage_hours,
    current_maintenance_hours,
    current_maintenance_days,
    current_maintenance_flights,
    last_maintenance_date,
    dcc_drone_id,
    drone_registration_code,
    drc_synced_at,
    expiration_date,
    expiry_type,
    expiration_flights,
    expiration_flight_hours
  `;

  // Specific system view: non-detached components for that tool only
  if (toolId && toolId !== 0) {
    const ownerTool = await prisma.tool.findFirst({
      where: { fk_owner_id: ownerId, tool_id: toolId },
      select: { tool_id: true },
    });

    if (!ownerTool) return { code: 1, message: 'Success', dataRows: 0, data: [] };

    const rawData = await prisma.tool_component.findMany({
      where: { fk_tool_id: toolId },
      orderBy: { component_id: 'desc' },
    });

    // Only filter out detached components if includeDetached is false
    const filteredData = includeDetached ? rawData : rawData.filter((item) => (item.component_metadata as any)?.system_detached !== true);
    return buildComponentListResult(filteredData);
  }

  const allTools = await prisma.tool.findMany({
    where: { fk_owner_id: ownerId },
    select: { tool_id: true },
  });

  const allToolIds = allTools.map((t) => t.tool_id);
  if (allToolIds.length === 0) return { code: 1, message: 'Success', dataRows: 0, data: [] };

  const rawData = await prisma.tool_component.findMany({
    where: { fk_tool_id: { in: allToolIds } },
    orderBy: { component_id: 'desc' },
  });

  return buildComponentListResult(rawData);
}

function buildComponentListResult(data: any[]) {
  const today = new Date().toISOString().split('T')[0];
  return {
    code: 1,
    message: 'Success',
    dataRows: data.length,
    data: data.map((item) => {
      const expiryType: string = item.expiry_type || 'EXPIRATION_DATE';
      const isDateExpired = item.expiration_date && item.expiration_date <= today;
      const isFlightExpired =
        item.expiration_flights != null &&
        Number(item.current_maintenance_flights) >= item.expiration_flights;
      const isFlightHoursExpired =
        item.expiration_flight_hours != null &&
        Number(item.current_usage_hours) >= Number(item.expiration_flight_hours);
      const isExpired =
        expiryType === 'FLIGHTS'
          ? isFlightExpired
          : expiryType === 'FLIGHT_HOURS'
            ? isFlightHoursExpired
            : expiryType === 'MIXED'
              ? isDateExpired || isFlightExpired || isFlightHoursExpired
              : isDateExpired;
      const storedStatus = item.component_metadata?.component_status;
      const effectiveStatus = storedStatus === 'DISMISSED'
        ? 'DISMISSED'
        : isExpired
          ? 'DECOMMISSIONED'
          : (storedStatus || 'OPERATIONAL');
      return {
        tool_component_id: item.component_id,
        fk_tool_id: item.fk_tool_id,
        component_active: item.component_active,
        system_detached: item.component_metadata?.system_detached === true,
        component_type: item.component_type,
        component_code: item.component_code,
        component_name: item.component_name,
        component_sn: item.serial_number,
        component_desc: item.component_description,
        component_status: effectiveStatus,
        component_category: item.component_metadata?.component_category || 'STANDARD',
        component_activation_date: item.installation_date,
        component_purchase_date: item.component_metadata?.component_purchase_date || null,
        component_vendor: item.component_metadata?.component_vendor || '',
        component_guarantee_day: item.component_metadata?.component_guarantee_day || 0,
        fk_client_id: item.component_metadata?.fk_client_id || null,
        fk_tool_model_id: item.component_metadata?.fk_tool_model_id || null,
        fk_parent_component_id: item.component_metadata?.fk_parent_component_id ?? null,
        cc_platform: item.component_metadata?.cc_platform || '',
        gcs_type: item.component_metadata?.gcs_type || '',
        factory_serie: item.component_code,
        factory_model: item.component_name,
        maintenance_cycle: item.maintenance_cycle || '',
        maintenance_cycle_hour: item.maintenance_cycle_hour ?? '',
        maintenance_cycle_day: item.maintenance_cycle_day ?? '',
        maintenance_cycle_flight: item.maintenance_cycle_flight ?? '',
        battery_cycle_ratio: item.component_metadata?.battery_cycle_ratio ?? null,
        current_usage_hours: Number(item.current_usage_hours) || 0,
        current_maintenance_hours: Number(item.current_maintenance_hours) || 0,
        current_maintenance_days: Number(item.current_maintenance_days) || 0,
        current_maintenance_flights: Number(item.current_maintenance_flights) || 0,
        last_maintenance_date: item.last_maintenance_date || null,
        dcc_drone_id: item.dcc_drone_id ?? null,
        drone_registration_code: item.drone_registration_code ?? null,
        drc_synced_at: item.drc_synced_at ?? null,
        latitude: item.component_metadata?.latitude ?? null,
        longitude: item.component_metadata?.longitude ?? null,
        drone_classes: item.component_metadata?.drone_classes ?? null,
        is_primary: item.component_metadata?.is_primary ?? false,
        expiration_date: item.expiration_date || null,
        expiry_type: expiryType,
        expiration_flights: item.expiration_flights ?? null,
        expiration_flight_hours: item.expiration_flight_hours != null ? Number(item.expiration_flight_hours) : null,
      };
    }),
  };
}


export async function addComponent(componentData: any) {
  const normalizedSerial = typeof componentData.component_sn === 'string'
    ? componentData.component_sn.trim()
    : '';

  if (normalizedSerial) {
    const duplicate = await prisma.tool_component.findFirst({
      where: { serial_number: { equals: normalizedSerial, mode: 'insensitive' } },
      select: { component_id: true },
    });

    if (duplicate) {
      return { code: 0, message: `Component serial number "${normalizedSerial}" already exists.` };
    }
  }

  let maintenanceCycle: string | null = null;
  let maintenanceCycleHour: number | null = null;
  let maintenanceCycleDay: number | null = null;
  let maintenanceCycleFlight: number | null = null;

  if (componentData.fk_tool_model_id) {
    const model = await prisma.tool_model.findUnique({
      where: { model_id: componentData.fk_tool_model_id },
      select: { specifications: true },
    });

    if ((model?.specifications as any)?.notes) {
      const notes: string = (model!.specifications as any).notes;
      const cycleMatch = notes.match(/^Maintenance Cycle:\s*(.+)$/m);
      const hoursMatch = notes.match(/^Maint\. Hours:\s*([\d.]+)$/m);
      const daysMatch = notes.match(/^Maint\. Days:\s*([\d.]+)$/m);
      const flightsMatch = notes.match(/^Maint\. Flights:\s*([\d.]+)$/m);

      maintenanceCycle = cycleMatch ? cycleMatch[1].trim() : null;
      maintenanceCycleHour = hoursMatch ? Number(hoursMatch[1]) : null;
      maintenanceCycleDay = daysMatch ? Number(daysMatch[1]) : null;
      maintenanceCycleFlight = flightsMatch ? Number(flightsMatch[1]) : null;
    }
  }

  const finalCycle = componentData.maintenance_cycle ?? maintenanceCycle;
  const finalHour = componentData.maintenance_cycle_hour ?? maintenanceCycleHour;
  const finalDay = componentData.maintenance_cycle_day ?? maintenanceCycleDay;
  const finalFlight = componentData.maintenance_cycle_flight ?? maintenanceCycleFlight;

  const data = await prisma.tool_component.create({
    data: {
      fk_tool_id: componentData.fk_tool_id,
      component_name: componentData.component_code || componentData.component_type,
      component_type: componentData.component_type,
      component_code: componentData.component_code || componentData.component_type,
      component_description: componentData.component_desc || componentData.component_vendor || null,
      serial_number: normalizedSerial || null,
      installation_date: componentData.component_activation_date ? new Date(componentData.component_activation_date) : null,
      component_active: 'Y',
      maintenance_cycle: finalCycle || null,
      maintenance_cycle_hour: finalHour ?? null,
      maintenance_cycle_day: finalDay ?? null,
      maintenance_cycle_flight: finalFlight ?? null,
      current_usage_hours: componentData.initial_usage_hours ?? 0,
      current_maintenance_hours: componentData.initial_maintenance_hours ?? 0,
      current_maintenance_flights: componentData.initial_maintenance_flights ?? 0,
      dcc_drone_id: componentData.dcc_drone_id || null,
      drone_registration_code: componentData.drone_registration_code || null,
      expiration_date: componentData.expiration_date ? new Date(componentData.expiration_date) : null,
      expiry_type: componentData.expiry_type || 'EXPIRATION_DATE',
      expiration_flights: componentData.expiration_flights ?? null,
      expiration_flight_hours: componentData.expiration_flight_hours ?? null,
      component_metadata: {
        cc_platform: componentData.cc_platform || null,
        gcs_type: componentData.gcs_type || null,
        component_status: (() => {
          const today = new Date().toISOString().split('T')[0];
          const expiryType: string = componentData.expiry_type || 'EXPIRATION_DATE';
          const isDateExpired = componentData.expiration_date && componentData.expiration_date <= today;
          const isFlightExpired =
            componentData.expiration_flights != null &&
            (componentData.initial_maintenance_flights ?? 0) >= componentData.expiration_flights;
          const isFlightHoursExpired =
            componentData.expiration_flight_hours != null &&
            (componentData.initial_usage_hours ?? 0) >= componentData.expiration_flight_hours;
          const isExpired =
            expiryType === 'FLIGHTS'
              ? isFlightExpired
              : expiryType === 'FLIGHT_HOURS'
                ? isFlightHoursExpired
                : expiryType === 'MIXED'
                  ? isDateExpired || isFlightExpired || isFlightHoursExpired
                  : isDateExpired;
          return isExpired ? 'DECOMMISSIONED' : (componentData.component_status || 'OPERATIONAL');
        })(),
        component_category: componentData.component_category || 'STANDARD',
        fk_tool_model_id: componentData.fk_tool_model_id || null,
        fk_parent_component_id: componentData.fk_parent_component_id ?? null,
        component_purchase_date: componentData.component_purchase_date || null,
        component_guarantee_day: componentData.component_guarantee_day || null,
        component_vendor: componentData.component_vendor || null,
        battery_cycle_ratio: componentData.battery_cycle_ratio != null ? Number(componentData.battery_cycle_ratio) : null,
        latitude: componentData.latitude ?? null,
        longitude: componentData.longitude ?? null,
        drone_classes: componentData.drone_classes ?? null,
        location_history: componentData.latitude != null && componentData.longitude != null
          ? [{ latitude: componentData.latitude, longitude: componentData.longitude, changed_at: new Date().toISOString() }]
          : [],
        ...(componentData.system_detached ? { system_detached: true } : {}),
      } as Prisma.InputJsonValue,
    },
  });

  return { code: 1, message: 'Component added successfully', data };
}


export async function updateComponent(componentId: number, componentData: any) {
  const normalizedSerial = typeof componentData.component_sn === 'string'
    ? componentData.component_sn.trim()
    : '';

  if (normalizedSerial) {
    const duplicate = await prisma.tool_component.findFirst({
      where: {
        serial_number: { equals: normalizedSerial, mode: 'insensitive' },
        component_id: { not: componentId },
      },
      select: { component_id: true },
    });

    if (duplicate) {
      return { code: 0, message: `Component serial number "${normalizedSerial}" already exists.` };
    }
  }

  if (componentData.fk_tool_id) {
    await refreshMaintenanceDaysForTool(componentData.fk_tool_id);
  }

  const existing = await prisma.tool_component.findUnique({
    where: { component_id: componentId },
    select: { component_metadata: true, fk_tool_id: true, current_usage_hours: true, current_maintenance_hours: true, current_maintenance_flights: true },
  });

  const existingMeta = (existing?.component_metadata as Record<string, unknown>) || {};
  const { system_detached: _ignored, ...existingMetaWithoutDetached } = existingMeta;
  const baseMeta = componentData.system_detached ? existingMeta : existingMetaWithoutDetached;

  // Only apply initial_* fields if they are explicitly different from current values
  // This prevents accidental counter resets when moving components between systems
  const shouldResetUsageHours = componentData.initial_usage_hours != null && 
    (existing?.current_usage_hours == null || Number(componentData.initial_usage_hours) !== Number(existing.current_usage_hours));
  const shouldResetMaintenanceHours = componentData.initial_maintenance_hours != null && 
    (existing?.current_maintenance_hours == null || Number(componentData.initial_maintenance_hours) !== Number(existing.current_maintenance_hours));
  const shouldResetMaintenanceFlights = componentData.initial_maintenance_flights != null && 
    (existing?.current_maintenance_flights == null || Number(componentData.initial_maintenance_flights) !== Number(existing.current_maintenance_flights));

  const prevLat = existingMeta?.latitude ?? null;
  const prevLon = existingMeta?.longitude ?? null;
  const newLat = componentData.latitude ?? null;
  const newLon = componentData.longitude ?? null;
  const locationChanged =
    newLat != null &&
    newLon != null &&
    (String(prevLat) !== String(newLat) || String(prevLon) !== String(newLon));

  const existingHistory: any[] = Array.isArray(baseMeta.location_history) ? baseMeta.location_history : [];
  const updatedHistory = locationChanged
    ? [...existingHistory, { latitude: newLat, longitude: newLon, changed_at: new Date().toISOString() }]
    : existingHistory;

  const data = await prisma.tool_component.update({
    where: { component_id: componentId },
    data: {
      fk_tool_id: componentData.fk_tool_id,
      component_type: componentData.component_type,
      component_name: componentData.component_name || componentData.component_code || componentData.component_type,
      component_code: componentData.component_code || null,
      component_description: componentData.component_desc || null,
      serial_number: normalizedSerial || null,
      installation_date: componentData.component_activation_date ? new Date(componentData.component_activation_date) : null,
      dcc_drone_id: componentData.dcc_drone_id ?? null,
      drone_registration_code: componentData.drone_registration_code || null,
      expiration_date: componentData.expiration_date ? new Date(componentData.expiration_date) : null,
      expiry_type: componentData.expiry_type || 'EXPIRATION_DATE',
      expiration_flights: componentData.expiration_flights ?? null,
      expiration_flight_hours: componentData.expiration_flight_hours ?? null,
      ...(componentData.maintenance_cycle !== undefined && { maintenance_cycle: componentData.maintenance_cycle || null }),
      ...(componentData.maintenance_cycle_hour !== undefined && { maintenance_cycle_hour: componentData.maintenance_cycle_hour ?? null }),
      ...(componentData.maintenance_cycle_day !== undefined && { maintenance_cycle_day: componentData.maintenance_cycle_day ?? null }),
      ...(componentData.maintenance_cycle_flight !== undefined && { maintenance_cycle_flight: componentData.maintenance_cycle_flight ?? null }),
      ...(shouldResetUsageHours && { current_usage_hours: componentData.initial_usage_hours }),
      ...(shouldResetMaintenanceHours && { current_maintenance_hours: componentData.initial_maintenance_hours }),
      ...(shouldResetMaintenanceFlights && { current_maintenance_flights: componentData.initial_maintenance_flights }),
      component_metadata: {
        ...baseMeta,
        cc_platform: componentData.cc_platform || null,
        gcs_type: componentData.gcs_type || null,
        component_status: componentData.component_status || 'OPERATIONAL',
        component_category: componentData.component_category || 'STANDARD',
        fk_tool_model_id: componentData.fk_tool_model_id || null,
        fk_parent_component_id: componentData.fk_parent_component_id ?? null,
        component_purchase_date: componentData.component_purchase_date || null,
        component_guarantee_day: componentData.component_guarantee_day || null,
        component_vendor: componentData.component_vendor || null,
        battery_cycle_ratio: componentData.battery_cycle_ratio != null ? Number(componentData.battery_cycle_ratio) : null,
        latitude: newLat,
        longitude: newLon,
        drone_classes: componentData.drone_classes ?? baseMeta.drone_classes ?? null,
        location_history: updatedHistory,
        ...(componentData.system_detached ? { system_detached: true } : {}),
      } as Prisma.InputJsonValue,
    },
  });

  return { code: 1, message: 'Component updated successfully', data };
}


export async function syncDroneRegistrationCodes(
  ownerId: number,
  drones: { serial_number: string; drone_registration_code: string }[],
): Promise<{ updated: number; not_found: string[] }> {
  const tools = await prisma.tool.findMany({
    where: { fk_owner_id: ownerId },
    select: { tool_id: true },
  });

  const toolIds = tools.map((t) => t.tool_id);
  if (toolIds.length === 0) {
    return { updated: 0, not_found: drones.map((d) => d.serial_number) };
  }

  const components = await prisma.tool_component.findMany({
    where: {
      fk_tool_id: { in: toolIds },
      serial_number: { not: null },
    },
    select: { component_id: true, serial_number: true },
  });

  const snToId = new Map<string, number>();
  for (const c of components) {
    if (c.serial_number) snToId.set(c.serial_number.toLowerCase(), c.component_id);
  }

  const now = new Date();
  const not_found: string[] = [];
  let updated = 0;

  for (const drone of drones) {
    const componentId = snToId.get(drone.serial_number.toLowerCase());
    if (!componentId) {
      not_found.push(drone.serial_number);
      continue;
    }
    try {
      await prisma.tool_component.update({
        where: { component_id: componentId },
        data: { drone_registration_code: drone.drone_registration_code, drc_synced_at: now },
      });
      updated++;
    } catch { }
  }

  return { updated, not_found };
}


export async function getMaintenanceDashboard(
  ownerId: number,
  clientId?: number,
  thresholdAlert: number = 80
) {
  await refreshMaintenanceDaysForOwner(ownerId);

  const tools = await prisma.tool.findMany({
    where: { fk_owner_id: ownerId },
    select: {
      tool_id: true,
      tool_code: true,
      tool_name: true,
      tool_metadata: true,
      tool_component: {
        select: {
          component_id: true,
          component_name: true,
          component_type: true,
          current_usage_hours: true,
          expected_lifespan_hours: true,
        },
      },
    },
  });

  let filtered = tools;
  if (clientId && clientId !== 0) {
    filtered = filtered.filter((t) => (t.tool_metadata as any)?.clientId === clientId);
  }

  const maintenanceNeeded = filtered.filter((tool) => {
    const components = tool.tool_component;
    return components.some((comp) => {
      if (!comp.expected_lifespan_hours || comp.expected_lifespan_hours === 0) return false;
      return (Number(comp.current_usage_hours) / comp.expected_lifespan_hours) * 100 >= thresholdAlert;
    });
  });

  return { code: 1, message: 'Success', dataRows: maintenanceNeeded.length, data: maintenanceNeeded };
}

export interface ComponentFlightLog {
  log_id: number;
  mission_id: number;
  mission_code: string | null;
  log_source: string;
  original_filename: string;
  flytbase_flight_id: string | null;
  uploaded_at: string;
  flight_duration: number | null;
  distance_flown: number | null;
  actual_start: string | null;
  actual_end: string | null;
}

export async function getComponentFlightLogs(
  componentId: number,
  ownerId: number,
): Promise<{ code: number; message: string; data: ComponentFlightLog[] }> {
  const component = await prisma.tool_component.findUnique({
    where: { component_id: componentId },
    select: { component_id: true, fk_tool_id: true },
  });

  if (!component) return { code: 0, message: 'Component not found', data: [] };

  const toolId = component.fk_tool_id;
  if (!toolId) return { code: 1, message: 'Component not attached to a system', data: [] };

  const tool = await prisma.tool.findFirst({
    where: { tool_id: toolId, fk_owner_id: ownerId },
    select: { tool_id: true },
  });

  if (!tool) return { code: 0, message: 'Access denied', data: [] };

  const missions = await prisma.pilot_mission.findMany({
    where: { fk_tool_id: toolId },
    select: { pilot_mission_id: true, mission_code: true, actual_start: true, actual_end: true, flight_duration: true, distance_flown: true },
    orderBy: { actual_start: 'desc' },
  });

  if (!missions.length) return { code: 1, message: 'No missions found', data: [] };

  const missionIds = missions.map((m) => BigInt(m.pilot_mission_id));
  const missionMap = new Map(missions.map((m) => [m.pilot_mission_id, m]));

  const logs = await prisma.mission_flight_logs.findMany({
    where: { fk_mission_id: { in: missionIds } },
    select: { log_id: true, fk_mission_id: true, log_source: true, original_filename: true, flytbase_flight_id: true, uploaded_at: true },
    orderBy: { uploaded_at: 'desc' },
  });

  const data: ComponentFlightLog[] = logs.map((log) => {
    const missionId = Number(log.fk_mission_id);
    const mission = missionMap.get(missionId);
    return {
      log_id: Number(log.log_id),
      mission_id: missionId,
      mission_code: mission?.mission_code ?? null,
      log_source: log.log_source,
      original_filename: log.original_filename ?? '',
      flytbase_flight_id: log.flytbase_flight_id ?? null,
      uploaded_at: log.uploaded_at?.toISOString() ?? '',
      flight_duration: mission?.flight_duration ?? null,
      distance_flown: mission?.distance_flown != null ? Number(mission.distance_flown) : null,
      actual_start: mission?.actual_start?.toISOString() ?? null,
      actual_end: mission?.actual_end?.toISOString() ?? null,
    };
  });

  return { code: 1, message: 'Success', data };
}
