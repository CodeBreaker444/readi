export interface AiDetection {
  track_id: number;
  class_name: string;
  confidence: number;
  bounding_box: number[];
}

export interface AiEventItem {
  ai_event_id: number;
  event_type: string;
  event_label: string;
  stream_id: string;
  session_id: string;
  /** null for events stored before the model sent a track id. */
  track_id: number | null;
  class_name: string | null;
  confidence: number | null;
  event_time: string;
  frame_number: number | null;
  bounding_box: number[];
  frames_detected: number | null;
  processing_time_ms: number | null;
  model_mode: string | null;
  /** stored | failed (the model reported no finished upload) | none / pending (older rows) */
  snapshot_status: string;
  /** Short-lived presigned URL of the AI-processed image (boxes drawn by the model). */
  snapshot_url: string | null;
  /** Short-lived presigned URL of the original frame. */
  original_url: string | null;
  /** Size of the original frame; the bounding boxes are in this coordinate space. */
  original_size: { width: number; height: number } | null;
  /** Every object tracked in the frame. */
  detections: AiDetection[];
  notify_status: string;
  notified_emails: string[];
  /** The client the stream pointed to when this event arrived. Changing the stream's client later does not change it. */
  client_name: string | null;
  /**
   * Whether the stream had alerts set up (a client or at least one contact) when this event arrived.
   * Also a snapshot: it does not follow later changes.
   */
  linked: boolean;
  /** Super admin view only: the company that added this event's stream id; null when unclaimed. */
  company_name: string | null;
  /** Super admin view only. */
  claimed: boolean;
}

export interface AiCompanyOption {
  owner_id: number;
  name: string;
}

export interface AiEventListResult {
  data: AiEventItem[];
  total: number;
  page: number;
  page_size: number;
  /** "all" for super admins (every event of the platform), "company" for everyone else. */
  scope: 'all' | 'company';
  /** Super admin only: companies that added at least one stream id, for the filter dropdown. */
  companies: AiCompanyOption[];
}

export interface AiStreamMappingItem {
  mapping_id: number;
  stream_id: string;
  /** Optional notification settings. */
  fk_client_id: number | null;
  client_name: string | null;
  contact_ids: number[];
  /** Whether the client's own email address is a recipient besides the contacts. */
  notify_client: boolean;
  /** false pauses the alert emails; the stream's events stay visible. */
  is_active: boolean;
}
