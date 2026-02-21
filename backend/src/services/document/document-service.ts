import { supabase } from '@/backend/database/database';
import { DocType, DocumentCreateInput, DocumentDeleteInput, DocumentFilters, DocumentHistoryInput, DocumentListInput, DocumentRevision, DocumentUpdateInput, DocumentUploadRevisionInput, PresignedDownloadInput, RepositoryDocument } from '@/config/types/repository';
import { buildS3Key, buildS3Url, deleteFileFromS3, getPresignedDownloadUrl, uploadFileToS3 } from '@/lib/s3Client';


function toNullableDate(val?: string | null): string | null {
  if (!val || val.trim() === '') return null;
  return val;
}

function autoIncrementVersion(current?: string | null): string {
  if (!current) return 'v1.0';
  const match = current.match(/v?(\d+)\.(\d+)/);
  if (match) return `v${match[1]}.${parseInt(match[2]) + 1}`;
  return `${current}_rev`;
}


export async function getDocTypesList(): Promise<{
  items: DocType[];
  filters: DocumentFilters;
}> {

  const { data: types, error } = await supabase
    .from('luc_doc_type')
    .select('*')
    .eq('doc_type_active', 'Y')
    .order('doc_type_category', { ascending: true })
    .order('doc_type_name', { ascending: true });

  if (error) throw new Error(`getDocTypesList: ${error.message}`);

  const { data: docs } = await supabase
    .from('luc_document')
    .select('document_status, document_code')
    .eq('document_active', 'Y');

  const statuses = [...new Set((docs ?? []).map((d) => d.document_status).filter(Boolean))] as string[];
  const areas = [...new Set((types ?? []).map((t) => t.doc_type_category).filter(Boolean))] as string[];

  return {
    items: (types ?? []).map((t) => ({
      doc_type_id:       t.doc_type_id,
      doc_type_code:     t.doc_type_code,
      doc_type_name:     t.doc_type_name,
      doc_type_description: t.doc_type_description,
      doc_area:          t.doc_type_category as DocType['doc_area'],
      doc_name:          t.doc_type_name,
      retention_days:    null,
      default_owner_role: null,
    })),
    filters: {
      status:        statuses,
      doc_area:      areas,
      doc_category:  areas,
      doc_owner_role: [],
    },
  };
}


export async function listDocuments(input: DocumentListInput): Promise<{
  items: RepositoryDocument[];
  filters: { status: string[] };
}> {

  let query = supabase
    .from('luc_document')
    .select(`
      document_id,
      fk_doc_type_id,
      document_code,
      document_title,
      document_description,
      document_status,
      effective_date,
      expiry_date,
      version_number,
      created_at,
      updated_at,
      luc_doc_type (
        doc_type_name,
        doc_type_category
      )
    `)
    .eq('document_active', 'Y')
    .order('document_id', { ascending: false });

  if (input.status)   query = query.eq('document_status', input.status);
  if (input.area)     query = query.eq('luc_doc_type.doc_type_category', input.area);
  if (input.search) {
    query = query.or(
      `document_title.ilike.%${input.search}%,document_code.ilike.%${input.search}%,document_description.ilike.%${input.search}%`
    );
  }

  const { data: docs, error } = await query;
  if (error) throw new Error(`listDocuments: ${error.message}`);

  const docIds = (docs ?? []).map((d) => d.document_id);
  const { data: revs } = docIds.length
    ? await supabase
        .from('luc_document_rev')
        .select('revision_id, fk_document_id, revision_number, revision_description, file_path, file_size, changes_summary')
        .in('fk_document_id', docIds)
        .order('revision_id', { ascending: false })
    : { data: [] };

  const latestRevMap = new Map<number, { revision_id: any; fk_document_id: any; revision_number: any; revision_description: any; file_path: any; file_size: any; changes_summary: any }>();
  for (const rev of (revs ?? [])) {
    if (!latestRevMap.has(rev.fk_document_id)) {
      latestRevMap.set(rev.fk_document_id, rev);
    }
  }

  const { data: allStatuses } = await supabase
    .from('luc_document')
    .select('document_status')
    .eq('document_active', 'Y')
    .not('document_status', 'is', null);

  const statusSet = [...new Set((allStatuses ?? []).map((d) => d.document_status).filter(Boolean))];

  const items: RepositoryDocument[] = (docs ?? []).map((d) => {
    const rev = latestRevMap.get(d.document_id) ?? null;
   const typeData = Array.isArray(d.luc_doc_type)
  ? (d.luc_doc_type as Array<{ doc_type_name: string; doc_type_category: string }>)[0]
  : d.luc_doc_type as { doc_type_name: string; doc_type_category: string } | null;

    return {
      document_id:       d.document_id,
      doc_type_id:       d.fk_doc_type_id ?? 0,
      type_name:         typeData?.doc_type_name ?? null,
      doc_area:          (typeData?.doc_type_category ?? null) as RepositoryDocument['doc_area'],
      doc_category:      typeData?.doc_type_category ?? null,
      doc_code:          d.document_code,
      title:             d.document_title,
      description:       d.document_description,
      status:            (d.document_status ?? 'DRAFT') as RepositoryDocument['status'],
      confidentiality:   'INTERNAL',
      owner_role:        d.document_code,           
      effective_date:    d.effective_date,
      expiry_date:       d.expiry_date,
      keywords:          null,
      tags:              null,
      version_label:     rev?.revision_number ?? d.version_number ?? null,
      file_name:         rev?.revision_description ?? null,
      file_path:         rev?.file_path ?? null,   
      s3_url:            rev?.file_path ? buildS3Url(rev.file_path) : null,
      rev_id:            rev?.revision_id ?? null,
      default_owner_role: null,
      created_at:        d.created_at,
      updated_at:        d.updated_at,
    };
  });

  return { items, filters: { status: statusSet as string[] } };
}


export async function createDocument(
  input: DocumentCreateInput,
  file: File,
  ownerId: number 
): Promise<{ document_id: number }> {

  if (input.doc_code) {
    const { data: existing } = await supabase
      .from('luc_document')
      .select('document_id')
      .eq('fk_owner_id', ownerId)
      .eq('document_code', input.doc_code)
      .maybeSingle();

    if (existing) {
      throw new Error(`A document with code already exists.`);
    }
  }

  const { data: doc, error: docErr } = await supabase
    .from('luc_document')
    .insert({
      fk_owner_id:          ownerId,
      fk_doc_type_id:       input.doc_type_id,
      document_code:        input.doc_code ?? null,
      document_title:       input.title,
      document_description: input.description ?? null,
      document_status:      input.status,
      effective_date:       toNullableDate(input.effective_date),
      expiry_date:          toNullableDate(input.expiry_date),
      version_number:       input.version_label ?? 'v1.0',
      is_current_version:   true,
      document_active:      'Y',
    })
    .select('document_id')
    .single();

  if (docErr || !doc) throw new Error(`createDocument insert: ${docErr?.message}`);

  const documentId = doc.document_id;

  const s3Key = buildS3Key(documentId, file.name);
  await uploadFileToS3(s3Key, file);

  const { error: revErr } = await supabase.from('luc_document_rev').insert({
    fk_document_id:      documentId,
    revision_number:     input.version_label ?? 'v1.0',
    revision_date:       new Date().toISOString().slice(0, 10),
    revision_description: file.name,
    file_path:           s3Key,                       
    file_size:           file.size,
    changes_summary:     input.change_log ?? 'Initial version',
  });

  if (revErr) {
    //delete S3 file if DB insert failed
    await deleteFileFromS3(s3Key).catch(() => {});
    throw new Error(`createDocument revision: ${revErr.message}`);
  }

  return { document_id: documentId };
}


export async function updateDocument(input: DocumentUpdateInput): Promise<void> {

  const { error } = await supabase
    .from('luc_document')
    .update({
      fk_doc_type_id:       input.doc_type_id,
      document_code:        input.doc_code ?? null,
      document_title:       input.title,
      document_description: input.description ?? null,
      document_status:      input.status,
      effective_date:       toNullableDate(input.effective_date),
      expiry_date:          toNullableDate(input.expiry_date),
    })
    .eq('document_id', input.document_id)
    .eq('document_active', 'Y');

  if (error) throw new Error(`updateDocument: ${error.message}`);
}


export async function deleteDocument(input: DocumentDeleteInput): Promise<void> {

  const { error } = await supabase
    .from('luc_document')
    .update({ document_active: 'N' })
    .eq('document_id', input.document_id);

  if (error) throw new Error(`deleteDocument: ${error.message}`);
}


export async function getDocumentHistory(
  input: DocumentHistoryInput
): Promise<DocumentRevision[]> {

  const { data, error } = await supabase
    .from('luc_document_rev')
    .select('*')
    .eq('fk_document_id', input.document_id)
    .order('revision_id', { ascending: false });

  if (error) throw new Error(`getDocumentHistory: ${error.message}`);

  return (data ?? []).map((r) => ({
    rev_id:              r.revision_id,
    document_id:         r.fk_document_id,
    version_label:       r.revision_number,
    file_name:           r.revision_description,
    file_path:           r.file_path,                 
    s3_url:              r.file_path ? buildS3Url(r.file_path) : null,
    mime_type:           null,
    file_size:           r.file_size,
    change_log:          r.changes_summary,
    uploaded_at:         r.created_at,
    uploaded_by_user_id: null,
  }));
}


export async function uploadDocumentRevision(
  input: DocumentUploadRevisionInput,
  file: File
): Promise<{ rev_id: number }> {

  const { data: latest } = await supabase
    .from('luc_document_rev')
    .select('revision_number')
    .eq('fk_document_id', input.document_id)
    .order('revision_id', { ascending: false })
    .limit(1)
    .single();

  const newVersion = input.version_label ?? autoIncrementVersion(latest?.revision_number);

  const s3Key = buildS3Key(input.document_id, file.name);
  await uploadFileToS3(s3Key, file);

  const { data: rev, error: revErr } = await supabase
    .from('luc_document_rev')
    .insert({
      fk_document_id:       input.document_id,
      revision_number:      newVersion,
      revision_date:        new Date().toISOString().slice(0, 10),
      revision_description: file.name,
      file_path:            s3Key,
      file_size:            file.size,
      changes_summary:      input.change_log ?? null,
    })
    .select('revision_id')
    .single();

  if (revErr || !rev) {
    await deleteFileFromS3(s3Key).catch(() => {});
    throw new Error(`uploadDocumentRevision: ${revErr?.message}`);
  }

  await supabase
    .from('luc_document')
    .update({ version_number: newVersion })
    .eq('document_id', input.document_id);

  return { rev_id: rev.revision_id };
}


export async function getRevisionDownloadUrl(
  input: PresignedDownloadInput
): Promise<{ url: string; file_name: string | null }> {

  const { data, error } = await supabase
    .from('luc_document_rev')
    .select('file_path, revision_description')
    .eq('revision_id', input.rev_id)
    .single();

  if (error || !data?.file_path) {
    throw new Error('Revision not found or has no file');
  }

  const url = await getPresignedDownloadUrl(data.file_path, 900);
  return { url, file_name: data.revision_description };
}