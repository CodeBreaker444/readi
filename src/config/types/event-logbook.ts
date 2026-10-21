/** Event types are defined per company (pilot_event_type); events store the type's code. */
export type EventType = string;

export interface EventTypeItem {
  event_type_id: number;
  type_code: string;
  type_name: string;
  /** Client this type belongs to; null = default type, available for every client. */
  client_id: number | null;
  client_name: string | null;
  /** Reported events using this type; shown before deleting. */
  event_count: number;
}

export const EVENT_TYPE_NAME_MAX = 100;
export const EVENT_TYPE_CODE_MAX = 50;

/** Slug stored on events, e.g. "Bird strike!" -> "bird_strike". */
export function slugifyEventTypeCode(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, EVENT_TYPE_CODE_MAX);
}

/** Label for a code whose type no longer exists ("bird_strike" -> "Bird strike"). */
export function prettifyEventTypeCode(code: string): string {
  const spaced = code.replace(/_+/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : code;
}

export const EVENT_ATTACHMENT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'video/mp4', 'application/pdf'];
export const EVENT_ATTACHMENT_MAX_BYTES = 100 * 1024 * 1024;
export const EVENT_ATTACHMENT_MAX_FILES = 10;
export const EVENT_NOTES_MAX = 500;

/** Supporting media (added to an event after it was reported) are images and videos only. */
export const EVENT_SUPPORT_MEDIA_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
export const EVENT_SUPPORT_MEDIA_MAX_FILES = 20;
export const EVENT_SUPPORT_MEDIA_MAX_PER_UPLOAD = 10;

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
  event_type: EventType;
  event_type_label: string;
  takeoff_time: string;
  created_at: string;
  pilot_user_id: number;
  pilot_name: string | null;
  tool_id: number;
  tool_name: string | null;
  mission_id: number | null;
  mission_name: string | null;
  client_id: number | null;
  client_name: string | null;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  notes: string | null;
  attachment_count: number;
}

export interface EventAttachmentLink {
  attachment_id: number;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  /** Inline link, used for previews and "open". */
  url: string;
  /** Link that forces a download. */
  download_url: string;
  /** True for supporting media added after the event was reported. */
  is_supporting: boolean;
}

export interface EventDetail extends EventLogbookItem {
  tool_code: string | null;
  /** Emails notified when the event was reported; empty in the client portal. */
  notify_emails: string[];
  /** Outline of the mission plan, when the mission has one. */
  plan: { code: string | null; waypoints: EventLatLng[] } | null;
  attachments: EventAttachmentLink[];
  can_edit: boolean;
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
