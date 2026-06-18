import { prisma } from '@/lib/prisma';

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

export async function generateTargetProposals(
  months: number,
  proposedByUserId: number
): Promise<{
  total_pending: number;
  months: number;
  data: EnrichedTargetProposal[];
}> {
  const defs = await prisma.spi_kpi_definition.findMany({
    where: { is_active: true },
    select: { definition_id: true, target_value: true },
  });

  const now = new Date();
  const proposalYear = now.getFullYear();
  const proposalPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  for (const def of defs) {
    const existing = await prisma.spi_kpi_target_proposal.findFirst({
      where: {
        fk_definition_id: def.definition_id,
        proposal_year: proposalYear,
        proposal_period: proposalPeriod,
        proposal_status: 'PENDING',
      },
    });
    if (existing) continue;

    const measurements = await prisma.spi_kpi.findMany({
      where: {
        fk_definition_id: def.definition_id,
        measurement_date: { gte: cutoff },
      },
      select: { actual_value: true },
    });

    const values = measurements
      .map((m) => Number(m.actual_value))
      .filter((v) => !isNaN(v));

    const currentTarget = Number(def.target_value ?? 0);
    const suggested =
      values.length > 0
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10000) / 10000
        : currentTarget;

    await prisma.spi_kpi_target_proposal.create({
      data: {
        fk_definition_id: def.definition_id,
        proposal_year: proposalYear,
        proposal_period: proposalPeriod,
        proposed_target: suggested,
        proposed_by_user_id: proposedByUserId,
        justification: `Auto-generated from average of last ${months} month(s) of measurements.`,
        proposal_status: 'PENDING',
      },
    });
  }

  const proposals = await prisma.spi_kpi_target_proposal.findMany({
    orderBy: { created_at: 'desc' },
  });

  const defIds = [...new Set(proposals.map((r) => r.fk_definition_id))];
  const defRows = defIds.length
    ? await prisma.spi_kpi_definition.findMany({
        where: { definition_id: { in: defIds } },
        select: {
          definition_id: true,
          kpi_name: true,
          kpi_category: true,
          kpi_type: true,
          target_value: true,
        },
      })
    : [];

  const defMap = new Map(defRows.map((d) => [d.definition_id, d]));

  const enriched: EnrichedTargetProposal[] = proposals.map((r) => {
    const def = defMap.get(r.fk_definition_id);
    const current = Number(def?.target_value ?? 0);
    const suggested = Number(r.proposed_target ?? 0);
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
      status: (r.proposal_status ?? 'PENDING') as ProposalStatus,
      notes: r.justification,
      approved_by: r.approved_by_user_id ? String(r.approved_by_user_id) : null,
      approved_at: r.approved_at ? r.approved_at.toISOString() : null,
      created_at: r.created_at ? r.created_at.toISOString() : '',
    };
  });

  const pending = enriched.filter((r) => r.status === 'PENDING').length;
  return { total_pending: pending, months, data: enriched };
}

export async function createTargetProposal(
  params: CreateTargetProposalParams
): Promise<SafetyTargetProposal> {
  const row = await prisma.spi_kpi_target_proposal.create({
    data: {
      fk_definition_id: params.fk_definition_id,
      proposal_year: params.proposal_year,
      proposal_period: params.proposal_period,
      proposed_target: params.proposed_target,
      proposed_by_user_id: params.proposed_by_user_id,
      justification: params.justification ?? null,
      proposal_status: 'PENDING',
    },
  });
  return row as unknown as SafetyTargetProposal;
}

export async function listTargetProposals(filters?: {
  proposal_status?: ProposalStatus;
  fk_definition_id?: number;
  proposal_year?: number;
}): Promise<SafetyTargetProposal[]> {
  const where: any = {};
  if (filters?.proposal_status) where.proposal_status = filters.proposal_status;
  if (filters?.fk_definition_id) where.fk_definition_id = filters.fk_definition_id;
  if (filters?.proposal_year) where.proposal_year = filters.proposal_year;

  const rows = await prisma.spi_kpi_target_proposal.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });
  return rows as unknown as SafetyTargetProposal[];
}

export async function getTargetProposalById(
  proposalId: number
): Promise<SafetyTargetProposal | null> {
  const row = await prisma.spi_kpi_target_proposal.findUnique({
    where: { proposal_id: proposalId },
  });
  return row ? (row as unknown as SafetyTargetProposal) : null;
}

export async function approveTargetProposal(
  params: ApproveTargetProposalParams
): Promise<SafetyTargetProposal> {
  const { proposal_id, action, approved_by_user_id, justification } = params;

  const proposal = await prisma.spi_kpi_target_proposal.findUnique({
    where: { proposal_id },
  });
  if (!proposal) throw new Error('Proposal not found');
  if (proposal.proposal_status !== 'PENDING') throw new Error('Proposal is no longer pending');

  const updateData: any = {
    proposal_status: action,
    approved_by_user_id,
    approved_at: new Date(),
  };
  if (justification !== undefined) updateData.justification = justification;

  const updated = await prisma.spi_kpi_target_proposal.update({
    where: { proposal_id },
    data: updateData,
  });

  if (action === 'APPROVED' && proposal.proposed_target !== null) {
    await prisma.spi_kpi_definition.update({
      where: { definition_id: proposal.fk_definition_id },
      data: { target_value: proposal.proposed_target, updated_at: new Date() },
    });
  }

  return updated as unknown as SafetyTargetProposal;
}

export async function deleteTargetProposal(proposalId: number): Promise<void> {
  const proposal = await prisma.spi_kpi_target_proposal.findUnique({
    where: { proposal_id: proposalId },
    select: { proposal_status: true },
  });
  if (!proposal) throw new Error('Proposal not found');
  if (proposal.proposal_status !== 'PENDING') {
    throw new Error('Only PENDING proposals can be deleted');
  }

  await prisma.spi_kpi_target_proposal.delete({ where: { proposal_id: proposalId } });
}
