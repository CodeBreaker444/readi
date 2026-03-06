export interface Evaluation {
  evaluation_id: number;
  fk_owner_id: number;
  fk_client_id: number | null;
  fk_luc_procedure_id: number;
  fk_evaluation_code: string;
  evaluation_desc: string;
  evaluation_status: EvaluationStatus;
  evaluation_result: string;
  evaluation_request_date: string;
  evaluation_year: number;
  evaluation_offer: string;
  evaluation_sale_manager: string;
  evaluation_folder: string;
  evaluation_json: string;
  evaluation_polygon: string;
  last_update: string;
  client_name: string;
  user_name: string;
  user_profile_code: string;
  luc_procedure_code: string;
  luc_procedure_ver: string;
}

export type EvaluationStatus =
  | "NEW" | "PROCESSING" | "REQ_FEEDBACK" | "POSITIVE_RESULT" | "NEGATIVE_RESULT";

export interface EvaluationFile {
  evaluation_file_id: number;
  fk_evaluation_id: number;
  fk_owner_id: number;
  evaluation_file_desc: string;
  evaluation_file_folder: string;
  evaluation_file_filename: string;
  evaluation_file_filesize: number;
  evaluation_file_ver: string;
  last_update: string;
}

export interface Planning {
  planning_id: number;
  fk_owner_id: number;
  fk_client_id: number;
  fk_evaluation_id: number;
  fk_luc_procedure_id: number;
  fk_user_id: number;
  fk_pic_id: number;
  planning_desc: string;
  planning_status: PlanningStatus;
  planning_request_date: string;
  planning_year: number;
  planning_type: string;
  planning_ver: string;
  planning_folder: string;
  planning_result: string;
  planning_json: string;
  last_update: string;
  client_name: string;
  user_fullname: string;
  user_profile_code: string;
  luc_procedure_code: string;
  luc_procedure_ver: string;
  pic_data: { fullname: string; user_profile_code: string };
}

export type PlanningStatus =
  | "NEW" | "PROCESSING" | "REQ_FEEDBACK" | "POSITIVE_RESULT" | "NEGATIVE_RESULT";

export interface LucProcedure {
  luc_procedure_id: number;
  luc_procedure_desc: string;
  luc_procedure_code: string;
  luc_procedure_ver: string;
  luc_procedure_sector: string;
}

export interface Client {
  client_id: number;
  client_name: string;
  client_code: string;
}

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  dataRows?: number;
  errors?: Record<string, string[]>;
}

 
 

export interface PlanningData {
  planning_id: number;
  fk_owner_id: number;
  fk_client_id: number;
  fk_evaluation_id: number;
  fk_luc_procedure_id: number | null;
  planning_code: string;
  planning_desc: string;
  planning_status: string;
  planning_result: string;
  planning_ver: string;
  planning_request_date: string | null;
  planning_year: string;
  planning_type: string;
  planning_folder: string;
  planning_json: string | null;
  client_name: string;
  default_limit_json?: string;
}

export interface PlanningLogbookRow {
  mission_planning_id: number;
  fk_planning_id: number;
  fk_evaluation_id: number;
  fk_client_id: number;
  fk_tool_id: number | null;
  mission_planning_code: string;
  mission_planning_desc: string;
  mission_planning_limit_json: Record<string, unknown> | null;
  mission_planning_active: string;
  mission_planning_ver: string;
  mission_planning_filename: string;
  mission_planning_filesize: number;
  planning_desc: string;
  tool_code: string;
  tool_desc: string;
  tot_test: number;
}

export interface PlanningTestLogbookRow {
  test_id: number;
  fk_planning_id: number;
  test_code: string;
  test_desc: string;
  test_status: string;
  test_result: string;
}

export interface DroneTool {
  tool_id: number;
  tool_code: string;
  tool_desc: string;
  tool_status: string;
  tool_active: string;
  fk_owner_id: number;
  fk_model_id: number | null;
  client_name: string;
  factory_type: string;
  factory_serie: string;
  factory_model: string;
}

export interface PilotUser {
  user_id: number;
  fullname: string;
  email: string;
  pilot_status_desc: string;
}

export interface MissionTemplate {
  mission_planning_id: number;
  mission_planning_code: string;
  mission_planning_desc: string;
  mission_planning_active: string;
}

export type FileType = "mission_planning_logbook" | "mission_planning_test_logbook";

export interface RepositoryFile {
  file_id: number;
  repository_filename: string;
  repository_filename_description?: string;
  repository_filesize?: string;
  repository_folder?: string;
  document_url?: string;
  s3_url?: string;
  last_update?: string;
}

export interface TaskData {
  tasks: TaskItem[];
}

export interface TaskItem {
  name: string;
  description: string;
  completed: boolean;
}


export interface MissionTestRow {
  test_id: number;
  fk_planning_id: number;
  fk_mission_planning_id: number;
  fk_evaluation_id: number;
  fk_pic_id: number;
  fk_observer_id: number;
  fk_owner_id: number;
  test_code: string;
  mission_test_date_start: string;
  mission_test_date_end: string;
  mission_test_result: string;
  mission_test_folder?: string;
  mission_test_filename?: string;
  mission_test_filesize?: number;
  mission_test_s3_key?: string;
  mission_test_s3_url?: string;
  document_url?: string;
  created_at: string;
  pic_name?: string;
  observer_name?: string;
}
export interface MissionTestCreateInput {
  fk_mission_planning_id: number;
  fk_planning_id: number;
  fk_evaluation_id: number;
  fk_pic_id: number;
  fk_observer_id: number;
  mission_test_code: string;
  mission_test_date_start: string;
  mission_test_date_end: string;
  mission_test_result: string;
}

export interface PilotUser {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  userActive: string;
}