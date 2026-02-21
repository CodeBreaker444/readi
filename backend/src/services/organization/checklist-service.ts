import { supabase } from '@/backend/database/database';
import type { Checklist, ChecklistCreatePayload, ChecklistUpdatePayload } from '@/config/types/checklist';


export async function getChecklistsByOwner(
    ownerId: number
): Promise<{ code: number; message: string; dataRows: number; data: Checklist[] }> {
    const { data, error, count } = await supabase
        .from('checklist')
        .select('*', { count: 'exact' })
        .eq('fk_owner_id', ownerId)
        .order('checklist_id', { ascending: false })

    if (error) {
        return {
            code: 0,
            message: error.message,
            dataRows: 0,
            data: [],
        }
    }

    return {
        code: 1,
        message: 'Checklists retrieved successfully',
        dataRows: count ?? data?.length ?? 0,
        data: data ?? [],
    }
}


export async function getChecklistByCode(
    ownerId: number,
    checklistCode: string
): Promise<{ dataRows: number; data: Checklist | null }> {
    const { data, error } = await supabase
        .from('checklist')
        .select('*')
        .eq('fk_owner_id', ownerId)
        .eq('checklist_code', checklistCode)
        .eq('checklist_active', 'Y')
        .single()

    if (error) {
        throw new Error(`Failed to fetch check list by code: ${error.message}`);
    }

    return {
        dataRows: data ? 1 : 0,
        data: data,
    }
}


export async function getChecklistById(
    checklistId: number
): Promise<{ dataRows: number; data: Checklist | null }> {
    const { data, error } = await supabase
        .from('checklist')
        .select('*')
        .eq('checklist_id', checklistId)
        .single()

    if (error) {
        throw new Error(`Failed to fetch check list by ID: ${error.message}`);
    }

    return {
        dataRows: data ? 1 : 0,
        data: data,
    }
}


export async function createChecklist(
    payload: ChecklistCreatePayload
): Promise<{ code: number; dataRows: number; data: Checklist | null }> {
    let parsedJson: Record<string, unknown>
    try {
        parsedJson = JSON.parse(payload.checklist_json)
    } catch (error) {
        return {
            code: 0,
            dataRows: 0,
            data: null,
        }
    }

    const { data: existing } = await supabase
        .from('checklist')
        .select('checklist_id')
        .eq('fk_owner_id', payload.fk_owner_id)
        .eq('checklist_code', payload.checklist_code)
        .maybeSingle()

    if (existing) {
        return {    
            code: 0,
            dataRows: 0,
            data: null,
        }
    }

    const { data, error } = await supabase
        .from('checklist')
        .insert({
            fk_owner_id: payload.fk_owner_id,
            fk_user_id: payload.fk_user_id ?? null,
            checklist_code: payload.checklist_code.trim(),
            checklist_desc: payload.checklist_desc.trim(),
            checklist_ver: parseFloat(payload.checklist_ver) || 1.0,
            checklist_active: payload.checklist_active,
            checklist_json: parsedJson,
        })
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to create checklist: ${error.message}`);
    }

    return {
        code: 1,
        dataRows: 1,
        data: data,
    }
}


export async function updateChecklist(
    payload: ChecklistUpdatePayload
): Promise<{ dataRows: number; data: Checklist | null }> {

    let parsedJson: Record<string, unknown>
    try {
        parsedJson = JSON.parse(payload.checklist_json)
    } catch (error: any) {
        throw new Error(`Failed to parse JSON: ${error.message}`);
    }



    const { data, error } = await supabase
        .from('checklist')
        .update({
            checklist_code: payload.checklist_code.trim(),
            checklist_desc: payload.checklist_desc.trim(),
            checklist_ver: parseFloat(payload.checklist_ver) || 1.0,
            checklist_active: payload.checklist_active,
            checklist_json: parsedJson,
            fk_owner_id: payload.fk_owner_id,
            fk_user_id: payload.fk_user_id ?? null,
        })
        .eq('checklist_id', payload.checklist_id)
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to update checklist: ${error.message}`);
    }

    return {
        dataRows: 1,
        data: data,
    }
}


export async function deleteChecklist(
    ownerId: number,
    checklistId: number
): Promise<{ code: number; message: string; dataRows: number; data: null }> {
    const { data: existing } = await supabase
        .from('checklist')
        .select('checklist_active')
        .eq('checklist_id', checklistId)
        .eq('fk_owner_id', ownerId)
        .single()

    if (!existing) {
        throw new Error('Checklist not found or does not belong to the owner.');
    }

    if (existing.checklist_active === 'Y') {
        throw new Error('Cannot delete an active checklist. Please deactivate it first.');
    }

    const { error } = await supabase
        .from('checklist')
        .delete()
        .eq('checklist_id', checklistId)
        .eq('fk_owner_id', ownerId)

    if (error) {
        return {
            code: 0,
            message: error.message,
            dataRows: 0,
            data: null,
        }
    }

    return {
        code: 1,
        message: 'Checklist deleted successfully',
        dataRows: 1,
        data: null,
    }
}