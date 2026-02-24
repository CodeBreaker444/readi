export interface MissionPlanningLogbookItem {
  mission_planning_id: number;
  client_name: string;
  evaluation_desc: string;
  planning_desc: string;
  mission_planning_desc: string;
  mission_planning_code: string;
  mission_planning_ver: number;
  mission_planning_filename: string;
  mission_planning_active: string;
  tot_test: number;
  fk_evaluation_id: number;
  fk_planning_id: number;
  fk_client_id: number;
  fk_owner_id: number;
}

export interface FilterParams {
  owner_id: number;
  client_id?: number;
  evaluation_id?: number;
  planning_id?: number;
  user_id?: number;
  date_start?: string;
  date_end?: string;
}

 

export interface ClientOption {
  client_id: number;
  client_name: string;
  client_code: string;
}

export interface PilotOption {
  user_id: number;
  fullname: string;
  pilot_status_desc: string;
}

export interface EvaluationOption {
  evaluation_id: number;
  evaluation_desc: string;
}

export interface PlanningOption {
  planning_id: number;
  planning_desc: string;
}