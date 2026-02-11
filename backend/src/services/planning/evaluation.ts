import { supabase } from "@/backend/database/database";

interface EvaluationCreateData {
  client_id: number;
  fk_luc_procedure_id: number;
  evaluation_status: string;
  evaluation_request_date: string;
  evaluation_year: number;
  evaluation_desc: string;
  evaluation_name?: string;
  evaluation_type?: string;
  evaluation_priority?: string;
  location?: string;
  assigned_to_user_id?: number;
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
    console.log('Creating evaluation for owner:', ownerId, 'user:', userId);
    console.log('Data received:', JSON.stringify(data, null, 2));
    
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

    const totalArea = data.areas.reduce((sum, area) => sum + area.area_sqm, 0);
    const centerCoordinates = data.areas.length > 0 
      ? `${data.areas[0].center_lat},${data.areas[0].center_lng}` 
      : null;

    const insertData = {
      fk_owner_id: ownerId,
      fk_client_id: data.client_id,
      evaluation_code: evaluationCode,
      evaluation_name: data.evaluation_name || `Evaluation ${evaluationCode}`,
      evaluation_description: data.evaluation_desc,
      evaluation_type: data.evaluation_type || 'General',
      evaluation_status: data.evaluation_status || 'Planning',
      scheduled_date: data.evaluation_request_date,
      location: data.location || null,
      coordinates: centerCoordinates,
      assigned_to_user_id: data.assigned_to_user_id || userId,
      created_by_user_id: userId,
      evaluation_priority: data.evaluation_priority || 'Medium',
      evaluation_active: 'Y',
      evaluation_metadata: JSON.stringify({
        polygon: polygonData,
        area_sqm: totalArea,
        procedure_id: data.fk_luc_procedure_id,
        year: data.evaluation_year,
        offer: data.evaluation_offer,
        sale_manager: data.evaluation_sale_manager,
        result: data.evaluation_result
      })
    };


    const { data: evaluation, error } = await supabase
      .from('evaluation')
      .insert(insertData)
      .select()
      .single();

    console.log('Supabase response - data:', evaluation, 'error:', error);

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    return {
      success: true,
      evaluation_id: evaluation.evaluation_id,
      evaluation_code: evaluationCode,
      message: 'Evaluation created successfully'
    };
  } catch (error) {
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('Error creating evaluation:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create evaluation');
  }
}

async function generateEvaluationCode(ownerId: number, year: number): Promise<string> {
  
  const { count, error } = await supabase
    .from('evaluation')
    .select('*', { count: 'exact', head: true })
    .eq('fk_owner_id', ownerId)
    .like('evaluation_code', `EVAL-${year}-%`);

  if (error) {
    console.error('Error in generateEvaluationCode:', error);
    throw error;
  }

  const nextNumber = (count || 0) + 1;
  const code = `EVAL-${year}-${String(nextNumber).padStart(3, '0')}`;
  console.log('Generated code:', code);
  return code;
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