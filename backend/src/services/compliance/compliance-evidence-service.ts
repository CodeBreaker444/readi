import { prisma } from '@/lib/prisma';

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

export async function listEvidenceByRequirement(
  requirementId: number,
  ownerId: number
): Promise<ComplianceEvidence[]> {
  const req = await prisma.compliance_requirement.findFirst({
    where: { requirement_id: requirementId, fk_owner_id: ownerId },
    select: { requirement_id: true },
  });
  if (!req) throw new Error('Requirement not found or access denied');

  const rows = await prisma.compliance_evidence.findMany({
    where: { fk_requirement_id: requirementId },
    orderBy: { submitted_at: 'desc' },
  });
  return rows as unknown as ComplianceEvidence[];
}

export async function addEvidence(params: CreateEvidenceParams): Promise<ComplianceEvidence> {
  const req = await prisma.compliance_requirement.findFirst({
    where: { requirement_id: params.requirement_id, fk_owner_id: params.owner_id },
    select: { requirement_id: true },
  });
  if (!req) throw new Error('Requirement not found or access denied');

  const row = await prisma.compliance_evidence.create({
    data: {
      fk_requirement_id: params.requirement_id,
      evidence_type: params.evidence_type,
      evidence_description: params.evidence_description ?? null,
      file_path: params.file_path ?? null,
      notes: params.notes ?? null,
      submitted_by_user_id: params.submitted_by_user_id ?? null,
      verification_status: 'PENDING',
    },
  });
  return row as unknown as ComplianceEvidence;
}

export async function deleteEvidence(evidenceId: number, ownerId: number): Promise<void> {
  const ev = await prisma.compliance_evidence.findUnique({
    where: { evidence_id: evidenceId },
    select: { evidence_id: true, fk_requirement_id: true },
  });
  if (!ev) throw new Error('Evidence not found');

  const req = await prisma.compliance_requirement.findFirst({
    where: { requirement_id: ev.fk_requirement_id, fk_owner_id: ownerId },
    select: { requirement_id: true },
  });
  if (!req) throw new Error('Access denied');

  await prisma.compliance_evidence.delete({ where: { evidence_id: evidenceId } });
}

export async function updateRequirementStatus(params: {
  requirement_id: number;
  owner_id: number;
  new_status: string;
  changed_by_user_id: number;
  comment?: string | null;
}): Promise<void> {
  const { requirement_id, owner_id, new_status, changed_by_user_id, comment } = params;

  const current = await prisma.compliance_requirement.findFirst({
    where: { requirement_id, fk_owner_id: owner_id },
    select: { requirement_status: true },
  });
  if (!current) throw new Error('Requirement not found or access denied');

  await prisma.compliance_requirement.update({
    where: { requirement_id },
    data: { requirement_status: new_status, updated_at: new Date() },
  });

  await prisma.compliance_status_log.create({
    data: {
      fk_requirement_id: requirement_id,
      status_from: current.requirement_status,
      status_to: new_status,
      changed_by_user_id,
      change_reason: comment ?? null,
    },
  });
}
