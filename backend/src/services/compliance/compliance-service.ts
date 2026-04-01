import { supabase } from '@/backend/database/database';

type ComplianceStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';

interface ComplianceRequirement {
  requirement_id: number;
  fk_owner_id: number;
  requirement_code: string;
  requirement_title: string;
  requirement_description: string | null;
  requirement_type: string | null;
  regulatory_body: string | null;
  requirement_status: string;
  effective_date: string | null;
  review_frequency: number | null;
  next_review_date: string | null;
  created_at: string;
  updated_at: string;
}

interface ComplianceRequirementListParams {
  owner_id: number;
  requirement_type?: string;
  requirement_status?: string;
  q?: string;
  page?: number;
  limit?: number;
}

interface ComplianceRequirementListResult {
  data: ComplianceRequirement[];
  total: number;
  page: number;
  limit: number;
}

interface CreateComplianceRequirementParams {
  owner_id: number;
  requirement_code: string;
  requirement_title: string;
  requirement_type?: string | null;
  regulatory_body?: string | null;
  requirement_status: ComplianceStatus;
  review_frequency?: number | null;
  next_review_date?: string | null;
  requirement_description?: string | null;
}

interface UpdateComplianceRequirementParams {
  requirement_id: number;
  owner_id: number;
  requirement_code?: string;
  requirement_title?: string;
  requirement_type?: string | null;
  regulatory_body?: string | null;
  requirement_status?: ComplianceStatus;
  review_frequency?: number | null;
  next_review_date?: string | null;
  requirement_description?: string | null;
}


/**
 * Fetch a paginated, filtered list of compliance requirements for an owner.
 */
export async function getComplianceRequirements(
  params: ComplianceRequirementListParams
): Promise<ComplianceRequirementListResult> {
  const { owner_id, requirement_type, requirement_status, q, page = 1, limit = 20 } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('compliance_requirement')
    .select('*', { count: 'exact' })
    .eq('fk_owner_id', owner_id)
    .order('requirement_code', { ascending: true })
    .range(from, to);

  if (requirement_type) query = query.eq('requirement_type', requirement_type);
  if (requirement_status) query = query.eq('requirement_status', requirement_status);
  if (q) {
    query = query.or(
      `requirement_code.ilike.%${q}%,requirement_title.ilike.%${q}%,requirement_type.ilike.%${q}%,regulatory_body.ilike.%${q}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: (data ?? []) as ComplianceRequirement[],
    total: count ?? 0,
    page,
    limit,
  };
}

/**
 * Fetch a single compliance requirement by ID.
 */
export async function getComplianceRequirementById(
  requirementId: number,
  ownerId: number
): Promise<ComplianceRequirement | null> {
  const { data, error } = await supabase
    .from('compliance_requirement')
    .select('*')
    .eq('requirement_id', requirementId)
    .eq('fk_owner_id', ownerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data as ComplianceRequirement;
}

/**
 * Create a new compliance requirement.
 */
export async function createComplianceRequirement(
  params: CreateComplianceRequirementParams
): Promise<ComplianceRequirement> {
  const { data, error } = await supabase
    .from('compliance_requirement')
    .insert({
      fk_owner_id: params.owner_id,
      requirement_code: params.requirement_code,
      requirement_title: params.requirement_title,
      requirement_type: params.requirement_type ?? null,
      regulatory_body: params.regulatory_body ?? null,
      requirement_status: params.requirement_status,
      review_frequency: params.review_frequency ?? null,
      next_review_date: params.next_review_date ?? null,
      requirement_description: params.requirement_description ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ComplianceRequirement;
}

/**
 * Update an existing compliance requirement.
 */
export async function updateComplianceRequirement(
  params: UpdateComplianceRequirementParams
): Promise<ComplianceRequirement> {
  const { requirement_id, owner_id, ...fields } = params;

  const updatePayload: Record<string, unknown> = {};
  if (fields.requirement_code !== undefined) updatePayload.requirement_code = fields.requirement_code;
  if (fields.requirement_title !== undefined) updatePayload.requirement_title = fields.requirement_title;
  if (fields.requirement_type !== undefined) updatePayload.requirement_type = fields.requirement_type;
  if (fields.regulatory_body !== undefined) updatePayload.regulatory_body = fields.regulatory_body;
  if (fields.requirement_status !== undefined) updatePayload.requirement_status = fields.requirement_status;
  if (fields.review_frequency !== undefined) updatePayload.review_frequency = fields.review_frequency;
  if (fields.next_review_date !== undefined) updatePayload.next_review_date = fields.next_review_date;
  if (fields.requirement_description !== undefined) updatePayload.requirement_description = fields.requirement_description;

  const { data, error } = await supabase
    .from('compliance_requirement')
    .update(updatePayload)
    .eq('requirement_id', requirement_id)
    .eq('fk_owner_id', owner_id)
    .select()
    .single();

  if (error) throw error;
  return data as ComplianceRequirement;
}

/**
 * Delete a compliance requirement.
 */
export async function deleteComplianceRequirement(
  requirementId: number,
  ownerId: number
): Promise<void> {
  const { error } = await supabase
    .from('compliance_requirement')
    .delete()
    .eq('requirement_id', requirementId)
    .eq('fk_owner_id', ownerId);

  if (error) throw error;
}

/**
 * Aggregate counts by status for the owner — used for stats cards.
 */
export async function getComplianceStats(ownerId: number): Promise<{
  total: number;
  compliant: number;
  partial: number;
  non_compliant: number;
  not_applicable: number;
}> {
  const { data, error } = await supabase
    .from('compliance_requirement')
    .select('requirement_status')
    .eq('fk_owner_id', ownerId);

  if (error) throw error;

  const rows = (data ?? []) as { requirement_status: string }[];
  return {
    total: rows.length,
    compliant: rows.filter((r) => r.requirement_status === 'COMPLIANT').length,
    partial: rows.filter((r) => r.requirement_status === 'PARTIAL').length,
    non_compliant: rows.filter((r) => r.requirement_status === 'NON_COMPLIANT').length,
    not_applicable: rows.filter((r) => r.requirement_status === 'NOT_APPLICABLE').length,
  };
}
