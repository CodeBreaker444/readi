export interface Document {
  document_id: number;
  doc_type_id: number;
  doc_code: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'OBSOLETE';
  area: string;
  category: string;
  confidentiality: 'INTERNAL' | 'PUBLIC' | 'CONFIDENTIAL' | 'RESTRICTED';
  owner_role: string;
  effective_date?: string;
  expiry_date?: string;
  keywords?: string;
  tags?: string;
  version_label: string;
  change_log?: string;
  file_path?: string;
  created_at: string;
  updated_at: string;
  type_name?: string;
}

export interface FilterState {
  search: string;
  area: string;
  category: string;
  status: string;
  owner: string;
}

export interface DocumentType {
  doc_type_id: number;
  type_name: string;
  area: string;
  category: string;
}

export interface HistoryItem {
  version_label: string;
  change_log: string;
  created_at: string;
  created_by: string;
}

export interface Notifications {
  notification_id: number;
  message: string;
  procedure_name: string;
  is_read: 'Y' | 'N';
  created_at: string;
  read_at?: string;
  sender_fullname?: string;
  sender_profile?: string;
  sender_profile_code?: string;
  communication_general_id?: number;
}

export interface SafetyIndicator {
  id: number;
  indicator_code: string;
  indicator_type: 'KPI' | 'SPI';
  indicator_area: 'COMPLIANCE' | 'TRAINING' | 'OPERATIONS' | 'MAINTENANCE';
  indicator_name: string;
  indicator_desc?: string;
  target_value: number;
  unit: string;
  frequency: string;
  is_active: 0 | 1;
}


export interface LUCProcedure {
  id: string;
  code: string;
  sector: 'EVALUATION' | 'PLANNING' | 'MISSION';
  version: string;
  active: 'Y' | 'N';
  description: string;
  jsonSchema: string;
  createdAt: string;
  updatedAt: string;
}

export interface Checklist {
  id: string;
  code: string;
  version: string;
  active: 'Y' | 'N';
  description: string;
  jsonSchema: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  code: string;
  version: string;
  active: 'Y' | 'N';
  description: string;
  jsonSchema: string;
  createdAt: string;
  updatedAt: string;
}

export interface Communication {
  id: string;
  code: string;
  version: string;
  active: 'Y' | 'N';
  description: string;
  jsonSchema: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationNode {
  id: string;
  name: string;
  title?: string;
  department?: string;
  children?: OrganizationNode[];
}

export type ActiveStatus = 'Y' | 'N';
export type SectorType = 'EVALUATION' | 'PLANNING' | 'MISSION';

export interface MissionType {
  id: number;
  name: string;
  code: string;
  description: string;
  label: string;
}

export interface MissionCategory {
  id: number;
  description: string;
}

export interface MissionStatus {
  id: number;
  code: string;
  description: string;
}

export interface MissionResult {
  id: number;
  code: string;
  description: string;
}

export interface DashboardRequestParams {
  owner_id: number;
  user_id: number;
  user_timezone: string;
  user_profile_code: string;
}

export interface MissionTotal {
  status: string;
  year: number;
  fk_client_id: number;
  client_name: string;
  total_mission: number;
  total_time: number;
  total_hours: number;
  total_meter: number;
  total_planned: number;
  total_drones_used: number;
  total_clients_served: number;
}

export interface MissionListItem {
  status: string;
  year: number;
  fk_client_id: number;
  fk_user_id: number;
  mission_id: number;
  date: string;
  pilot_name: string;
  drone_code: string;
  mission_type_desc: string;
  mission_result_desc: string;
  mission_duration_min: number;
}

export interface ChartData {
  labels: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
}

export interface MissionResultChart {
  labels: string[];
  series: number[];
}

export interface PilotTotal {
  total_missions: number;
  total_hours: number;
  total_distance: number;
}