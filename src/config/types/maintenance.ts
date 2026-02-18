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