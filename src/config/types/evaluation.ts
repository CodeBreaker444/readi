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
}

export interface EvaluationFile {
  evaluation_file_id: number;
  fk_evaluation_id: number;
  fk_owner_id: number;
  fk_client_id: number;
  fk_user_id: number;
  evaluation_file_desc: string;
  evaluation_file_folder: string;
  evaluation_file_filename: string;
  evaluation_file_filesize: number;
  evaluation_file_ver: string;
  last_update?: string;
}


export interface CreateEvaluationInput {
  fk_owner_id: number;
  fk_client_id: number;
  fk_luc_procedure_id: number;
  evaluation_status: EvaluationStatus;
  evaluation_request_date: string;
  evaluation_year: number;
  evaluation_desc: string;
  evaluation_offer?: string;
  evaluation_sale_manager?: string;
  evaluation_result: EvaluationResult;
  fk_user_id: number;
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

 