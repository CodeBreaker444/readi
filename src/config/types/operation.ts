export type OperationStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ABORTED';

export interface Operation {
  pilot_mission_id: number;
  mission_code: string;
  mission_name: string;
  mission_description: string | null;
  scheduled_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  flight_duration: number | null;
  location: string | null;
  distance_flown: number | null;
  max_altitude: number | null;
  notes: string | null;
  fk_pilot_user_id: number;
  fk_tool_id: number | null;
  fk_mission_status_id: number | null;
  fk_planning_id: number | null;
  pilot_name?: string;
  tool_code?: string;
  status_name?: string;
  attachment_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ListOperationsQuerySchema {
  page: number;
  pageSize: number;
  status?: string;
  search?: string;
  pilot_id?: number;
  date_start?: string;
  date_end?: string;
}
export type CreateOperationSchema = {
  mission_code: string;
  mission_name: string;
  mission_description?: string | null;
  status_name: string;
  scheduled_start?: string | null;  
  location?: string | null;
  notes?: string | null;
  fk_pilot_user_id: number;
  fk_tool_id?: number | null;
  fk_planning_id?: number | null;
};
export type UpdateOperationSchema = {
  mission_code?: string;
  mission_name?: string;
  mission_description?: string | null;
  scheduled_start?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  flight_duration?: number | null;  
  location?: string | null;
  notes?: string | null;
  fk_pilot_user_id?: number;
  fk_tool_id?: number | null;
  fk_planning_id?: number | null;
  fk_mission_status_id?: number;
  distance_flown?: number | null;
  max_altitude?: number | null;
};
export interface OperationAttachment {
  attachment_id: number;
  fk_ticket_id: number;
  file_name: string;
  file_key: string;
  file_type: string | null;
  file_size: number | null;
  file_description: string | null;
  s3_bucket: string;
  s3_region: string;
  s3_url: string;
  uploaded_by: string | null;
  uploaded_at: string;
  download_url?: string;
}

export interface CreateOperationInput {
  mission_code: string;
  mission_name: string;
  mission_description?: string;
  scheduled_start?: string;
  location?: string;
  notes?: string;
  fk_pilot_user_id: number;
  fk_tool_id?: number;
  fk_planning_id?: number;
}

export interface UpdateOperationInput extends Partial<CreateOperationInput> {
  actual_start?: string;
  actual_end?: string;
  flight_duration?: number;
  distance_flown?: number;
  max_altitude?: number;
  fk_mission_status_id?: number;
}

export interface OperationsListResponse {
  data: Operation[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AttachmentUploadResponse {
  attachment: OperationAttachment;
  presignedDownloadUrl: string;
}

export interface PilotOption {
  user_id: number;
  first_name: string;
  last_name: string;
}

export interface ToolOption {
  tool_id: number;
  tool_name: string;
  tool_code: string;
}