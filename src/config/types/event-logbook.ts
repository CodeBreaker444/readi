export const EVENT_TYPES = [
  'equipment_malfunction',
  'gps_signal_issue',
  'obstacle_detected',
  'weather_related',
  'bird_activity',
  'unexpected_landing',
  'flyaway_loss_of_control',
  'other',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  equipment_malfunction: 'Equipment malfunction',
  gps_signal_issue: 'GPS signal issue',
  obstacle_detected: 'Obstacle detected',
  weather_related: 'Weather-related',
  bird_activity: 'Bird activity',
  unexpected_landing: 'Unexpected landing',
  flyaway_loss_of_control: 'Fly-away / Loss of control',
  other: 'Other',
};

export const EVENT_ATTACHMENT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'video/mp4', 'application/pdf'];
export const EVENT_ATTACHMENT_MAX_BYTES = 100 * 1024 * 1024;
export const EVENT_ATTACHMENT_MAX_FILES = 10;
export const EVENT_NOTES_MAX = 500;

export interface EventDroneComponent {
  component_name: string;
  component_code: string | null;
  serial_number: string;
}

export interface EventClientInfo {
  client_id: number;
  client_name: string;
  client_code: string | null;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
}

export interface EventDroneOption {
  tool_id: number;
  tool_name: string | null;
  tool_code: string | null;
  /** DRONE-type components of the system, primary first (same ordering as mission creation). */
  drone_components: EventDroneComponent[];
  /** Client the system is assigned to; used when the selected mission has no client. */
  assigned_client: EventClientInfo | null;
  /** Where the system is based (from the system's location); used to zoom the event map. */
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
}

export interface EventLatLng {
  lat: number;
  lng: number;
}

/** Mission plan (planning logbook) attached to a mission; waypoints outline the planned area. */
export interface EventMissionPlan {
  plan_id: number;
  code: string | null;
  description: string | null;
  waypoints: EventLatLng[];
}

export type EventMissionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ABORTED';

export interface EventMissionOption {
  /** Canonical status; null when the stored status is not recognised (then status_name is shown as-is). */
  status_code: EventMissionStatus | null;
  pilot_mission_id: number;
  mission_name: string | null;
  mission_code: string | null;
  fk_tool_id: number | null;
  scheduled_start: string | null;
  client: EventClientInfo | null;
  /** True while the mission is neither completed, cancelled nor aborted. */
  is_active: boolean;
  status_name: string | null;
  operation_type: string | null;
  category: string | null;
  location: string | null;
  /** Mission plan, when the mission has one. */
  plan: EventMissionPlan | null;
}

export interface EventLogbookItem {
  event_id: number;
  event_type: EventType | string;
  takeoff_time: string;
  created_at: string;
  pilot_user_id: number;
  pilot_name: string | null;
  tool_id: number;
  tool_name: string | null;
  mission_id: number | null;
  mission_name: string | null;
  client_name: string | null;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  notes: string | null;
  attachment_count: number;
}

export interface EventAttachmentInput {
  file_name: string;
  file_key: string;
  file_type: string;
  file_size: number;
}

export interface EventLogbookFilters {
  tool_id?: number;
  mission_id?: number;
  event_type?: string;
  date_start?: string;
  date_end?: string;
}

export interface EventWebhookConfigItem {
  webhook_id: number;
  name: string;
  url: string;
  fk_client_id: number | null;
  client_name: string | null;
  event_types: string[];
  is_active: boolean;
  created_at: string;
  last_delivery: { success: boolean; response_status: number | null; created_at: string } | null;
}

export interface EventWebhookDeliveryItem {
  delivery_id: number;
  fk_event_id: number | null;
  is_test: boolean;
  success: boolean;
  response_status: number | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

/**
 * Display label for a mission. Names are frequently empty strings (not null) and
 * sometimes just repeat the code, so the code leads and the name is appended only
 * when it adds information.
 */
export function formatMissionLabel(
  mission: { mission_name?: string | null; mission_code?: string | null },
  fallbackId?: number | null,
): string {
  const code = mission.mission_code?.trim();
  const name = mission.mission_name?.trim();
  if (code && name && name !== code) return `${code} · ${name}`;
  return code || name || (fallbackId != null ? `#${fallbackId}` : '—');
}

/** Primary drone component line: "<component code> – <serial>", or null when the system has none. */
export function droneComponentLine(d: { drone_components?: EventDroneComponent[] }): string | null {
  const primary = d.drone_components?.[0];
  return primary ? `${primary.component_code || primary.component_name} – ${primary.serial_number}` : null;
}

export function formatDroneLabel(d: Pick<EventDroneOption, 'tool_id' | 'tool_name' | 'tool_code'>): string {
  return d.tool_name?.trim() || d.tool_code?.trim() || `#${d.tool_id}`;
}

/** Contact-book entry that can be picked as an email recipient of a reported event. */
export interface EventNotifyContact {
  contact_id: number;
  name: string;
  company: string | null;
  email: string;
}
