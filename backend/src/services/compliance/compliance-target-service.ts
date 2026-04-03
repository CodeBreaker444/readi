import { supabase } from '@/backend/database/database';

export type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SafetyTargetProposal {
  proposal_id: number;
  fk_definition_id: number;
  proposal_year: number | null;
  proposal_period: string | null;
  proposed_target: number | null;
  proposed_by_user_id: number | null;
  justification: string | null;
  proposal_status: ProposalStatus | null;
  approved_by_user_id: number | null;
  approved_at: string | null;
  created_at: string | null;
}

export interface EnrichedTargetProposal {
  proposal_id: number;
  fk_definition_id: number;
  indicator_area: string;
  indicator_name: string;
  indicator_type: string;
  target_current: number;
  target_suggested: number;
  diff: number;
  months_analyzed: number;
  status: ProposalStatus;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface CreateTargetProposalParams {
  fk_definition_id: number;
  proposal_year: number;
  proposal_period: string;
  proposed_target: number;
  proposed_by_user_id: number;
  justification?: string | null;
}

export interface ApproveTargetProposalParams {
  proposal_id: number;
  action: 'APPROVED' | 'REJECTED';
  approved_by_user_id: number;
  justification?: string | null;
}

/**
 * Generate (or refresh) target proposals for all active SPI/KPI definitions
 * by analysing the last N months of actual measurements.
 */
export async function generateTargetProposals(
  months: number,
  proposedByUserId: number
): Promise<{
  total_pending: number;
  months: number;
  data: EnrichedTargetProposal[];
}> {
  const { data: defs, error: defsError } = await supabase
    .from('spi_kpi_definition')
    .select('definition_id, target_value')
    .eq('is_active', true);

  if (defsError) throw defsError;

  const definitions = defs ?? [];

  const now = new Date();
  const proposalYear = now.getFullYear();
  const proposalPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  for (const def of definitions) {
    const { data: existing } = await supabase
      .from('spi_kpi_target_proposal')
      .select('proposal_id')
      .eq('fk_definition_id', def.definition_id)
      .eq('proposal_year', proposalYear)
      .eq('proposal_period', proposalPeriod)
      .eq('proposal_status', 'PENDING')
      .maybeSingle();

    if (existing) continue;

    const { data: measurements } = await supabase
      .from('spi_kpi_measurement')
      .select('actual_value')
      .eq('fk_definition_id', def.definition_id)
      .gte('measurement_date', cutoffDate);

    const values = (measurements ?? [])
      .map((m: { actual_value: unknown }) => Number(m.actual_value))
      .filter((v) => !isNaN(v));

    const suggested =
      values.length > 0
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10000) / 10000
        : def.target_value;

    await supabase.from('spi_kpi_target_proposal').insert({
      fk_definition_id: def.definition_id,
      proposal_year: proposalYear,
      proposal_period: proposalPeriod,
      proposed_target: suggested,
      proposed_by_user_id: proposedByUserId,
      justification: `Auto-generated from average of last ${months} month(s) of measurements.`,
      proposal_status: 'PENDING',
    });
  }

  const { data: proposals, error: listError } = await supabase
    .from('spi_kpi_target_proposal')
    .select('*')
    .order('created_at', { ascending: false });

  if (listError) throw listError;

  const rows = (proposals ?? []) as SafetyTargetProposal[];

  // Fetch all referenced definitions to enrich the proposals
  const defIds = [...new Set(rows.map((r) => r.fk_definition_id))];
  const { data: defRows } = defIds.length
    ? await supabase
        .from('spi_kpi_definition')
        .select('definition_id, kpi_name, kpi_category, kpi_type, target_value')
        .in('definition_id', defIds)
    : { data: [] };

  const defMap = new Map(
    (defRows ?? []).map((d: {
      definition_id: number;
      kpi_name: string;
      kpi_category: string;
      kpi_type: string;
      target_value: number;
    }) => [d.definition_id, d])
  );

  const enriched: EnrichedTargetProposal[] = rows.map((r) => {
    const def = defMap.get(r.fk_definition_id);
    const current = def?.target_value ?? 0;
    const suggested = r.proposed_target ?? 0;
    return {
      proposal_id: r.proposal_id,
      fk_definition_id: r.fk_definition_id,
      indicator_name: def?.kpi_name ?? '—',
      indicator_area: def?.kpi_category ?? '—',
      indicator_type: def?.kpi_type ?? '—',
      target_current: current,
      target_suggested: suggested,
      diff: Math.round((suggested - current) * 100) / 100,
      months_analyzed: months,
      status: r.proposal_status ?? 'PENDING',
      notes: r.justification,
      approved_by: r.approved_by_user_id ? String(r.approved_by_user_id) : null,
      approved_at: r.approved_at,
      created_at: r.created_at ?? '',
    };
  });

  const pending = enriched.filter((r) => r.status === 'PENDING').length;
  return { total_pending: pending, months, data: enriched };
}

/**
 * Manually create a single target proposal.
 */
export async function createTargetProposal(
  params: CreateTargetProposalParams
): Promise<SafetyTargetProposal> {
  const { data, error } = await supabase
    .from('spi_kpi_target_proposal')
    .insert({
      fk_definition_id: params.fk_definition_id,
      proposal_year: params.proposal_year,
      proposal_period: params.proposal_period,
      proposed_target: params.proposed_target,
      proposed_by_user_id: params.proposed_by_user_id,
      justification: params.justification ?? null,
      proposal_status: 'PENDING',
    })
    .select()
    .single();

  if (error) throw error;
  return data as SafetyTargetProposal;
}

/**
 * List all proposals, optionally filtered by status.
 */
export async function listTargetProposals(filters?: {
  proposal_status?: ProposalStatus;
  fk_definition_id?: number;
  proposal_year?: number;
}): Promise<SafetyTargetProposal[]> {
  let query = supabase
    .from('spi_kpi_target_proposal')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.proposal_status) query = query.eq('proposal_status', filters.proposal_status);
  if (filters?.fk_definition_id) query = query.eq('fk_definition_id', filters.fk_definition_id);
  if (filters?.proposal_year) query = query.eq('proposal_year', filters.proposal_year);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SafetyTargetProposal[];
}

/**
 * Fetch a single proposal by ID.
 */
export async function getTargetProposalById(
  proposalId: number
): Promise<SafetyTargetProposal | null> {
  const { data, error } = await supabase
    .from('spi_kpi_target_proposal')
    .select('*')
    .eq('proposal_id', proposalId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as SafetyTargetProposal;
}

/**
 * Approve or reject a target proposal.
 * On APPROVED: updates the target_value in spi_kpi_definition.
 */
export async function approveTargetProposal(
  params: ApproveTargetProposalParams
): Promise<SafetyTargetProposal> {
  const { proposal_id, action, approved_by_user_id, justification } = params;

  const { data: proposal, error: fetchError } = await supabase
    .from('spi_kpi_target_proposal')
    .select('*')
    .eq('proposal_id', proposal_id)
    .single();

  if (fetchError || !proposal) throw new Error('Proposal not found');
  if (proposal.proposal_status !== 'PENDING') throw new Error('Proposal is no longer pending');

  const { data: updated, error: updateError } = await supabase
    .from('spi_kpi_target_proposal')
    .update({
      proposal_status: action,
      approved_by_user_id,
      approved_at: new Date().toISOString(),
      ...(justification !== undefined ? { justification } : {}),
    })
    .eq('proposal_id', proposal_id)
    .select()
    .single();

  if (updateError) throw updateError;

  if (action === 'APPROVED' && proposal.proposed_target !== null) {
    const { error: defUpdateError } = await supabase
      .from('spi_kpi_definition')
      .update({
        target_value: proposal.proposed_target,
        updated_at: new Date().toISOString(),
      })
      .eq('definition_id', proposal.fk_definition_id);

    if (defUpdateError) throw defUpdateError;
  }

  return updated as SafetyTargetProposal;
}

/**
 * Delete a proposal (only if still PENDING).
 */
export async function deleteTargetProposal(proposalId: number): Promise<void> {
  const { data: proposal, error: fetchError } = await supabase
    .from('spi_kpi_target_proposal')
    .select('proposal_status')
    .eq('proposal_id', proposalId)
    .single();

  if (fetchError || !proposal) throw new Error('Proposal not found');
  if (proposal.proposal_status !== 'PENDING') {
    throw new Error('Only PENDING proposals can be deleted');
  }

  const { error } = await supabase
    .from('spi_kpi_target_proposal')
    .delete()
    .eq('proposal_id', proposalId);

  if (error) throw error;
}
