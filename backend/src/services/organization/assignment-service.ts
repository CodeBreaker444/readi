import { supabase } from "@/backend/database/database"

export interface Assignment {
  assignment_id: number
  fk_user_id: number
  fk_owner_id: number
  assignment_code: string | null
  assignment_desc: string | null
  assignment_json: Record<string, unknown> | null
  assignment_ver: number | null
  assignment_active: 'Y' | 'N'
  due_date: string | null
  completed_date: string | null
  created_at: string
  updated_at: string
}

export interface AssignmentUpdatePayload {
  assignment_id: number
  assignment_code: string
  assignment_desc: string
  assignment_ver: number
  assignment_active: 'Y' | 'N'
  assignment_json: string        
  fk_owner_id: number
  fk_user_id: number
}


 
export async function getAssignmentsByOwner(
  ownerId: number
): Promise < Assignment[]> {
  const { data, error } = await supabase
    .from('assignment')
    .select('*')
    .eq('fk_owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (error) 
  {
    throw new Error(`Failed to retrieve assignments: ${error.message}`);
  }
  return data as Assignment[] 
}

/**
 * GET: retrieve a single assignment by id + owner
 */
export async function getAssignmentById(
  ownerId: number,
  assignmentId: number
): Promise<Assignment | null> {
  const { data, error } = await supabase
    .from('assignment')
    .select('*')
    .eq('fk_owner_id', ownerId)
    .eq('assignment_id', assignmentId)
    .single()

  if (error)  throw new Error(`Failed to retrieve assignment: ${error.message}`);

  return data as Assignment 
}

 
export async function createAssignment(payload: {
  assignment_code: string
  assignment_desc: string
  assignment_ver: string
  assignment_active: 'Y' | 'N'
  assignment_json: string
  fk_owner_id: number
  fk_user_id: number
}): Promise<Assignment | null> {
  let parsedJson: unknown
  try {
    parsedJson = payload.assignment_json ? JSON.parse(payload.assignment_json) : null
  } catch (error) {
    throw new Error('Invalid JSON in assignment_json field')
  }

  const { data: existing } = await supabase
    .from('assignment')
    .select('assignment_id')
    .eq('fk_owner_id', payload.fk_owner_id)
    .eq('assignment_code', payload.assignment_code)
    .maybeSingle()

  if (existing) throw new Error(`Assignment code "${payload.assignment_code}" already exists`)

  const { data, error } = await supabase
    .from('assignment')
    .insert({
      fk_owner_id: payload.fk_owner_id,
      fk_user_id: payload.fk_user_id,
      assignment_code: payload.assignment_code,
      assignment_desc: payload.assignment_desc,
      assignment_ver: parseFloat(payload.assignment_ver) || 1.0,
      assignment_active: payload.assignment_active ?? 'Y',
      assignment_json: parsedJson,
    })
    .select()
    .single()

  if (error)  throw new Error(error.message)

  return data as Assignment
}

 
export async function updateAssignment(
  payload: AssignmentUpdatePayload
): Promise<Assignment | null> {
  let parsedJson: unknown
  try {
    parsedJson = payload.assignment_json ? JSON.parse(payload.assignment_json) : null
  } catch {
    throw new Error('Invalid JSON in assignment_json field')
  }

  const { data: existing } = await supabase
    .from('assignment')
    .select('assignment_id')
    .eq('assignment_id', payload.assignment_id)
    .eq('fk_owner_id', payload.fk_owner_id)
    .maybeSingle()

  if (!existing) throw new Error('Assignment not found or access denied')

  const { data, error } = await supabase
    .from('assignment')
    .update({
      assignment_code: payload.assignment_code,
      assignment_desc: payload.assignment_desc,
      assignment_ver: payload.assignment_ver,
      assignment_active: payload.assignment_active,
      assignment_json: parsedJson,
      fk_user_id: payload.fk_user_id,
    })
    .eq('assignment_id', payload.assignment_id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data as Assignment 
}

 
export async function deleteAssignment(
  ownerId: number,
  assignmentId: number
): Promise<{ code: number; message: string; dataRows: number; data: null }> {
  const { data: existing } = await supabase
    .from('assignment')
    .select('assignment_id, assignment_active')
    .eq('assignment_id', assignmentId)
    .eq('fk_owner_id', ownerId)
    .maybeSingle()

  if (!existing) throw new Error('Assignment not found')
  if (existing.assignment_active === 'Y') {
    throw new Error('Cannot delete an active assignment. Set it to inactive first.')
  }

  const { error } = await supabase
    .from('assignment')
    .delete()
    .eq('assignment_id', assignmentId)

  if (error) throw new Error(error.message)
  return { code: 1, message: 'Assignment deleted', dataRows: 0, data: null }
}