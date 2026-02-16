import { supabase } from '@/backend/database/database';

export async function getToolList(
    ownerId: number,
    clientId?: number,
    active: string = 'ALL',
    status: string = 'ALL'
) {
    let query = supabase
        .from('tool')
        .select(`
            *,
            tool_model(model_code, model_name, manufacturer),
            tool_status(status_code, status_name)
        `)
        .eq('fk_owner_id', ownerId);

    if (clientId && clientId !== 0) {
        query = query.eq('fk_client_id', clientId);
    }

    if (active !== 'ALL') {
        query = query.eq('tool_active', active);
    }

    const { data, error } = await query.order('tool_id', { ascending: false });

    if (error) throw error;

    const clientIds = [...new Set(data?.map(t => t.fk_client_id).filter(Boolean))];
    let clientMap: Record<number, string> = {};

    if (clientIds.length > 0) {
        const { data: clients } = await supabase
            .from('client')
            .select('client_id, client_name')
            .in('client_id', clientIds);

        clientMap = clients?.reduce((acc, c) => {
            acc[c.client_id] = c.client_name;
            return acc;
        }, {} as Record<number, string>) || {};
    }

    const toolIds = data?.map(t => t.tool_id) || [];
    let missionData: any = {};

    if (toolIds.length > 0) {
        const { data: missions } = await supabase
            .from('pilot_mission')
            .select('fk_tool_id, flight_duration, distance_flown')
            .in('fk_tool_id', toolIds);

        missions?.forEach(m => {
            if (!missionData[m.fk_tool_id]) {
                missionData[m.fk_tool_id] = { count: 0, time: 0, distance: 0 };
            }
            missionData[m.fk_tool_id].count++;
            missionData[m.fk_tool_id].time += m.flight_duration || 0;
            missionData[m.fk_tool_id].distance += m.distance_flown || 0;
        });
    }

    return {
        code: 1,
        message: 'Success',
        dataRows: data?.length || 0,
        data: data?.map(item => {
            const toolModel = Array.isArray(item.tool_model) ? item.tool_model[0] : item.tool_model;
            const toolStatus = Array.isArray(item.tool_status) ? item.tool_status[0] : item.tool_status;

            return {
                tool_id: item.tool_id,
                fk_owner_id: item.fk_owner_id,
                fk_client_id: item.fk_client_id,
                fk_tool_model_id: item.fk_model_id,
                tool_code: item.tool_code,
                tool_serialnumber: item.tool_serial_number,
                tool_desc: item.tool_description,
                tool_status: (toolStatus as any)?.status_code || 'OPERATIONAL',
                active: item.tool_active,
                date_activation: item.purchase_date,
                client_name: clientMap[item.fk_client_id] || '',
                factory_type: (toolModel as any)?.manufacturer || '',
                factory_serie: (toolModel as any)?.model_code || '',
                factory_model: (toolModel as any)?.model_name || '',
                tool_ccPlatform: item.tool_metadata?.ccPlatform || '',
                tool_latitude: item.tool_metadata?.latitude,
                tool_longitude: item.tool_metadata?.longitude,
                tool_streaming_type: item.tool_metadata?.streamingType || '',
                tool_streaming_url: item.tool_metadata?.streamingUrl || '',
                tool_gcs_type: item.tool_metadata?.gcsType || '',
                tool_vendor: item.tool_metadata?.vendor || '',
                tool_guarantee_day: item.tool_metadata?.guaranteeDays,
                tool_purchase_date: item.purchase_date,
                tot_mission: missionData[item.tool_id]?.count || 0,
                tot_flown_time: missionData[item.tool_id]?.time || 0,
                tot_flown_meter: missionData[item.tool_id]?.distance || 0,
                tool_maintenance_logbook: item.tool_metadata?.maintenanceLogbook || 'N',
                button_show: `<button onclick="tool_modal_show_start(${item.fk_owner_id}, ${item.tool_id})" class="btn btn-sm btn-primary">View</button>`,
                button_status_update: `<button onclick="tool_modal_status_update_start(${item.fk_owner_id}, ${item.tool_id})" class="btn btn-sm btn-warning">Status</button>`,
                button_delete: `<button onclick="delete_drone_tool(${item.fk_owner_id}, ${item.tool_id})" class="btn btn-sm btn-danger">Delete</button>`,
            };
        }) || []
    };
}

export async function addTool(toolData: any) {
    const { data: existing } = await supabase
        .from('tool')
        .select('tool_id')
        .eq('fk_owner_id', toolData.fk_owner_id)
        .eq('tool_code', toolData.tool_code)
        .single();

    if (existing) throw new Error('Tool code already exists for this owner');

    const { data, error } = await supabase
        .from('tool')
        .insert({
            fk_owner_id: toolData.fk_owner_id,
            fk_tool_type_id: toolData.fk_tool_type_id || 1,
            fk_model_id: toolData.fk_model_id || null,
            fk_status_id: toolData.fk_status_id || 1,
            fk_client_id: toolData.fk_client_id || null,
            assigned_client_id: toolData.assigned_client_id || null,
            tool_code: toolData.tool_code,
            tool_serial_number: toolData.tool_serial_number,
            tool_name: toolData.tool_name || toolData.tool_code,
            tool_description: toolData.tool_description || null,
            purchase_date: toolData.purchase_date || null,
            purchase_price: toolData.purchase_price || null,
            warranty_expiry: toolData.warranty_expiry || null,
            last_calibration_date: toolData.last_calibration_date || null,
            next_calibration_date: toolData.next_calibration_date || null,
            location: toolData.location || null,
            tool_active: toolData.tool_active || 'Y',
            tool_metadata: {
                ccPlatform: toolData.ccPlatform || null,
                streamingType: toolData.streamingType || null,
                streamingUrl: toolData.streamingUrl || null,
                gcsType: toolData.gcsType || null,
                vendor: toolData.vendor || null,
                latitude: toolData.latitude || null,
                longitude: toolData.longitude || null,
                guaranteeDays: toolData.guaranteeDays || null,
                activationDate: toolData.activationDate || null,
            }
        })
        .select()
        .single();

    if (error) throw error;
    return { code: 1, message: 'Tool added successfully', data };
}

export async function updateTool(toolId: number, toolData: any) {
    const { data, error } = await supabase
        .from('tool')
        .update({
            fk_client_id: toolData.fk_client_id,
            fk_model_id: toolData.fk_tool_model_id,
            tool_code: toolData.tool_code,
            tool_serial_number: toolData.tool_serialnumber,
            tool_description: toolData.tool_desc,
            purchase_date: toolData.tool_purchase_date,
            tool_active: toolData.tool_active,
            tool_metadata: {
                ccPlatform: toolData.tool_ccPlatform,
                latitude: toolData.tool_latitude,
                longitude: toolData.tool_longitude,
                streamingType: toolData.tool_streaming_type,
                streamingUrl: toolData.tool_streaming_url,
                gcsType: toolData.tool_gcs_type,
                vendor: toolData.tool_vendor,
                guaranteeDays: toolData.tool_guarantee_day,
                status: toolData.tool_status,
                maintenanceLogbook: toolData.tool_maintenance_logbook,
            }
        })
        .eq('tool_id', toolId)
        .select()
        .single();

    if (error) throw error;

    return {
        code: 1,
        message: 'Tool updated successfully',
        data
    };
}

export async function deleteTool(ownerId: number, toolId: number) {
    const { error } = await supabase
        .from('tool')
        .update({ tool_active: 'N' })
        .eq('tool_id', toolId)
        .eq('fk_owner_id', ownerId);

    if (error) throw error;

    return {
        code: 1,
        message: 'Tool deleted successfully'
    };
}

export async function updateToolStatus(toolId: number, statusData: any) {
    const { data, error } = await supabase
        .from('tool')
        .update({
            tool_metadata: {
                ...statusData.current_metadata,
                status: statusData.tool_status_to,
            }
        })
        .eq('tool_id', toolId)
        .select()
        .single();

    if (error) throw error;

    return {
        code: 1,
        message: 'Tool status updated successfully',
        data
    };
}

export async function getModelList(ownerId: number, clientId?: number) {
    const { data, error } = await supabase
        .from('tool_model')
        .select('*')
        .eq('model_active', 'Y')
        .order('model_id', { ascending: false });

    if (error) throw error;

    return {
        code: 1,
        message: 'Success',
        dataRows: data?.length || 0,
        data: data?.map(item => ({
            tool_model_id: item.model_id,
            factory_type: item.manufacturer,
            factory_name: item.manufacturer,
            factory_serie: item.model_code,
            factory_model: item.model_name,
        })) || []
    };
}

export async function addModel(modelData: any) {
    const { data, error } = await supabase
        .from('tool_model')
        .insert({
            fk_tool_type_id: modelData.fk_tool_type_id || 1,
            model_code: modelData.factory_serie,
            model_name: modelData.factory_model,
            manufacturer: modelData.factory_type,
            model_description: modelData.factory_desc,
            model_active: 'Y'
        })
        .select()
        .single();

    if (error) throw error;

    return {
        code: 1,
        message: 'Model added successfully',
        data
    };
}

export async function getComponentList(ownerId: number, toolId?: number) {
    let query = supabase
        .from('tool_component')
        .select(`
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
      current_usage_hours
    `)
        .eq('component_active', 'Y');

    if (toolId && toolId !== 0) {
        query = query.eq('fk_tool_id', toolId);
    }

    const { data, error } = await query.order('component_id', { ascending: false });

    if (error) throw error;

    return {
        code: 1,
        message: 'Success',
        dataRows: data?.length || 0,
        data: data?.map(item => ({
            tool_component_id: item.component_id,
            fk_tool_id: item.fk_tool_id,
            component_type: item.component_type,
            component_sn: item.serial_number,
            component_status: 'OPERATIONAL',
            component_activation_date: item.installation_date,
            component_purchase_date: item.installation_date,
            component_vendor: '',
            component_guarantee_day: 0,
            component_cycles: item.current_usage_hours,
            component_total_cycles: item.expected_lifespan_hours,
            factory_serie: item.component_code,
            factory_model: item.component_name,
            button_show: `<button onclick="tool_component_modal_show_start(${ownerId}, ${item.component_id})" class="btn btn-sm btn-primary">View</button>`,
            button_delete: `<button class="btn btn-sm btn-danger">Delete</button>`,
        })) || []
    };
}

export async function addComponent(componentData: any) {
    const { data, error } = await supabase
        .from('tool_component')
        .insert({
            fk_tool_id: componentData.fk_tool_id,
            component_type: componentData.component_type,
            component_name: componentData.component_type,  
            serial_number: componentData.component_sn,
            installation_date: componentData.component_activation_date,
            component_active: 'Y',
            component_metadata: {
                fk_tool_model_id: componentData.fk_tool_model_id,
                purchase_date: componentData.component_purchase_date,
                vendor: componentData.component_vendor,
                guarantee_days: componentData.component_guarantee_day,
                status: componentData.component_status,
                fk_client_id: componentData.fk_client_id,
            }
        })
        .select()
        .single();

    if (error) throw error;

    return {
        code: 1,
        message: 'Component added successfully',
        data
    };
}

export async function updateComponent(componentId: number, componentData: any) {
    const { data, error } = await supabase
        .from('tool_component')
        .update({
            fk_tool_id: componentData.fk_tool_id,
            component_type: componentData.component_type,
            serial_number: componentData.component_sn,
            installation_date: componentData.component_activation_date,
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
            fk_tool_id: componentData.fk_tool_id
        }
    };
}


export async function createMaintenanceLogbook(toolId: number, activationDate: string, componentId?: number) {
    // This would create maintenance schedule entries based on activation date

    if (componentId) {
        // Updating component maintenance flag
        const { error: compError } = await supabase
            .from('tool_component')
            .update({
                component_active: 'Y'
            })
            .eq('component_id', componentId);

        if (compError) throw compError;
    } else {
        // Update tool maintenance flag
        const { data: tool } = await supabase
            .from('tool')
            .select('tool_metadata')
            .eq('tool_id', toolId)
            .single();

        const { error: toolError } = await supabase
            .from('tool')
            .update({
                tool_metadata: {
                    ...tool?.tool_metadata,
                    maintenanceLogbook: 'Y'
                }
            })
            .eq('tool_id', toolId);

        if (toolError) throw toolError;
    }

    return {
        code: 1,
        message: 'Maintenance logbook created successfully',
        dataRows: 1
    };
}

export async function getMaintenanceDashboard(ownerId: number, clientId?: number, thresholdAlert: number = 80) {
    // tools with high usage/maintenance needs
    const { data: tools } = await supabase
        .from('tool')
        .select(`
      tool_id,
      tool_code,
      tool_name,
      tool_metadata,
      tool_component (
        component_id,
        current_usage_hours,
        expected_lifespan_hours
      )
    `)
        .eq('fk_owner_id', ownerId)
        .eq('tool_active', 'Y');

    const maintenanceNeeded = tools?.filter(tool => {
        const components = tool.tool_component || [];
        return components.some((comp: any) => {
            const usage = (comp.current_usage_hours / comp.expected_lifespan_hours) * 100;
            return usage >= thresholdAlert;
        });
    });

    return {
        code: 1,
        message: 'Success',
        dataRows: maintenanceNeeded?.length || 0,
        data: maintenanceNeeded
    };
}


export async function getToolTypeList(active: string = 'ALL') {
    let query = supabase
        .from('tool_type')
        .select('*')
        .order('tool_type_id', { ascending: true });

    if (active !== 'ALL') {
        query = query.eq('tool_type_active', active);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
        code: 1,
        message: 'Success',
        dataRows: data?.length || 0,
        data: data?.map(item => ({
            tool_type_id: item.tool_type_id,
            tool_type_code: item.tool_type_code,
            tool_type_name: item.tool_type_name,
            tool_type_description: item.tool_type_description,
            tool_type_category: item.tool_type_category,
            tool_type_active: item.tool_type_active,
            created_at: item.created_at,
        })) || []
    };
}

export async function addToolType(toolTypeData: any) {
    if (toolTypeData.tool_type_code) {
        const { data: existing } = await supabase
            .from('tool_type')
            .select('tool_type_id')
            .eq('tool_type_code', toolTypeData.tool_type_code)
            .single();

        if (existing) {
            throw new Error('Tool type code already exists');
        }
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

    return {
        code: 1,
        message: 'Tool type added successfully',
        data
    };
}