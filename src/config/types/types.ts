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
export interface ToolStatusRef {
  status_id: number;
  status_code: string;
  status_name: string;
  status_description?: string | null;
  status_color?: string | null;
  status_icon?: string | null;
  status_order?: number | null;
  is_active: boolean;
}
 
export interface ToolType {
  tool_type_id: number;
  tool_type_code?: string | null;
  tool_type_name: string;
  tool_type_description?: string | null;
  tool_type_category?: string | null;
  tool_type_active?: "Y" | "N";
}

export interface ToolMetadata {
  latitude?: number;
  longitude?: number;
  gcs_type?: string;
  cc_platform?: string;
  streaming_type?: string;
  streaming_url?: string;
  fk_client_id?: number;
  tot_mission?: number;
  tot_flown_time?: number;
  tot_flown_meter?: number;
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
  code: string;
  name: string;
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

export interface Mission {
  id: number;
  code: string;
  name: string;
  description?: string;
  order?: number;
  isFinalStatus?: boolean;
}

export interface MissionResult {
  id: number;
  code: string;
  description: string;
}
export interface Tool {
  id: number;
  ownerId: number;
  clientId?: number;
  modelId?: number;
  statusId?: number;
  typeId?: number;
  code: string;
  serialNumber: string;
  type: string;
  description: string;
  status: 'OPERATIONAL' | 'NOT_OPERATIONAL' | 'MAINTENANCE' | 'DECOMMISSIONED';
  active: string;
  activationDate: string;
  latitude?: number;
  longitude?: number;
  streamingType?: string;
  streamingUrl?: string;
  ccPlatform?: string;
  gcsType?: string;
  vendor?: string;
  guaranteeDays?: number;
  purchaseDate?: string;
  totalMissions?: number;
  totalFlownTime?: number;
  totalFlownMeters?: number;
  clientName?: string;
  factoryType?: string;
  factorySerie?: string;
  factoryModel?: string;
  maintenanceLogbook?: string;
}

export interface ToolModel {
  id: number;
  toolTypeId: number;
  code: string;
  name: string;
  manufacturer: string;
  serie: string;
  model: string;
  description?: string;
  specifications?: any;
  active: string;
}

export interface ToolComponent {
  id: number;
  toolId: number;
  modelId?: number;
  type: string;
  serialNumber: string;
  status: string;
  activationDate?: string;
  purchaseDate?: string;
  vendor?: string;
  guaranteeDays?: number;
  cycles?: number;
  totalCycles?: number;
  factorySerie?: string;
  factoryModel?: string;
}

export interface Client {
  id: number;
  name: string;
  code: string;
}
export interface ToolsResponse {
  tool_id: number;
  fk_owner_id: number;
  fk_client_id: number | null;
  fk_tool_model_id: number | null;
  tool_code: string;
  tool_serialnumber: string | null;
  tool_desc: string | null;
  tool_status: string;                 
  active: string;                      
  date_activation: string | null;
  client_name: string;
  factory_type: string;                
  factory_serie: string;              
  factory_model: string;              
  tool_ccPlatform: string;
  tool_latitude: number | null;
  tool_longitude: number | null;
  tool_streaming_type: string;
  tool_streaming_url: string;
  tool_gcs_type: string;
  tool_vendor: string;
  tool_guarantee_day: number | null;
  tool_purchase_date: string | null;
  tot_mission: number;
  tot_flown_time: number;              
  tot_flown_meter: number;             
  tool_maintenance_logbook: string;    
  button_show?: string;
  button_status_update?: string;
  button_delete?: string;
}
export type ToolStatus =
  | "OPERATIONAL"
  | "NOT_OPERATIONAL"
  | "MAINTENANCE"
  | "DECOMMISSIONED";

export interface ToolModel {
  tool_model_id: number;
  owner_id: number;
  factory_type: string | null;
  factory_name: string | null;
  factory_serie: string | null;
  factory_model: string | null;
}

export interface ToolComponent {
  tool_component_id: number;
  fk_owner_id: number;
  fk_tool_id: number;
  fk_tool_model_id: number | null;
  component_type: string;
  component_sn: string;
  component_status: ToolStatus;
  component_purchase_date: string | null;
  component_activation_date: string | null;
  component_vendor: string | null;
  component_guarantee_day: number;
  component_cycles: number;
  component_total_cycles: number;
  factory_type?: string | null;
  factory_serie?: string | null;
  factory_model?: string | null;
}

export interface Client {
  client_id: number;
  owner_id: number;
  client_name: string;
  client_code: string | null;
}


export interface ToolListParams {
  ownerId: number;
  clientId?: number;
  active?: "Y" | "N" | "ALL";
  status?: ToolStatus | "ALL";
  statusCode?: string;
  toolTypeId?: number;
}

export interface ApiResponse<T> {
  code: number;         
  message: string;
  dataRows: number;
  data: T;
}

export interface MapFilters {
  status: string;           
  clientId: string;        
  search: string;
  onlyDock: boolean;
  onlyInstalled: boolean;
}
export interface MapFiltersType {
  status: string;
  clientId: string;
  search: string;
  onlyDock: boolean;
  onlyInstalled: boolean;
}

export interface ControlCenter {
  lat: number;
  lon: number;
  label: string;
}
export interface ToolMapRow {
  tool_id: number;

  fk_owner_id?: number;
  fk_tool_type_id?: number;
  fk_model_id?: number | null;
  fk_status_id?: number | null;
  fk_client_id?: number | null;
  tool_code?: string | null;
  tool_name?: string | null;
  tool_desc?: string | null;
  tool_description?: string | null;
  tool_active?: "Y" | "N";
  active?: "Y" | "N";

  tool_serialnumber?: string | null;
  tool_serial_number?: string | null;

  tool_latitude?: number | null;
  tool_longitude?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;

  tool_status?: string | null;
  status_code?: string | null;
  status_name?: string | null;
  status_color?: string | null;

  fk_tool_model_id?: number | null;
  factory_type?: string | null;
  factory_serie?: string | null;
  factory_model?: string | null;

  model_code?: string | null;
  model_name?: string | null;
  manufacturer?: string | null;

  tool_type_code?: string | null;
  tool_type_name?: string | null;
  tool_type_category?: string | null;

  client_id?: number | null;
  client_name?: string | null;
  client_code?: string | null;

  tool_ccPlatform?: string | null;
  cc_platform?: string | null;
  tool_gcs_type?: string | null;
  gcs_type?: string | null;
  tool_streaming_type?: string | null;
  streaming_type?: string | null;
  tool_streaming_url?: string | null;
  streaming_url?: string | null;
  tool_vendor?: string | null;
  vendor?: string | null;
  tool_guarantee_day?: number | null;
  guarantee_days?: number | null;

  date_activation?: string | null;
  activation_date?: string | null;
  tool_purchase_date?: string | null;
  purchase_date?: string | null;
  warranty_expiry?: string | null;
  last_calibration_date?: string | null;
  next_calibration_date?: string | null;
  purchase_price?: number | null;

  tot_mission?: number | null;
  tot_flown_time?: number | null;
  tot_flown_meter?: number | null;

  tool_metadata?: {
    latitude?: number;
    longitude?: number;
    gcs_type?: string;
    cc_platform?: string;
    streaming_type?: string;
    streaming_url?: string;
    fk_client_id?: number;
    tot_mission?: number;
    tot_flown_time?: number;
    tot_flown_meter?: number;
    [key: string]: unknown;
  } | null;

  created_at?: string;
  updated_at?: string;

}