import { prisma } from '@/lib/prisma';

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

export async function getComplianceRequirements(
  params: ComplianceRequirementListParams
): Promise<ComplianceRequirementListResult> {
  const { owner_id, requirement_type, requirement_status, q, page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: any = { fk_owner_id: owner_id };
  if (requirement_type) where.requirement_type = requirement_type;
  if (requirement_status) where.requirement_status = requirement_status;
  if (q) {
    where.OR = [
      { requirement_code: { contains: q, mode: 'insensitive' } },
      { requirement_title: { contains: q, mode: 'insensitive' } },
      { requirement_type: { contains: q, mode: 'insensitive' } },
      { regulatory_body: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.compliance_requirement.findMany({
      where,
      orderBy: { requirement_code: 'asc' },
      skip,
      take: limit,
    }),
    prisma.compliance_requirement.count({ where }),
  ]);

  return {
    data: data as unknown as ComplianceRequirement[],
    total,
    page,
    limit,
  };
}

export async function getComplianceRequirementById(
  requirementId: number,
  ownerId: number
): Promise<ComplianceRequirement | null> {
  const row = await prisma.compliance_requirement.findFirst({
    where: { requirement_id: requirementId, fk_owner_id: ownerId },
  });
  return row ? (row as unknown as ComplianceRequirement) : null;
}

export async function createComplianceRequirement(
  params: CreateComplianceRequirementParams
): Promise<ComplianceRequirement> {
  const row = await prisma.compliance_requirement.create({
    data: {
      fk_owner_id: params.owner_id,
      requirement_code: params.requirement_code,
      requirement_title: params.requirement_title,
      requirement_type: params.requirement_type ?? null,
      regulatory_body: params.regulatory_body ?? null,
      requirement_status: params.requirement_status,
      review_frequency: params.review_frequency ?? null,
      next_review_date: params.next_review_date ? new Date(params.next_review_date) : null,
      requirement_description: params.requirement_description ?? null,
    },
  });
  return row as unknown as ComplianceRequirement;
}

export async function updateComplianceRequirement(
  params: UpdateComplianceRequirementParams
): Promise<ComplianceRequirement> {
  const { requirement_id, owner_id, ...fields } = params;

  const existing = await prisma.compliance_requirement.findFirst({
    where: { requirement_id, fk_owner_id: owner_id },
  });
  if (!existing) throw new Error('Requirement not found or access denied');

  const updateData: Record<string, unknown> = { updated_at: new Date() };
  if (fields.requirement_code !== undefined) updateData.requirement_code = fields.requirement_code;
  if (fields.requirement_title !== undefined) updateData.requirement_title = fields.requirement_title;
  if (fields.requirement_type !== undefined) updateData.requirement_type = fields.requirement_type;
  if (fields.regulatory_body !== undefined) updateData.regulatory_body = fields.regulatory_body;
  if (fields.requirement_status !== undefined) updateData.requirement_status = fields.requirement_status;
  if (fields.review_frequency !== undefined) updateData.review_frequency = fields.review_frequency;
  if (fields.next_review_date !== undefined) {
    updateData.next_review_date = fields.next_review_date ? new Date(fields.next_review_date) : null;
  }
  if (fields.requirement_description !== undefined) updateData.requirement_description = fields.requirement_description;

  const updated = await prisma.compliance_requirement.update({
    where: { requirement_id },
    data: updateData as any,
  });
  return updated as unknown as ComplianceRequirement;
}

export async function deleteComplianceRequirement(
  requirementId: number,
  ownerId: number
): Promise<void> {
  await prisma.compliance_status_log.deleteMany({ where: { fk_requirement_id: requirementId } });
  await prisma.compliance_evidence.deleteMany({ where: { fk_requirement_id: requirementId } });
  await prisma.compliance_requirement.deleteMany({
    where: { requirement_id: requirementId, fk_owner_id: ownerId },
  });
}

export async function getComplianceStats(ownerId: number): Promise<{
  total: number;
  compliant: number;
  partial: number;
  non_compliant: number;
  not_applicable: number;
}> {
  const rows = await prisma.compliance_requirement.findMany({
    where: { fk_owner_id: ownerId },
    select: { requirement_status: true },
  });

  return {
    total: rows.length,
    compliant: rows.filter((r) => r.requirement_status === 'COMPLIANT').length,
    partial: rows.filter((r) => r.requirement_status === 'PARTIAL').length,
    non_compliant: rows.filter((r) => r.requirement_status === 'NON_COMPLIANT').length,
    not_applicable: rows.filter((r) => r.requirement_status === 'NOT_APPLICABLE').length,
  };
}
