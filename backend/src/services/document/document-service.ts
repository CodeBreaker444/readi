import { DocType, DocumentCreateInput, DocumentDeleteInput, DocumentFilters, DocumentHistoryInput, DocumentListInput, DocumentRevision, DocumentUpdateInput, DocumentUploadRevisionInput, PresignedDownloadInput, RepositoryDocument } from '@/config/types/repository';
import { prisma } from '@/lib/prisma';
import { buildS3Key, buildS3Url, deleteFileFromS3, getPresignedDownloadUrl, uploadFileToS3 } from '@/lib/s3Client';


function toNullableDate(val?: string | null): Date | null {
  if (!val || val.trim() === '') return null;
  return new Date(val);
}

function autoIncrementVersion(current?: string | null): string {
  if (!current) return 'v1.0';
  const match = current.match(/v?(\d+)\.(\d+)/);
  if (match) return `v${match[1]}.${parseInt(match[2]) + 1}`;
  return `${current}_rev`;
}


export async function getDocTypesList(ownerId?: number): Promise<{
  items: DocType[];
  filters: DocumentFilters;
}> {
  const types = await prisma.luc_doc_type.findMany({
    where: {
      doc_type_active: 'Y',
      ...(ownerId ? { OR: [{ fk_owner_id: ownerId }, { fk_owner_id: null }] } : {}),
    },
    orderBy: [{ doc_type_category: 'asc' }, { doc_type_name: 'asc' }],
  });

  const docs = await prisma.luc_document.findMany({
    where: { document_active: 'Y' },
    select: { document_status: true, document_code: true },
  });

  const statuses = [...new Set(docs.map((d) => d.document_status).filter(Boolean))] as string[];
  const areas = [...new Set(types.map((t) => t.doc_type_category).filter(Boolean))] as string[];

  return {
    items: types.map((t) => ({
      doc_type_id:          t.doc_type_id,
      doc_type_code:        t.doc_type_code ?? '',
      doc_type_name:        t.doc_type_name,
      doc_type_description: t.doc_type_description ?? undefined,
      doc_area:             t.doc_type_category as DocType['doc_area'],
      doc_name:             t.doc_type_name,
      retention_days:       null,
      default_owner_role:   null,
    })),
    filters: {
      status:        statuses,
      doc_area:      areas,
      doc_category:  areas,
      doc_owner_role: [],
    },
  };
}


export async function createDocType(input: {
  doc_type_name: string;
  doc_type_category: string;
  owner_id: number;
}): Promise<DocType> {
  const baseCode = input.doc_type_name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
  const code = `${baseCode}_${input.owner_id}`;

  const data = await prisma.luc_doc_type.create({
    data: {
      doc_type_code:     code,
      doc_type_name:     input.doc_type_name.trim(),
      doc_type_category: input.doc_type_category,
      doc_type_active:   'Y',
      fk_owner_id:       input.owner_id,
    },
  });

  return {
    doc_type_id:   data.doc_type_id,
    doc_type_code: data.doc_type_code ?? '',
    doc_type_name: data.doc_type_name,
    doc_area:      data.doc_type_category as DocType['doc_area'],
    doc_name:      data.doc_type_name,
  };
}

export async function updateDocType(id: number, input: { doc_type_name: string }, ownerId: number): Promise<DocType> {
  const existing = await prisma.luc_doc_type.findFirst({
    where: { doc_type_id: id, fk_owner_id: ownerId },
  });
  if (!existing) throw new Error('Not found');

  const data = await prisma.luc_doc_type.update({
    where: { doc_type_id: id },
    data: { doc_type_name: input.doc_type_name.trim() },
  });

  return {
    doc_type_id:   data.doc_type_id,
    doc_type_code: data.doc_type_code ?? '',
    doc_type_name: data.doc_type_name,
    doc_area:      data.doc_type_category as DocType['doc_area'],
    doc_name:      data.doc_type_name,
  };
}

export async function deleteDocType(id: number, ownerId: number): Promise<void> {
  const inUse = await prisma.luc_document.findFirst({
    where: { fk_doc_type_id: id, document_active: 'Y' },
    select: { document_id: true },
  });
  if (inUse) throw new Error('This type is used by existing documents and cannot be deleted.');

  await prisma.luc_doc_type.updateMany({
    where: { doc_type_id: id, fk_owner_id: ownerId },
    data: { doc_type_active: 'N' },
  });
}

export async function listDocuments(input: DocumentListInput): Promise<{
  items: RepositoryDocument[];
  filters: { status: string[] };
}> {
  const docs = await prisma.luc_document.findMany({
    where: {
      fk_owner_id:     input.ownerId,
      document_active: 'Y',
      ...(input.status ? { document_status: input.status } : {}),
      ...(input.area   ? { luc_doc_type: { doc_type_category: input.area } } : {}),
      ...(input.search ? {
        OR: [
          { document_title:       { contains: input.search, mode: 'insensitive' } },
          { document_code:        { contains: input.search, mode: 'insensitive' } },
          { document_description: { contains: input.search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    include: {
      luc_doc_type: { select: { doc_type_name: true, doc_type_category: true } },
    },
    orderBy: { document_id: 'desc' },
  });

  const docIds = docs.map((d) => d.document_id);

  const revs = docIds.length
    ? await prisma.luc_document_rev.findMany({
        where: { fk_document_id: { in: docIds } },
        select: {
          revision_id:          true,
          fk_document_id:       true,
          revision_number:      true,
          revision_description: true,
          file_path:            true,
          file_size:            true,
          changes_summary:      true,
        },
        orderBy: { revision_id: 'desc' },
      })
    : [];

  const latestRevMap = new Map<number, typeof revs[0]>();
  for (const rev of revs) {
    if (!latestRevMap.has(rev.fk_document_id)) {
      latestRevMap.set(rev.fk_document_id, rev);
    }
  }

  const allDocs = await prisma.luc_document.findMany({
    where: { document_active: 'Y', document_status: { not: null } },
    select: { document_status: true },
  });
  const statusSet = [...new Set(allDocs.map((d) => d.document_status).filter(Boolean))] as string[];

  const componentIds = docs
    .map((d) => d.fk_component_id)
    .filter((id): id is number => id != null);


  const expiredComponentSet = new Set<number>();
  if (componentIds.length > 0) {
    const expiredComps = await prisma.tool_component.findMany({
      where: {
        component_id:   { in: componentIds },
        component_active: 'Y',
        expiration_date:  { lte: new Date(), not: null },
      },
      select: { component_id: true },
    });
    expiredComps.forEach((c) => expiredComponentSet.add(c.component_id));
  }

  const items: RepositoryDocument[] = (docs ?? []).map((d) => {
    const rev = latestRevMap.get(d.document_id) ?? null;
   const typeData = Array.isArray(d.luc_doc_type)
  ? (d.luc_doc_type as Array<{ doc_type_name: string; doc_type_category: string }>)[0]
  : d.luc_doc_type as { doc_type_name: string; doc_type_category: string } | null;

    const componentId = (d as any).fk_component_id as number | null;
    const isNonOp = componentId != null && expiredComponentSet.has(componentId);

    return {
      document_id:       d.document_id,
      doc_type_id:       d.fk_doc_type_id ?? 0,
      fk_component_id:   componentId,
      type_name:         typeData?.doc_type_name ?? null,
      doc_area:          (typeData?.doc_type_category ?? null) as RepositoryDocument['doc_area'],
      doc_category:      typeData?.doc_type_category ?? null,
      doc_code:          d.document_code,
      title:             d.document_title,
      description:       d.document_description,
      status:            (d.document_status ?? 'DRAFT') as RepositoryDocument['status'],
      confidentiality:   'INTERNAL',
      owner_role:        (d as any).owner_role ?? null,
      effective_date:    d.effective_date?.toISOString() ?? null,
      expiry_date:       d.expiry_date?.toISOString() ?? null,
      tool_status:       isNonOp ? 'NOT_OPERATIONAL' : null,
      keywords:          (d as any).keywords ?? null,
      tags:              (d as any).tags ?? null,
      version_label:     rev?.revision_number ?? d.version_number ?? null,
      change_log:        rev?.changes_summary ?? null,
      file_name:         rev?.revision_description ?? null,
      file_path:         rev?.file_path ?? null,
      s3_url:            rev?.file_path ? buildS3Url(rev.file_path) : null,
      rev_id:            rev?.revision_id ?? null,
      default_owner_role: null,
      created_at:         d.created_at?.toISOString() ?? null,
      updated_at:         d.updated_at?.toISOString() ?? null,
    };
  });

  return { items, filters: { status: statusSet } };
}


export async function createDocument(
  input: DocumentCreateInput,
  s3Key: string,
  fileName: string,
  fileSize: number,
  ownerId: number,
): Promise<{ document_id: number }> {
  if (input.doc_code) {
    const existing = await prisma.luc_document.findFirst({
      where: { fk_owner_id: ownerId, document_code: input.doc_code },
      select: { document_id: true },
    });
    if (existing) throw new Error('A document with code already exists.');
  }

  const doc = await prisma.luc_document.create({
    data: {
      fk_owner_id:          ownerId,
      fk_doc_type_id:       input.doc_type_id,
      document_code:        input.doc_code ?? null,
      document_title:       input.title,
      document_description: input.description ?? null,
      document_status:      input.status,
      effective_date:       toNullableDate(input.effective_date),
      expiry_date:          toNullableDate(input.expiry_date),
      version_number:       input.version_label ?? 'v1.0',
      owner_role:           input.owner_role ?? null,
      keywords:             input.keywords ?? null,
      tags:                 input.tags ?? null,
      is_current_version:   true,
      document_active:      'Y',
      fk_component_id:      input.fk_component_id ?? null,
    },
    select: { document_id: true },
  });

  try {
    await prisma.luc_document_rev.create({
      data: {
        fk_document_id:       doc.document_id,
        revision_number:      input.version_label ?? 'v1.0',
        revision_date:        new Date(),
        revision_description: fileName,
        file_path:            s3Key,
        file_size:            BigInt(fileSize),
        changes_summary:      input.change_log ?? 'Initial version',
      },
    });
  } catch (err) {
    await deleteFileFromS3(s3Key).catch(() => {});
    throw err;
  }

  return { document_id: doc.document_id };
}


export async function updateDocument(input: DocumentUpdateInput): Promise<void> {
  await prisma.luc_document.updateMany({
    where: { document_id: input.document_id, document_active: 'Y' },
    data: {
      fk_doc_type_id:       input.doc_type_id,
      document_code:        input.doc_code ?? null,
      document_title:       input.title,
      document_description: input.description ?? null,
      document_status:      input.status,
      effective_date:       toNullableDate(input.effective_date),
      expiry_date:          toNullableDate(input.expiry_date),
      owner_role:           input.owner_role ?? null,
      keywords:             input.keywords ?? null,
      tags:                 input.tags ?? null,
      fk_component_id:      input.fk_component_id ?? null,
    },
  });
}


export async function deleteDocument(input: DocumentDeleteInput): Promise<{ title: string | null; docCode: string | null }> {
  const docRow = await prisma.luc_document.findFirst({
    where:  { document_id: input.document_id },
    select: { document_title: true, document_code: true },
  });

  await prisma.luc_document.updateMany({
    where: { document_id: input.document_id },
    data:  { document_active: 'N' },
  });

  return { title: docRow?.document_title ?? null, docCode: docRow?.document_code ?? null };
}


export async function getDocumentHistory(input: DocumentHistoryInput): Promise<DocumentRevision[]> {
  const revs = await prisma.luc_document_rev.findMany({
    where:   { fk_document_id: input.document_id },
    orderBy: { revision_id: 'desc' },
  });

  return revs.map((r) => ({
    rev_id:              r.revision_id,
    document_id:         r.fk_document_id,
    version_label:       r.revision_number,
    file_name:           r.revision_description ?? '',
    file_path:           r.file_path ?? '',
    s3_url:              r.file_path ? buildS3Url(r.file_path) : null,
    mime_type:           null,
    file_size:           r.file_size !== null ? Number(r.file_size) : undefined,
    change_log:          r.changes_summary ?? undefined,
    uploaded_at:         r.created_at?.toISOString() ?? '',
    uploaded_by_user_id: null,
  }));
}


export async function uploadDocumentRevision(
  input: DocumentUploadRevisionInput,
  s3Key: string,
  fileName: string,
  fileSize: number,
): Promise<{ rev_id: number }> {
  const latest = await prisma.luc_document_rev.findFirst({
    where:   { fk_document_id: input.document_id },
    orderBy: { revision_id: 'desc' },
    select:  { revision_number: true },
  });

  const newVersion = input.version_label ?? autoIncrementVersion(latest?.revision_number);

  const rev = await prisma.luc_document_rev.create({
    data: {
      fk_document_id:       input.document_id,
      revision_number:      newVersion,
      revision_date:        new Date(),
      revision_description: fileName,
      file_path:            s3Key,
      file_size:            BigInt(fileSize),
      changes_summary:      input.change_log ?? null,
    },
    select: { revision_id: true },
  });

  await prisma.luc_document.update({
    where: { document_id: input.document_id },
    data:  { version_number: newVersion },
  });

  return { rev_id: rev.revision_id };
}


export async function getRevisionDownloadUrl(
  input: PresignedDownloadInput
): Promise<{ url: string; file_name: string | null }> {
  const rev = await prisma.luc_document_rev.findUnique({
    where:  { revision_id: input.rev_id },
    select: { file_path: true, revision_description: true },
  });

  if (!rev?.file_path) throw new Error('Revision not found or has no file');

  const url = await getPresignedDownloadUrl(rev.file_path, 900, rev.revision_description ?? undefined);
  return { url, file_name: rev.revision_description };
}
