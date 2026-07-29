-- Add daily email limit fields to owner table
-- Migration: 004_daily_email_limit
-- Description: Add daily email limit tracking for each company

-- Add daily_email_limit field (default 100, NOT NULL)
ALTER TABLE public.owner 
ADD COLUMN IF NOT EXISTS daily_email_limit INTEGER NOT NULL DEFAULT 100;

-- Add daily_email_count field (default 0, NOT NULL)
ALTER TABLE public.owner 
ADD COLUMN IF NOT EXISTS daily_email_count INTEGER NOT NULL DEFAULT 0;

-- Add daily_email_count_reset_date field to track when counter was last reset
ALTER TABLE public.owner 
ADD COLUMN IF NOT EXISTS daily_email_count_reset_date DATE;

-- Add email_limit_notification_sent_date field to track when notification was last sent
ALTER TABLE public.owner 
ADD COLUMN IF NOT EXISTS email_limit_notification_sent_date DATE;

-- Initialize daily_email_count_reset_date to today for existing records
UPDATE public.owner 
SET daily_email_count_reset_date = CURRENT_DATE 
WHERE daily_email_count_reset_date IS NULL;

-- Add comment to document the fields
COMMENT ON COLUMN public.owner.daily_email_limit IS 'Maximum number of emails allowed per day for this company (default: 100)';
COMMENT ON COLUMN public.owner.daily_email_count IS 'Counter for emails sent today (resets at midnight)';
COMMENT ON COLUMN public.owner.daily_email_count_reset_date IS 'Date when the daily email counter was last reset';
COMMENT ON COLUMN public.owner.email_limit_notification_sent_date IS 'Date when the email limit reached notification was last sent to admins';
