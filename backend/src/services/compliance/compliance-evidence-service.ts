import { supabase } from '@/backend/database/database';

export type EvidenceType = 'DOC' | 'RECORD' | 'AUDIT' | 'LINK';

export interface ComplianceEvidence {
  evidence_id: number;
  fk_requirement_id: number;
  evidence_type: EvidenceType;
  evidence_description: string | null;
  file_path: string | null;
  notes: string | null;
  submitted_by_user_id: number | null;
  submitted_at: string;
  verified_by_user_id: number | null;
  verified_at: string | null;
  verification_status: string | null;
}

export interface CreateEvidenceParams {
  requirement_id: number;
  owner_id: number;
  evidence_type: EvidenceType;
  evidence_description?: string | null;
  file_path?: string | null;
  notes?: string | null;
  submitted_by_user_id?: number | null;
}

/**
 * List all evidence items for a given requirement.
 */
export async function listEvidenceByRequirement(
  requirementId: number,
  ownerId: number
): Promise<ComplianceEvidence[]> {
  const { data: req, error: reqError } = await supabase
    .from('compliance_requirement')
    .select('requirement_id')
    .eq('requirement_id', requirementId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (reqError || !req) throw new Error('Requirement not found or access denied');

  const { data, error } = await supabase
    .from('compliance_evidence')
    .select('*')
    .eq('fk_requirement_id', requirementId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ComplianceEvidence[];
}

/**
 * Add a new evidence item to a compliance requirement.
 */
export async function addEvidence(
  params: CreateEvidenceParams
): Promise<ComplianceEvidence> {
  const { data: req, error: reqError } = await supabase
    .from('compliance_requirement')
    .select('requirement_id')
    .eq('requirement_id', params.requirement_id)
    .eq('fk_owner_id', params.owner_id)
    .single();

  if (reqError || !req) throw new Error('Requirement not found or access denied');

  const { data, error } = await supabase
    .from('compliance_evidence')
    .insert({
      fk_requirement_id: params.requirement_id,
      evidence_type: params.evidence_type,
      evidence_description: params.evidence_description ?? null,
      file_path: params.file_path ?? null,
      notes: params.notes ?? null,
      submitted_by_user_id: params.submitted_by_user_id ?? null,
      verification_status: 'PENDING',
    })
    .select()
    .single();

  if (error) throw error;
  return data as ComplianceEvidence;
}

/**
 * Delete an evidence item.
 */
export async function deleteEvidence(
  evidenceId: number,
  ownerId: number
): Promise<void> {
  const { data: ev, error: evError } = await supabase
    .from('compliance_evidence')
    .select('evidence_id, fk_requirement_id')
    .eq('evidence_id', evidenceId)
    .single();

  if (evError || !ev) throw new Error('Evidence not found');

  const { data: req, error: reqError } = await supabase
    .from('compliance_requirement')
    .select('requirement_id')
    .eq('requirement_id', ev.fk_requirement_id)
    .eq('fk_owner_id', ownerId)
    .single();

  if (reqError || !req) throw new Error('Access denied');

  const { error } = await supabase
    .from('compliance_evidence')
    .delete()
    .eq('evidence_id', evidenceId);

  if (error) throw error;
}

/**
 * Update the status of a compliance requirement and record it in the status log.
 */
export async function updateRequirementStatus(params: {
  requirement_id: number;
  owner_id: number;
  new_status: string;
  changed_by_user_id: number;
  comment?: string | null;
}): Promise<void> {
  const { requirement_id, owner_id, new_status, changed_by_user_id, comment } = params;

  const { data: current, error: fetchError } = await supabase
    .from('compliance_requirement')
    .select('requirement_status')
    .eq('requirement_id', requirement_id)
    .eq('fk_owner_id', owner_id)
    .single();

  if (fetchError || !current) throw new Error('Requirement not found or access denied');

  const { error: updateError } = await supabase
    .from('compliance_requirement')
    .update({ requirement_status: new_status, updated_at: new Date().toISOString() })
    .eq('requirement_id', requirement_id)
    .eq('fk_owner_id', owner_id);

  if (updateError) throw updateError;

  await supabase.from('compliance_status_log').insert({
    fk_requirement_id: requirement_id,
    status_from: current.requirement_status,
    status_to: new_status,
    changed_by_user_id,
    change_reason: comment ?? null,
  });
}
