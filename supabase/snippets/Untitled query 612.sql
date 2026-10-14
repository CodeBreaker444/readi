DELETE FROM notification WHERE notification_type = 'MAINTENANCE' AND created_at::date = CURRENT_DATE;
