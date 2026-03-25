import { supabase } from "@/backend/database/database";
import { RepositoryFile } from "@/config/types/evaluation-planning";
import { getPresignedDownloadUrl } from "@/lib/s3Client";

interface EvaluationCreateData {
  client_id: number;
  fk_luc_procedure_id: number;
  evaluation_status: string;
  evaluation_request_date: string;
  evaluation_year: number;
  evaluation_description: string;
  evaluation_offer?: string;
  evaluation_sale_manager?: string;
  areas: Array<{
    type: string;
    area_sqm: number;
    center_lat: number;
    center_lng: number;
    geojson: any;
  }>;
}

 
async function generateEvaluationCode(ownerId: number, year: number): Promise<string> {
  const prefix = `EVA-${year}-`;

  const { data, error } = await supabase
    .from('evaluation')
    .select('evaluation_code')
    .eq('fk_owner_id', ownerId)
    .eq('evaluation_year', year)
    .order('evaluation_code', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`generateEvaluationCode: ${error.message}`);

  let nextNumber = 1;

  if (data && data.evaluation_code) {
    const parts = data.evaluation_code.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextNumber = lastSeq + 1;
    }
  }

  const seq = nextNumber.toString().padStart(4, '0');
  return `${prefix}${seq}`;
}

export async function createNewEvaluationRequest(
  ownerId: number,
  userId: number,
  data: EvaluationCreateData,
) {
  try {
    const evaluationCode = await generateEvaluationCode(ownerId, data.evaluation_year);

    const polygonData = {
      type: 'FeatureCollection' as const,
      features: data.areas.map((area, index) => ({
        type: 'Feature' as const,
        properties: {
          name: `${area.type} ${index + 1}`,
          area_sqm: area.area_sqm,
          center: { lat: area.center_lat, lng: area.center_lng },
        },
        geometry: area.geojson.geometry ?? area.geojson,
      })),
    };

    const totalArea = data.areas.reduce((sum, area) => sum + area.area_sqm, 0);

    const insertData: Record<string, any> = {
      fk_owner_id: ownerId,
      fk_client_id: data.client_id,
      fk_luc_procedure_id: data.fk_luc_procedure_id || null,
      evaluation_code: evaluationCode,
      evaluation_name: `Evaluation ${evaluationCode}`,
      evaluation_description: data.evaluation_description,
      evaluation_type: 'General',
      evaluation_status: data.evaluation_status,
      evaluation_year: data.evaluation_year,
      scheduled_date: data.evaluation_request_date,
      created_by_user_id: userId,
      evaluation_active: 'Y',
       evaluation_result: 'PROCESSING',
      evaluation_metadata: {
        polygon: polygonData,
        area_sqm: totalArea,
        procedure_id: data.fk_luc_procedure_id,
        year: data.evaluation_year,
        offer: data.evaluation_offer ?? '',
        sale_manager: data.evaluation_sale_manager ?? '',
      },
    };

    if (data.areas.length > 0) {
      const firstArea = data.areas[0];
      insertData.coordinates = `(${firstArea.center_lng},${firstArea.center_lat})`;
    }

    const { data: evaluation, error } = await supabase
      .from('evaluation')
      .insert(insertData)
      .select('evaluation_id, evaluation_code')
      .single();

    if (error) {
      console.error('Supabase insert error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(`Failed to insert evaluation: ${error.message}`);
    }

    return {
      success: true,
      evaluation_id: evaluation.evaluation_id,
      evaluation_code: evaluation.evaluation_code,
      message: 'Evaluation created successfully',
    };
  } catch (error) {
    console.error('createNewEvaluationRequest error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to create evaluation',
    );
  }
}

 
export async function getEvaluationFileList(evaluationId: number, ownerId: number) {
  try {
    const { data, error } = await supabase
      .from('evaluation_file')
      .select('*')
      .eq('fk_evaluation_id', evaluationId)
      .eq('fk_owner_id', ownerId)
      .order('last_update', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      files: data.map(file => ({
        id: file.evaluation_file_id,
        filename: file.evaluation_file_filename,
        description: file.evaluation_file_desc,
        version: file.evaluation_file_ver,
        upload_date: file.last_update,
        folder: file.evaluation_file_folder
      }))
    };
  } catch (error) {
    console.error('Error fetching files:', error);
    throw new Error('Failed to fetch evaluation files');
  }
}

export async function getMissionPlanningLogbookFiles(
  ownerId: number,
  planningId?: number
): Promise<RepositoryFile[]> {
  let query = supabase
    .from("planning_logbook")
    .select(
      `
      mission_planning_id,
      mission_planning_code,
      mission_planning_desc,
      mission_planning_filename,
      mission_planning_filesize,
      mission_planning_s3_key,
      mission_planning_s3_url,
      created_at
    `
    )
    .eq("fk_owner_id", ownerId)
    .not("mission_planning_s3_key", "is", null)
    .neq("mission_planning_s3_key", "");

  if (planningId) {
    query = query.eq("fk_planning_id", planningId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error || !data) return [];

  const files: RepositoryFile[] = [];
  for (const row of data) {
    let documentUrl = row.mission_planning_s3_url ?? "#";

    if (row.mission_planning_s3_key) {
      try {
        documentUrl = await getPresignedDownloadUrl(row.mission_planning_s3_key, 900);
      } catch {
        documentUrl = row.mission_planning_s3_url ?? "#";
      }
    }

    files.push({
      file_id: row.mission_planning_id,
      repository_filename: row.mission_planning_filename ?? "",
      repository_filename_description: `${row.mission_planning_code ?? ""} — ${row.mission_planning_desc ?? ""}`,
      repository_filesize: row.mission_planning_filesize
        ? `${(row.mission_planning_filesize / 1024).toFixed(1)} KB`
        : "",
      repository_folder: row.mission_planning_s3_key ?? "",
      document_url: documentUrl,
      s3_url: row.mission_planning_s3_url ?? "",
      last_update: row.created_at ?? "",
    });
  }

  return files;
}