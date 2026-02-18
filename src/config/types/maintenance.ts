export type MaintenanceStatus = "OK" | "ALERT" | "DUE";

export interface MaintenanceModel {
  factory_type: string | null;
  factory_serie: string | null;
  factory_model: string | null;
  maintenance_cycle_hour: number;
  maintenance_cycle_flight: number;
  maintenance_cycle_day: number;
}

export interface MaintenanceComponent {
  tool_component_id: number;
  component_type: string | null;
  serial_number: string | null;
  last_maintenance: string | null;
  total_hours: number;
  total_flights: number;
  status: MaintenanceStatus;
  trigger: (string | null)[];    
  model: MaintenanceModel;
}

export interface MaintenanceDrone {
  tool_id: number;
  code: string;
  serial_number: string | null;
  last_maintenance: string | null;
  total_hours: number;
  total_flights: number;
  status: MaintenanceStatus;
  trigger: (string | null)[];    
  model: MaintenanceModel;
  components: MaintenanceComponent[];
}

export interface MaintenanceDashboardQuery {
  owner_id: number;
  client_id: number;
  threshold_alert: number;
}

export interface MaintenanceDashboardResponse {
  code: number;
  message: string;
  dataRows: number;
  data: MaintenanceDrone[];
}


export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
export type TicketPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TicketType = 'BASIC' | 'STANDARD' | 'EXTRAORDINARY';
export type EntityType = 'AIRCRAFT' | 'COMPONENT';

export interface MaintenanceTicket {
  ticket_id: number;
  fk_owner_id: number;
  fk_tool_id: number;
  fk_component_id?: number | null;
  entity_type: EntityType;
  ticket_type: TicketType;
  ticket_status: TicketStatus;
  ticket_priority: TicketPriority;
  assigned_to_user_id?: number | null;
  opened_by: string;
  opened_at: string;
  closed_at?: string | null;
  trigger_params?: string | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
  drone_code?: string;
  drone_serial?: string;
  drone_model?: string;
  component_sn?: string;
  entity_name?: string;
  assigner_name?: string;
  assigner_email?: string;
}

export interface TicketEvent {
  event_id: number;
  fk_ticket_id: number;
  event_type: string;
  event_message: string;
  created_at: string;
  created_by?: string;
}

export interface TicketReport {
  report_id?: number;
  ticket_id: number;
  report_text: string;
  work_start?: string;
  work_end?: string;
  report_by: string;
  close_report?: string;
}

export interface TicketAttachment {
  attachment_id: number;
  fk_ticket_id: number;
  file_name: string;
  file_path: string;
  attachment_desc?: string;
  uploaded_by: string;
  uploaded_at: string;
}


export interface CreateTicketPayload {
  fk_owner_id: number;
  fk_tool_id: number;
  components?: number[];
  type: TicketType;
  priority: TicketPriority;
  opened_by: string;
  fk_user_id: number;
  assigned_to?: number;
  note?: string;
}

export interface CloseTicketPayload {
  ticket_id: number;
  note?: string;
  closed_by?: number;
}

export interface AssignTicketPayload {
  ticket_id: number;
  assigned_to: number;
}

export interface AddReportPayload {
  ticket_id: number;
  report_text: string;
  work_start?: string;
  work_end?: string;
  report_by: string;
  close_report?: string;
}

export interface UploadAttachmentPayload {
  ticket_id: number;
  attachment_desc?: string;
  uploaded_by: string;
}

export interface DroneOption {
  tool_id: number;
  tool_code: string;
  tool_desc: string;
  tool_status: string;
}

export interface ComponentOption {
  tool_component_id: number;
  component_type: string;
  component_sn: string;
}

export interface UserOption {
  user_id: number;
  fullname: string;
  email: string;
  user_profile: string;
}

 
export interface ReportForm {
  text: string;
  work_start: string;
  work_end: string;
  close: boolean;
}
export interface NewTicketForm {
  fk_tool_id: number;
  components: number[];
  type: TicketType;
  priority: TicketPriority;
  assigned_to: number;
  note: string;
}