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
  client_code?: string;  
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

export interface DroneOption {
  tool_id: number;
  tool_code: string;
  tool_desc: string;
  tool_status: string;
}

export interface MissionTypeOption {
  mission_type_id: number;
  mission_type_desc: string;
}

export interface MissionCategoryOption {
  mission_category_id: number;
  mission_category_desc: string;
}

export interface MissionResultOption {
  mission_result_id: number;
  mission_result_desc: string;
}

export interface MissionStatusOption {
  mission_status_id: number;
  mission_status_desc: string;
}

export interface MissionPlanOption {
  mission_planning_id: number;
  mission_planning_code: string;
  mission_planning_desc: string;
}


export interface OperationFilterParams {
  owner_id: number;
  pic_id?: number;
  date_start?: string;
  date_end?: string;
  vehicle_id?: number;
  mission_status_id?: number;
  mission_type_id?: number;
  mission_category_id?: number;
  mission_result_id?: number;
  client_id?: number;
  mission_plan_id?: number;
}

export interface OperationLogbookItem {
  mission_id: number;
  date_start: string;
  date_end: string;
  time_start: string;
  time_end: string;
  pic_fullname: string;
  client_name: string;
  mission_category_desc: string;
  mission_type_desc: string;
  vehicle_code: string;
  vehicle_desc: string;
  mission_status_desc: string;
  mission_result_desc: string;
  fk_mission_planning_id: number;
  mission_planning_code: string;
  mission_planning_desc: string;
  flown_time: number;
  flown_meter: number;
  mission_notes: string;
}

export interface OperationLogbookListResponse {
  code: number;
  status: string;
  message: string;
  dataRows: number;
  data: OperationLogbookItem[];
}

export interface OperationFilterResponse {
  code: number;
  pilots: { data: PilotOption[] };
  clients: { data: ClientOption[] };
  drones: { data: DroneOption[] };
  missionTypes: { data: MissionTypeOption[] };
  missionCategories: { data: MissionCategoryOption[] };
  missionResults: { data: MissionResultOption[] };
  missionStatuses: { data: MissionStatusOption[] };
  missionPlans: { data: MissionPlanOption[] };
}