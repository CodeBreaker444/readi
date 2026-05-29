import { supabase } from "@/backend/database/database";
import { LocationGroup, LocationGroupCreateInput } from "@/config/types/erp";

async function fetchGroup(groupId: number): Promise<LocationGroup | null> {
  const { data, error } = await supabase
    .from('erp_location_group')
    .select(`
      group_id, name, notes, is_active, fk_owner_id, created_at, updated_at,
      locations:erp_location_group_location(location_id, location_name, lat, lng),
      contacts:erp_location_group_contact(
        fk_erp_id,
        erp:emergency_response_plan!fk_erp_id(erp_id, contact, erp_type, description)
      )
    `)
    .eq('group_id', groupId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return mapRow(data)
}

function mapRow(g: any): LocationGroup {
  return {
    group_id: g.group_id,
    name: g.name,
    notes: g.notes ?? null,
    is_active: g.is_active,
    owner_id: g.fk_owner_id,
    locations: (g.locations ?? []).map((l: any) => ({
      location_id: l.location_id,
      name: l.location_name,
      lat: l.lat ?? null,
      lng: l.lng ?? null,
    })),
    contacts: (g.contacts ?? [])
      .filter((c: any) => c.erp)
      .map((c: any) => ({
        id: c.erp.erp_id,
        contact: c.erp.contact,
        type: c.erp.erp_type,
        description: c.erp.description,
      })),
    created_at: g.created_at,
    updated_at: g.updated_at,
  }
}

export async function listLocationGroups(ownerId: number): Promise<LocationGroup[]> {
  const { data, error } = await supabase
    .from('erp_location_group')
    .select(`
      group_id, name, notes, is_active, fk_owner_id, created_at, updated_at,
      locations:erp_location_group_location(location_id, location_name, lat, lng),
      contacts:erp_location_group_contact(
        fk_erp_id,
        erp:emergency_response_plan!fk_erp_id(erp_id, contact, erp_type, description)
      )
    `)
    .eq('fk_owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

export async function createLocationGroup(input: LocationGroupCreateInput, ownerId: number): Promise<LocationGroup> {
  const newErpIds: number[] = []
  for (const nc of input.new_contacts) {
    const { data, error } = await supabase
      .from('emergency_response_plan')
      .insert({ description: nc.description, contact: nc.contact, erp_type: nc.type, fk_owner_id: ownerId })
      .select('erp_id')
      .single()
    if (error) throw new Error(error.message)
    newErpIds.push(data.erp_id)
  }

  const allContactIds = [...input.existing_contact_ids, ...newErpIds]

  const { data: group, error: groupError } = await supabase
    .from('erp_location_group')
    .insert({ name: input.name, notes: input.notes ?? null, is_active: input.is_active, fk_owner_id: ownerId })
    .select('group_id')
    .single()
  if (groupError) throw new Error(groupError.message)

  if (input.locations.length > 0) {
    const { error: locError } = await supabase
      .from('erp_location_group_location')
      .insert(input.locations.map(l => ({
        fk_group_id: group.group_id,
        location_name: l.name,
        lat: l.lat ?? null,
        lng: l.lng ?? null,
      })))
    if (locError) throw new Error(locError.message)
  }

  if (allContactIds.length > 0) {
    const { error: contactError } = await supabase
      .from('erp_location_group_contact')
      .insert(allContactIds.map(id => ({ fk_group_id: group.group_id, fk_erp_id: id })))
    if (contactError) throw new Error(contactError.message)
  }

  const result = await fetchGroup(group.group_id)
  if (!result) throw new Error('Failed to fetch created group')
  return result
}

export async function updateLocationGroup(id: number, input: LocationGroupCreateInput, ownerId: number): Promise<LocationGroup> {
  const newErpIds: number[] = []
  for (const nc of input.new_contacts) {
    const { data, error } = await supabase
      .from('emergency_response_plan')
      .insert({ description: nc.description, contact: nc.contact, erp_type: nc.type, fk_owner_id: ownerId })
      .select('erp_id')
      .single()
    if (error) throw new Error(error.message)
    newErpIds.push(data.erp_id)
  }

  const allContactIds = [...input.existing_contact_ids, ...newErpIds]

  const { error: updateError } = await supabase
    .from('erp_location_group')
    .update({ name: input.name, notes: input.notes ?? null, is_active: input.is_active, updated_at: new Date().toISOString() })
    .eq('group_id', id)
    .eq('fk_owner_id', ownerId)
  if (updateError) throw new Error(updateError.message)

  await supabase.from('erp_location_group_location').delete().eq('fk_group_id', id)
  await supabase.from('erp_location_group_contact').delete().eq('fk_group_id', id)

  if (input.locations.length > 0) {
    const { error: locError } = await supabase
      .from('erp_location_group_location')
      .insert(input.locations.map(l => ({
        fk_group_id: id,
        location_name: l.name,
        lat: l.lat ?? null,
        lng: l.lng ?? null,
      })))
    if (locError) throw new Error(locError.message)
  }

  if (allContactIds.length > 0) {
    const { error: contactError } = await supabase
      .from('erp_location_group_contact')
      .insert(allContactIds.map(eid => ({ fk_group_id: id, fk_erp_id: eid })))
    if (contactError) throw new Error(contactError.message)
  }

  const result = await fetchGroup(id)
  if (!result) throw new Error('Failed to fetch updated group')
  return result
}

export async function deleteLocationGroup(id: number, ownerId: number): Promise<void> {
  const { error } = await supabase
    .from('erp_location_group')
    .delete()
    .eq('group_id', id)
    .eq('fk_owner_id', ownerId)
  if (error) throw new Error(error.message)
}
