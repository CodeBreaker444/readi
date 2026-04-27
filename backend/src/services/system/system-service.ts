import { supabase } from '@/backend/database/database';
import { refreshMaintenanceDaysForOwner, refreshMaintenanceDaysForTool } from '@/backend/utils/refresh-maintenance-days';
import { buildS3Url, getPresignedDownloadUrl, uploadFileToS3 } from '@/lib/s3Client';

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
  let query = supabase
    .from('tool')
    .select('*')
    .eq('fk_owner_id', ownerId);

  if (active !== 'ALL') query = query.eq('tool_active', active);

  const { data, error } = await query.order('tool_id', { ascending: false });
  if (error) throw error;

  const clientIds = [
    ...new Set(
      (data || []).map((t) => t.tool_metadata?.clientId).filter(Boolean) as number[],
    ),
  ];

  let clientMap: Record<number, string> = {};
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from('client')
      .select('client_id, client_name')
      .in('client_id', clientIds);

    clientMap =
      clients?.reduce(
        (acc, c) => { acc[c.client_id] = c.client_name; return acc; },
        {} as Record<number, string>,
      ) ?? {};
  }

  const toolIds = (data || []).map((t) => t.tool_id);
  let missionData: Record<number, { count: number; time: number; distance: number }> = {};
  const toolsInMaintenance = new Set<number>();

  if (toolIds.length > 0) {
    const [{ data: missions }, { data: openTickets }, { data: openComponentTickets }] = await Promise.all([
      supabase
        .from('pilot_mission')
        .select('fk_tool_id, fk_mission_status_id, flight_duration, distance_flown')
        .eq('fk_owner_id', ownerId)
        .in('fk_tool_id', toolIds),
      // Tools with open maintenance tickets
      supabase
        .from('maintenance_ticket')
        .select('fk_tool_id')
        .in('fk_tool_id', toolIds)
        .neq('ticket_status', 'CLOSED'),
      // Tools whose components are in maintenance
      supabase
        .from('tool_component')
        .select('fk_tool_id')
        .in('fk_tool_id', toolIds)
        .eq('component_active', 'Y')
        .eq('component_metadata->>component_status', 'MAINTENANCE'),
    ]);

    (missions || []).forEach((m) => {
      if (!missionData[m.fk_tool_id]) {
        missionData[m.fk_tool_id] = { count: 0, time: 0, distance: 0 };
      }
      missionData[m.fk_tool_id].count++;
      missionData[m.fk_tool_id].time += m.flight_duration || 0;
      missionData[m.fk_tool_id].distance += m.distance_flown || 0;
    });

    (openTickets || []).forEach((t) => toolsInMaintenance.add(t.fk_tool_id));
    (openComponentTickets || []).forEach((c) => toolsInMaintenance.add(c.fk_tool_id));
  }

  let filtered = data || [];
  if (clientId && clientId !== 0) {
    filtered = filtered.filter((t) => t.tool_metadata?.clientId === clientId);
  }

  return {
    code: 1,
    message: 'Success',
    dataRows: filtered.length,
    data: await Promise.all(
      filtered.map(async (item) => {
        const metaClientId = item.tool_metadata?.clientId;

        const storedFiles: StoredFile[] = item.tool_metadata?.files ?? [];
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
          date_activation: item.tool_metadata?.activationDate || '',
          client_name: clientMap[metaClientId] || '',
          tool_latitude: item.tool_metadata?.latitude,
          tool_longitude: item.tool_metadata?.longitude,
          tool_status: toolsInMaintenance.has(item.tool_id) ? 'MAINTENANCE' : (item.tool_metadata?.status || 'OPERATIONAL'),
          tot_mission: missionData[item.tool_id]?.count || 0,
          tot_flown_time: missionData[item.tool_id]?.time || 0,
          tot_flown_meter: missionData[item.tool_id]?.distance || 0,
          tool_maintenance_logbook: item.tool_metadata?.maintenanceLogbook || 'N',
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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/['"\\/:*?<>|()[\]{},;@!]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    || 'file';
}

export async function addSystem(toolData: AddSystemInput) {
  const { data: existing } = await supabase
    .from('tool')
    .select('tool_id')
    .eq('fk_owner_id', toolData.fk_owner_id)
    .eq('tool_code', toolData.tool_code)
    .maybeSingle();

  if (existing) throw new Error('System code already exists for this owner');

  const filesToUpload: File[] = Array.isArray(toolData.files)
    ? toolData.files.filter((f) => f instanceof File && f.size > 0)
    : [];

  const uploadedFiles: StoredFile[] = [];

  for (const f of filesToUpload) {
    const safeFilename = sanitizeFilename(f.name)
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

  const { data, error } = await supabase
    .from('tool')
    .insert({
      fk_owner_id: toolData.fk_owner_id,
      tool_code: toolData.tool_code,
      tool_name: toolData.tool_name || toolData.tool_code,
      tool_description: toolData.tool_description || null,
      location: toolData.location || null,
      tool_active: toolData.tool_active || 'Y',
      filekey: primaryFile?.filekey ?? null,
      fileurl: primaryFile?.fileurl ?? null,
      tool_metadata: {
        clientId: toolData.clientId || null,
        latitude: toolData.latitude || null,
        longitude: toolData.longitude || null,
        activationDate: toolData.activationDate || null,
        maintenanceLogbook: 'N',
        files: uploadedFiles,
      },
    })
    .select()
    .single();

  if (error) throw error;
  return { code: 1, message: 'System added successfully', data };
}


export async function updateTool(toolId: number, toolData: any) {
  const { data: current, error: fetchError } = await supabase
    .from('tool')
    .select('tool_metadata')
    .eq('tool_id', toolId)
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from('tool')
    .update({
      tool_code: toolData.tool_code,
      tool_description: toolData.tool_desc,
      location: toolData.location || null,
      tool_active: toolData.tool_active,
      tool_metadata: {
        ...current?.tool_metadata,
        clientId: toolData.fk_client_id,
        latitude: toolData.tool_latitude,
        longitude: toolData.tool_longitude,
        activationDate: toolData.date_activation || null,
        status: toolData.tool_status,
        maintenanceLogbook: toolData.tool_maintenance_logbook,
      },
    })
    .eq('tool_id', toolId)
    .select()
    .single();

  if (error) throw error;
  return { code: 1, message: 'system updated successfully', data };
}


export async function deleteSystem(ownerId: number, toolId: number) {
  const { error } = await supabase
    .from('tool')
    .update({ tool_active: 'N' })
    .eq('tool_id', toolId)
    .eq('fk_owner_id', ownerId);

  if (error) throw error;
  return { code: 1, message: 'system deleted successfully' };
}


export async function getModelList(ownerId: number) {
  const { data, error } = await supabase
    .from('tool_model')
    .select('model_id, model_code, model_name, manufacturer, specifications, model_description')
    .eq('model_active', 'Y')
    .eq('specifications->>fk_owner_id', String(ownerId))
    .order('model_id', { ascending: false });

  if (error) throw error;

  return {
    code: 1,
    message: 'Success',
    dataRows: data?.length || 0,
    data: (data || []).map((item) => {
      const specs = item.specifications || {};
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
  const { data: toolsUsing } = await supabase
    .from('tool')
    .select('tool_id, tool_code')
    .eq('fk_model_id', modelId)
    .eq('fk_owner_id', ownerId)
    .eq('tool_active', 'Y');

  const { data: ownerTools } = await supabase
    .from('tool')
    .select('tool_id')
    .eq('fk_owner_id', ownerId);

  const toolIds = (ownerTools || []).map((t: any) => t.tool_id);
  let componentsUsing: any[] = [];

  if (toolIds.length > 0) {
    const { data: comps } = await supabase
      .from('tool_component')
      .select('component_id, component_code, component_name, component_type, component_metadata')
      .in('fk_tool_id', toolIds)
      .eq('component_active', 'Y');

    componentsUsing = (comps || []).filter(
      (c: any) => c.component_metadata?.fk_tool_model_id == modelId,
    );
  }

  const systemCount = toolsUsing?.length || 0;
  const componentCount = componentsUsing.length;

  if (systemCount > 0 || componentCount > 0) {
    return {
      code: 0,
      message: `Cannot delete: model is used by ${systemCount} system(s) and ${componentCount} component(s). Please reassign them first.`,
      usedBy: {
        systems: (toolsUsing || []).map((t: any) => ({ id: t.tool_id, code: t.tool_code })),
        components: componentsUsing.map((c: any) => ({
          id: c.component_id,
          code: c.component_code || c.component_name || `#${c.component_id}`,
          type: c.component_type,
        })),
      },
    };
  }

  const { error } = await supabase
    .from('tool_model')
    .update({ model_active: 'N' })
    .eq('model_id', modelId);

  if (error) throw error;
  return { code: 1, message: 'Model deleted successfully' };
}


export async function deleteComponent(ownerId: number, componentId: number, force: boolean = false) {
  const { data: comp, error: compError } = await supabase
    .from('tool_component')
    .select('component_id, fk_tool_id, component_code, component_name, component_type, component_metadata')
    .eq('component_id', componentId)
    .single();

  if (compError || !comp) throw new Error('Component not found');

  const { data: tool } = await supabase
    .from('tool')
    .select('tool_id, tool_code')
    .eq('tool_id', comp.fk_tool_id)
    .eq('fk_owner_id', ownerId)
    .maybeSingle();

  if (!tool) throw new Error('Component not found or unauthorized');

  const isDetached = comp.component_metadata?.system_detached === true;

  if (!force && !isDetached) {
    return {
      code: 2,
      message: `Component is attached to system "${tool.tool_code}". Detach it from the system before deleting.`,
      system_code: tool.tool_code,
    };
  }

  const { error } = await supabase
    .from('tool_component')
    .update({ component_active: 'N' })
    .eq('component_id', componentId);

  if (error) throw error;
  return { code: 1, message: 'Component deleted successfully' };
}


export async function detachComponent(ownerId: number, componentId: number) {
  const { data: comp, error: compError } = await supabase
    .from('tool_component')
    .select('component_id, fk_tool_id, component_metadata')
    .eq('component_id', componentId)
    .single();

  if (compError || !comp) throw new Error('Component not found');

  const { data: tool } = await supabase
    .from('tool')
    .select('tool_id')
    .eq('tool_id', comp.fk_tool_id)
    .eq('fk_owner_id', ownerId)
    .maybeSingle();

  if (!tool) throw new Error('Component not found or unauthorized');

  const updatedMetadata = { ...(comp.component_metadata || {}), system_detached: true };

  const { error } = await supabase
    .from('tool_component')
    .update({ component_metadata: updatedMetadata })
    .eq('component_id', componentId);

  if (error) throw error;
  return { code: 1, message: 'Component detached from system successfully' };
}


export async function addModel(modelData: any) {
  const specsWithOwner = {
    ...(modelData.technical_specs || {}),
    fk_owner_id: modelData.fk_owner_id,
  };

  const { data, error } = await supabase
    .from('tool_model')
    .insert({
      model_code: modelData.factory_serie,
      model_name: modelData.factory_model,
      manufacturer: modelData.factory_type,
      model_description: modelData.factory_desc || null,
      specifications: specsWithOwner,
      model_active: 'Y',
    })
    .select()
    .single();

  if (error) throw error;
  return { code: 1, message: 'Model added successfully', data };
}


export async function updateModel(modelId: number, modelData: any) {
  const { data: existing } = await supabase
    .from('tool_model')
    .select('specifications')
    .eq('model_id', modelId)
    .single();

  const updatedSpecs = {
    ...(existing?.specifications || {}),
    ...(modelData.max_flight_time !== undefined ? { max_flight_time: modelData.max_flight_time } : {}),
    ...(modelData.max_speed !== undefined ? { max_speed: modelData.max_speed } : {}),
    ...(modelData.max_altitude !== undefined ? { max_altitude: modelData.max_altitude } : {}),
    ...(modelData.weight !== undefined ? { weight: modelData.weight } : {}),
    ...(modelData.notes !== undefined ? { notes: modelData.notes } : {}),
  };

  const { data, error } = await supabase
    .from('tool_model')
    .update({
      manufacturer: modelData.manufacturer,
      model_code: modelData.model_code,
      model_name: modelData.model_name,
      ...(modelData.model_type !== undefined ? { model_description: modelData.model_type } : {}),
      specifications: updatedSpecs,
    })
    .eq('model_id', modelId)
    .select()
    .single();

  if (error) throw error;
  return { code: 1, message: 'Model updated successfully', data };
}


export async function getComponentList(ownerId: number, toolId?: number) {
  
  if (toolId && toolId !== 0) {
    await refreshMaintenanceDaysForTool(toolId);
  } else {
    await refreshMaintenanceDaysForOwner(ownerId);
  }

  let toolQuery = supabase
    .from('tool')
    .select('tool_id')
    .eq('fk_owner_id', ownerId);

  if (toolId && toolId !== 0) {
    toolQuery = toolQuery.eq('tool_id', toolId);
  }

  const { data: ownerTools, error: toolError } = await toolQuery;
  if (toolError) throw toolError;

  const toolIds = (ownerTools || []).map((t) => t.tool_id);

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
    dcc_drone_id
  `;

  if (toolIds.length === 0) {
    return { code: 1, message: 'Success', dataRows: 0, data: [] };
  }

  const { data: rawData, error } = await supabase
    .from('tool_component')
    .select(selectFields)
    .in('fk_tool_id', toolIds)
    .eq('component_active', 'Y')
    .order('component_id', { ascending: false });

  if (error) throw error;

  const data = (toolId && toolId !== 0)
    ? (rawData || []).filter(item => item.component_metadata?.system_detached !== true)
    : (rawData || []);

  return {
    code: 1,
    message: 'Success',
    dataRows: data?.length || 0,
    data: (data || []).map((item) => ({
      tool_component_id: item.component_id,
      fk_tool_id: item.fk_tool_id,
      component_type: item.component_type,
      component_code: item.component_code,
      component_name: item.component_name,
      component_sn: item.serial_number,
      component_desc: item.component_description,
      component_status: item.component_metadata?.component_status || 'OPERATIONAL',
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
    })),
  };
}



export async function addComponent(componentData: any) {
  const normalizedSerial = typeof componentData.component_sn === 'string'
    ? componentData.component_sn.trim()
    : '';

  if (normalizedSerial) {
    const { data: duplicate, error: duplicateError } = await supabase
      .from('tool_component')
      .select('component_id')
      .ilike('serial_number', normalizedSerial)
      .limit(1)
      .maybeSingle();

    if (duplicateError) throw duplicateError;
    if (duplicate) {
      return { code: 0, message: `Component serial number "${normalizedSerial}" already exists.` };
    }
  }

  let maintenanceCycle: string | null = null;
  let maintenanceCycleHour: number | null = null;
  let maintenanceCycleDay: number | null = null;
  let maintenanceCycleFlight: number | null = null;

  if (componentData.fk_tool_model_id) {
    const { data: model } = await supabase
      .from('tool_model')
      .select('specifications')
      .eq('model_id', componentData.fk_tool_model_id)
      .single();

    if (model?.specifications?.notes) {
      const notes: string = model.specifications.notes;
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

  const { data, error } = await supabase
    .from('tool_component')
    .insert({
      fk_tool_id: componentData.fk_tool_id,
      component_name: componentData.component_code || componentData.component_type,
      component_type: componentData.component_type,
      component_code: componentData.component_code || componentData.component_type,
      component_description: componentData.component_desc || componentData.component_vendor || null,
      serial_number: normalizedSerial || null,
      installation_date: componentData.component_activation_date || null,
      component_active: 'Y',

      maintenance_cycle: finalCycle || null,
      maintenance_cycle_hour: finalHour ?? null,
      maintenance_cycle_day: finalDay ?? null,
      maintenance_cycle_flight: finalFlight ?? null,
      dcc_drone_id: componentData.dcc_drone_id || null,
      component_metadata: {
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
      },
    })
    .select()
    .single();

  if (error) throw error;
  return { code: 1, message: 'Component added successfully', data };
}


export async function updateComponent(componentId: number, componentData: any) {
  const normalizedSerial = typeof componentData.component_sn === 'string'
    ? componentData.component_sn.trim()
    : '';

  if (normalizedSerial) {
    const { data: duplicate, error: duplicateError } = await supabase
      .from('tool_component')
      .select('component_id')
      .ilike('serial_number', normalizedSerial)
      .neq('component_id', componentId)
      .limit(1)
      .maybeSingle();

    if (duplicateError) throw duplicateError;
    if (duplicate) {
      return { code: 0, message: `Component serial number "${normalizedSerial}" already exists.` };
    }
  }

  if (componentData.fk_tool_id) {
    await refreshMaintenanceDaysForTool(componentData.fk_tool_id);
  }

  const { data, error } = await supabase
    .from('tool_component')
    .update({
      fk_tool_id: componentData.fk_tool_id,
      component_type: componentData.component_type,
      component_code: componentData.component_code || null,
      component_description: componentData.component_desc || null,
      serial_number: normalizedSerial || null,
      installation_date: componentData.component_activation_date || null,
      dcc_drone_id: componentData.dcc_drone_id ?? null,
      maintenance_cycle: componentData.maintenance_cycle || null,
      maintenance_cycle_hour: componentData.maintenance_cycle_hour ?? null,
      maintenance_cycle_day: componentData.maintenance_cycle_day ?? null,
      maintenance_cycle_flight: componentData.maintenance_cycle_flight ?? null,
      component_metadata: {
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
      },
    })
    .eq('component_id', componentId)
    .select()
    .single();

  if (error) throw error;
  return { code: 1, message: 'Component updated successfully', data };
}


export async function getMaintenanceDashboard(
  ownerId: number,
  clientId?: number,
  thresholdAlert: number = 80
) {
  
  await refreshMaintenanceDaysForOwner(ownerId);

  const { data: tools, error } = await supabase
    .from('tool')
    .select(`
        tool_id, tool_code, tool_name, tool_metadata,
        tool_component (
          component_id, component_name, component_type,
          current_usage_hours, expected_lifespan_hours
        )
      `)
    .eq('fk_owner_id', ownerId)
    .eq('tool_active', 'Y');

  if (error) throw error;

  let filtered = tools || [];
  if (clientId && clientId !== 0) {
    filtered = filtered.filter((t) => t.tool_metadata?.clientId === clientId);
  }

  const maintenanceNeeded = filtered.filter((tool) => {
    const components: any[] = tool.tool_component || [];
    return components.some((comp) => {
      if (!comp.expected_lifespan_hours || comp.expected_lifespan_hours === 0) return false;
      return (comp.current_usage_hours / comp.expected_lifespan_hours) * 100 >= thresholdAlert;
    });
  });

  return { code: 1, message: 'Success', dataRows: maintenanceNeeded.length, data: maintenanceNeeded };
}
