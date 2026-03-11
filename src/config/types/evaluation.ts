export type EvaluationStatus = 'NEW' | 'PROGRESS' | 'REVIEW' | 'SUSPENDED' | 'DONE';
export type EvaluationResult = 'PROCESSING' | 'RESULT_POSITIVE' | 'RESULT_NEGATIVE';

export interface Evaluation {
  evaluation_id: number;
  fk_owner_id: number;
  fk_client_id: number;
  fk_luc_procedure_id: number;
  fk_evaluation_code?: string;
  evaluation_status: EvaluationStatus;
  evaluation_result: EvaluationResult;
  evaluation_request_date: string;
  evaluation_year: number;
  evaluation_desc: string;
  evaluation_offer?: string;
  evaluation_sale_manager?: string;
  evaluation_folder?: string;
  evaluation_json?: string;
  evaluation_polygon?: string;
  client_name?: string;
  user_name?: string;
  user_profile_code?: string;
  luc_procedure_code?: string;
  luc_procedure_ver?: string;
  data_create?: string;
  last_update?: string;
  polygon_data?: {
    type: string;
    features: any[];
  } | null;
  area_sqm?: number;

}


export interface CreateEvaluationInput {
  fk_client_id: number;
  fk_luc_procedure_id: number;
  evaluation_status: EvaluationStatus;
  evaluation_request_date: string;
  evaluation_year: number;
  evaluation_desc: string;
  evaluation_offer?: string;
  evaluation_sale_manager?: string;
  evaluation_result: EvaluationResult;
}

export interface UpdateEvaluationInput {
  evaluation_id: number;
  fk_owner_id: number;
  fk_client_id: number;
  fk_luc_procedure_id?: number;
  evaluation_status: EvaluationStatus;
  evaluation_result: EvaluationResult;
  evaluation_request_date: string;
  evaluation_year: number;
  evaluation_desc: string;
  evaluation_offer?: string;
  evaluation_sale_manager?: string;
  evaluation_folder?: string;
  fk_evaluation_code?: string;
}

export interface ApiResponse<T> {
  code: number;
  status: string;
  message: string;
  dataRows: number;
  data: T;
  param?: unknown;
}

export interface Client {
  client_id: number;
  client_name: string;
  client_code: string;
}

export interface LucProcedure {
  luc_procedure_id: number;
  luc_procedure_desc: string;
  luc_procedure_code: string;
  luc_procedure_ver: string;
  luc_procedure_sector: string;
}



export interface EvaluationFile {
  evaluation_file_id: number;
  fk_evaluation_id: number;
  evaluation_file_filename: string;
  evaluation_file_desc: string;
  evaluation_file_ver: string;
  evaluation_file_folder: string;
  evaluation_file_filesize: number;
  last_update: string;
  button_delete?: string;
  button_show?: string;
  download_url:string
}

export interface EvaluationTask {
  task_id:        number;
  task_code:      string;
  task_name:      string;
  task_type:      'checklist' | 'assignment' | 'communication';
  task_status:    'pending' | 'in_progress' | 'completed' | 'skipped';
  task_order:     number;
  checklist_json: object | null;
}

export interface EvaluationPolygonArea {
  name: string;
  area_m2?: number;
  geojson: GeoJSON.Feature;
}

export interface EvaluationUpdatePayload {
  evaluation_id: number;
  fk_owner_id: number;
  fk_client_id: number;
  evaluation_request_date?: string;
  evaluation_year?: number;
  evaluation_desc?: string;
  evaluation_offer?: string;
  evaluation_sale_manager?: string;
  evaluation_status?: EvaluationStatus;
  evaluation_result?: EvaluationResult;
}

export interface SendAssignmentPayload {
  evaluationId: number;
  ownerId:      number;
  fromUserUuid:number
  taskId:       number;
  taskCode:     string;
  taskName:     string;
  toUserId:     number;    
  message:      string;
}

export interface SendAssignmentResult {
  success: boolean;
  message?: string;
}