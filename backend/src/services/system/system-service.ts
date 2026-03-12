import { supabase } from '@/backend/database/database';
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

  if (toolIds.length > 0) {
    const { data: missions } = await supabase
      .from('pilot_mission')
      .select('fk_tool_id, flight_duration, distance_flown')
      .in('fk_tool_id', toolIds);

    (missions || []).forEach((m) => {
      if (!missionData[m.fk_tool_id]) {
        missionData[m.fk_tool_id] = { count: 0, time: 0, distance: 0 };
      }
      missionData[m.fk_tool_id].count++;
      missionData[m.fk_tool_id].time += m.flight_duration || 0;
      missionData[m.fk_tool_id].distance += m.distance_flown || 0;
    });
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
          tool_status: item.tool_metadata?.status || 'OPERATIONAL',
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

  if (existing) throw new Error('Tool code already exists for this owner');

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
      fk_tool_type_id: 1,
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
  return { code: 1, message: 'Tool added successfully', data };
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
  return { code: 1, message: 'Tool updated successfully', data };
}


export async function deleteSystem(ownerId: number, toolId: number) {
  const { error } = await supabase
    .from('tool')
    .update({ tool_active: 'N' })
    .eq('tool_id', toolId)
    .eq('fk_owner_id', ownerId);

  if (error) throw error;
  return { code: 1, message: 'Tool deleted successfully' };
}


export async function getModelList(ownerId: number) {
  const { data, error } = await supabase
    .from('tool_model')
    .select('model_id, model_code, model_name, manufacturer, fk_tool_type_id, specifications, model_description')
    .eq('model_active', 'Y')
    .eq('specifications->>fk_owner_id', String(ownerId))
    .order('model_id', { ascending: false });

  if (error) throw error;

  return {
    code: 1,
    message: 'Success',
    dataRows: data?.length || 0,
    data: (data || []).map((item) => ({
      tool_model_id: item.model_id,
      factory_type: item.manufacturer,
      factory_name: item.manufacturer,
      factory_serie: item.model_code,
      factory_model: item.model_name,
      model_type: item.model_description || '',
      specifications: item.specifications,
    })),
  };
}


export async function deleteModel(ownerId: number, modelId: number) {
  // Check if any active tool (system) uses this model directly
  const { data: toolsUsing } = await supabase
    .from('tool')
    .select('tool_id, tool_code')
    .eq('fk_model_id', modelId)
    .eq('fk_owner_id', ownerId)
    .eq('tool_active', 'Y');

  // Check if any component metadata references this model
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

  // Verify ownership via the attached tool
  const { data: tool } = await supabase
    .from('tool')
    .select('tool_id, tool_code')
    .eq('tool_id', comp.fk_tool_id)
    .eq('fk_owner_id', ownerId)
    .maybeSingle();

  if (!tool) throw new Error('Component not found or unauthorized');

  // If already logically detached from system, allow deletion without warning
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
      fk_tool_type_id: modelData.fk_tool_type_id || 1,
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
  const { data, error } = await supabase
    .from('tool_model')
    .update({
      manufacturer: modelData.manufacturer,
      model_code: modelData.model_code,
      model_name: modelData.model_name,
      ...(modelData.model_type ? { model_description: modelData.model_type } : {}),
    })
    .eq('model_id', modelId)
    .select()
    .single();

  if (error) throw error;
  return { code: 1, message: 'Model updated successfully', data };
}


export async function getComponentList(ownerId: number, toolId?: number) {
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
    expected_lifespan_hours,
    current_usage_hours,
    last_replacement_date,
    next_replacement_date,
    component_metadata
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
      component_activation_date: item.installation_date,
      component_purchase_date: item.component_metadata?.component_purchase_date || null,
      component_vendor: item.component_metadata?.component_vendor || '',
      component_guarantee_day: item.component_metadata?.component_guarantee_day || 0,
      fk_client_id: item.component_metadata?.fk_client_id || null,
      fk_tool_model_id: item.component_metadata?.fk_tool_model_id || null,
      cc_platform: item.component_metadata?.cc_platform || '',
      gcs_type: item.component_metadata?.gcs_type || '',
      component_cycles: item.current_usage_hours,
      component_total_cycles: item.expected_lifespan_hours,
      last_replacement_date: item.last_replacement_date,
      next_replacement_date: item.next_replacement_date,
      factory_serie: item.component_code,
      factory_model: item.component_name,
    })),
  };
}


export async function addComponent(componentData: any) {
  const { data, error } = await supabase
    .from('tool_component')
    .insert({
      fk_tool_id: componentData.fk_tool_id,
      component_name: componentData.component_code || componentData.component_type,
      component_type: componentData.component_type,
      component_code: componentData.component_code || null,
      component_description: componentData.component_desc || componentData.component_vendor || null,
      serial_number: componentData.component_sn || null,
      installation_date: componentData.component_activation_date || null,
      expected_lifespan_hours: componentData.component_total_cycles || null,
      current_usage_hours: componentData.component_cycles || 0,
      component_active: 'Y',
      component_metadata: {
        cc_platform: componentData.cc_platform || null,
        gcs_type: componentData.gcs_type || null,
        component_status: componentData.component_status || 'OPERATIONAL',
        fk_client_id: componentData.fk_client_id || null,
        fk_tool_model_id: componentData.fk_tool_model_id || null,
        component_purchase_date: componentData.component_purchase_date || null,
        component_guarantee_day: componentData.component_guarantee_day || null,
        component_vendor: componentData.component_vendor || null,
      },
    })
    .select()
    .single();

  if (error) throw error;
  return { code: 1, message: 'Component added successfully', data };
}


export async function updateComponent(componentId: number, componentData: any) {
  // Fetch existing metadata to preserve system_detached flag and other fields
  const { data: existing } = await supabase
    .from('tool_component')
    .select('component_metadata')
    .eq('component_id', componentId)
    .single();

  const existingMeta = existing?.component_metadata || {};

  const { data, error } = await supabase
    .from('tool_component')
    .update({
      fk_tool_id: componentData.fk_tool_id,
      component_name: componentData.component_name || componentData.component_type,
      component_type: componentData.component_type,
      component_code: componentData.component_code || null,
      component_description: componentData.component_desc || null,
      serial_number: componentData.component_sn || null,
      installation_date: componentData.component_activation_date || null,
      expected_lifespan_hours: componentData.component_total_cycles || null,
      current_usage_hours: componentData.component_cycles || 0,
      component_metadata: {
        ...existingMeta,
        cc_platform: componentData.cc_platform || null,
        gcs_type: componentData.gcs_type || null,
        component_status: componentData.component_status || 'OPERATIONAL',
        fk_client_id: componentData.fk_client_id || null,
        fk_tool_model_id: componentData.fk_tool_model_id || null,
        component_purchase_date: componentData.component_purchase_date || null,
        component_guarantee_day: componentData.component_guarantee_day || null,
        component_vendor: componentData.component_vendor || null,
      },
    })
    .eq('component_id', componentId)
    .select()
    .single();

  if (error) throw error;

  return {
    code: 1,
    message: 'Component updated successfully',
    data,
    param: {
      fk_owner_id: componentData.fk_owner_id,
      fk_tool_id: componentData.fk_tool_id,
    },
  };
}


export async function getMaintenanceDashboard(
  ownerId: number,
  clientId?: number,
  thresholdAlert: number = 80
) {
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


export async function getToolTypeList(active: string = 'ALL') {
  let query = supabase.from('tool_type').select('*').order('tool_type_id', { ascending: true });

  if (active !== 'ALL') query = query.eq('tool_type_active', active);

  const { data, error } = await query;
  if (error) throw error;

  return {
    code: 1,
    message: 'Success',
    dataRows: data?.length || 0,
    data: (data || []).map((item) => ({
      tool_type_id: item.tool_type_id,
      tool_type_code: item.tool_type_code,
      tool_type_name: item.tool_type_name,
      tool_type_description: item.tool_type_description,
      tool_type_category: item.tool_type_category,
      tool_type_active: item.tool_type_active,
      created_at: item.created_at,
    })),
  };
}


export async function addToolType(toolTypeData: any) {
  if (toolTypeData.tool_type_code) {
    const { data: existing } = await supabase
      .from('tool_type')
      .select('tool_type_id')
      .eq('tool_type_code', toolTypeData.tool_type_code)
      .maybeSingle();

    if (existing) throw new Error('Tool type code already exists');
  }

  const { data, error } = await supabase
    .from('tool_type')
    .insert({
      tool_type_code: toolTypeData.tool_type_code,
      tool_type_name: toolTypeData.tool_type_name,
      tool_type_description: toolTypeData.tool_type_description,
      tool_type_category: toolTypeData.tool_type_category,
      tool_type_active: toolTypeData.tool_type_active || 'Y',
    })
    .select()
    .single();

  if (error) throw error;
  return { code: 1, message: 'Tool type added successfully', data };
}