export interface AiDetection {
  track_id: number;
  class_name: string;
  confidence: number;
  bounding_box: number[];
}

export type AiEventActionType = 'acknowledged' | 'resolved';

export type AiEventStatus = 'open' | AiEventActionType;

export interface AiEventAction {
  action_id: number;
  action: AiEventActionType;
  comment: string | null;
  user_email: string;
  created_at: string;
}

export type AiFeedbackType = 'false_positive' | 'false_negative';

export interface AiFeedbackAttachment {
  key: string;
  name: string;
  type: string;
  size: number;
  url: string | null;
  download_url: string | null;
}

export interface AiEventFeedback {
  feedback_type: AiFeedbackType;
  comment: string | null;
  attachments: AiFeedbackAttachment[];
  user_email: string;
  updated_at: string;
}

export interface AiEventItem {
  ai_event_id: number;
  event_type: string;
  event_label: string;
  stream_id: string;
  session_id: string;
  track_id: number | null;
  class_name: string | null;
  confidence: number | null;
  event_time: string;
  frame_number: number | null;
  bounding_box: number[];
  frames_detected: number | null;
  processing_time_ms: number | null;
  model_mode: string | null;
  snapshot_status: string;
  snapshot_url: string | null;
  original_url: string | null;
  original_size: { width: number; height: number } | null;
  detections: AiDetection[];
  notify_status: string;
  notified_emails: string[];
  client_name: string | null;
  linked: boolean;
  status: AiEventStatus;
  /** Acknowledge / resolve history, oldest first. */
  actions: AiEventAction[];
  /** Detection feedback  */
  feedback: AiEventFeedback | null;
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
  scope: 'all' | 'company';
  companies: AiCompanyOption[];
}

export interface AiStreamMappingItem {
  mapping_id: number;
  stream_id: string;
  fk_client_id: number | null;
  client_name: string | null;
  contact_ids: number[];
  notify_client: boolean;
  is_active: boolean;
}
