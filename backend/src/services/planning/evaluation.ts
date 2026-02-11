import { supabase } from "@/backend/database/database";

interface EvaluationCreateData {
  client_id: number;
  fk_luc_procedure_id: number;
  evaluation_status: string;
  evaluation_request_date: string;
  evaluation_year: number;
  evaluation_desc: string;
  evaluation_offer?: string;
  evaluation_sale_manager?: string;
  evaluation_result: string;
  areas: Array<{
    type: string;
    area_sqm: number;
    center_lat: number;
    center_lng: number;
    geojson: any;
  }>;
}

export async function createEvaluation(
  ownerId: number,
  userId: number,
  data: EvaluationCreateData
) {
  try {
    const evaluationCode = await generateEvaluationCode(ownerId, data.evaluation_year);

    const polygonData = {
      type: 'FeatureCollection',
      features: data.areas.map((area, index) => ({
        type: 'Feature',
        properties: {
          name: `${area.type} ${index + 1}`,
          area_sqm: area.area_sqm,
          center: {
            lat: area.center_lat,
            lng: area.center_lng
          }
        },
        geometry: area.geojson.geometry
      }))
    };

    const { data: evaluation, error } = await supabase
      .from('evaluation')
      .insert({
        fk_owner_id: ownerId,
        fk_client_id: data.client_id,
        fk_user_id: userId,
        fk_luc_procedure_id: data.fk_luc_procedure_id,
        fk_evaluation_code: evaluationCode,
        evaluation_year: data.evaluation_year,
        evaluation_request_date: data.evaluation_request_date,
        evaluation_desc: data.evaluation_desc,
        evaluation_status: data.evaluation_status,
        evaluation_result: data.evaluation_result,
        evaluation_offer: data.evaluation_offer || null,
        evaluation_sale_manager: data.evaluation_sale_manager || null,
        evaluation_polygon: JSON.stringify(polygonData),
        evaluation_folder: `evaluations/${ownerId}/${evaluationCode}`,
        last_update: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      evaluation_id: evaluation.evaluation_id,
      evaluation_code: evaluationCode,
      message: 'Evaluation created successfully'
    };
  } catch (error) {
    console.error('Error creating evaluation:', error);
    throw new Error('Failed to create evaluation');
  }
}

async function generateEvaluationCode(ownerId: number, year: number): Promise<string> {
  const { count, error } = await supabase
    .from('evaluation')
    .select('*', { count: 'exact', head: true })
    .eq('fk_owner_id', ownerId)
    .eq('evaluation_year', year);

  if (error) throw error;

  const nextNumber = (count || 0) + 1;
  return `EVAL_${year}_${String(nextNumber).padStart(4, '0')}`;
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