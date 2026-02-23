export interface Notification {
  notification_id: number;
  message: string;
  procedure_name: string;
  is_read: "Y" | "N";
  created_at: string;
  read_at: string | null;
  sender_fullname: string | null;
  sender_profile: string | null;
  sender_profile_code: string | null;
  communication_general_id: number | null;
}

export interface NotificationListFilters {
  status?: "READ" | "UNREAD" | "";
  procedure_name?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export interface MarkReadPayload {
  notification_id: number;
}

export interface DeletePayload {
  notification_id: number;
  user_id: number;
}

export interface MarkAllReadPayload {
  user_id: number;
}
 