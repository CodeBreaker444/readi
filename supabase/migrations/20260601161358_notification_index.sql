CREATE INDEX IF NOT EXISTS idx_notification_user_read_created
  ON notification (fk_user_id, is_read, created_at DESC);
