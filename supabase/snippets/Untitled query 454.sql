-- fk_owner_id should be Int, matching owner.owner_id
ALTER TABLE emergency_response_plan
  ALTER COLUMN fk_owner_id TYPE integer USING fk_owner_id::integer;

-- fk_erp_id should be BigInt, matching emergency_response_plan.erp_id
ALTER TABLE erp_location_group_contact
  ALTER COLUMN fk_erp_id TYPE bigint USING fk_erp_id::bigint;

-- -- Module Email Notification Configuration Schema
-- -- This table allows granular control over email notifications for each module's events

-- Create the main configuration table
CREATE TABLE module_email_notification_config (
  config_id SERIAL PRIMARY KEY,
  fk_owner_id INTEGER NOT NULL,
  module_name VARCHAR(50) NOT NULL, -- e.g., 'maintenance', 'operations', 'flight_requests', etc.
  event_type VARCHAR(100) NOT NULL, -- e.g., 'ticket_created', 'ticket_closed', 'maintenance_alert', 'ticket_assigned'
  is_enabled BOOLEAN DEFAULT false,
  notification_roles TEXT[], -- e.g., '{OPM,ADMIN,RM,TECHNICIAN}'
  notification_user_ids INTEGER[], -- specific user IDs who should receive notifications
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_module_event_per_owner UNIQUE (fk_owner_id, module_name, event_type)
);

-- Create indexes for performance
CREATE INDEX idx_menc_owner ON module_email_notification_config(fk_owner_id);
CREATE INDEX idx_menc_module ON module_email_notification_config(module_name);
CREATE INDEX idx_menc_enabled ON module_email_notification_config(is_enabled) WHERE is_enabled = true;

-- Add foreign key constraint to owner table
ALTER TABLE module_email_notification_config 
ADD CONSTRAINT fk_menc_owner 
FOREIGN KEY (fk_owner_id) REFERENCES owner(owner_id) ON DELETE CASCADE;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_module_email_notification_config_updated_at 
BEFORE UPDATE ON module_email_notification_config 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed data for Maintenance module events
-- These are the common events in the maintenance module that can trigger email notifications

INSERT INTO module_email_notification_config (fk_owner_id, module_name, event_type, is_enabled, notification_roles, notification_user_ids) 
SELECT 
  owner_id, 
  'maintenance', 
  'ticket_created', 
  false, 
  ARRAY['OPM', 'ADMIN'], 
  ARRAY[]::INTEGER[]
FROM owner;

INSERT INTO module_email_notification_config (fk_owner_id, module_name, event_type, is_enabled, notification_roles, notification_user_ids) 
SELECT 
  owner_id, 
  'maintenance', 
  'ticket_closed', 
  false, 
  ARRAY['OPM', 'ADMIN'], 
  ARRAY[]::INTEGER[]
FROM owner;

INSERT INTO module_email_notification_config (fk_owner_id, module_name, event_type, is_enabled, notification_roles, notification_user_ids) 
SELECT 
  owner_id, 
  'maintenance', 
  'ticket_assigned', 
  false, 
  ARRAY['OPM', 'ADMIN', 'TECHNICIAN'], 
  ARRAY[]::INTEGER[]
FROM owner;

INSERT INTO module_email_notification_config (fk_owner_id, module_name, event_type, is_enabled, notification_roles, notification_user_ids) 
SELECT 
  owner_id, 
  'maintenance', 
  'maintenance_alert', 
  false, 
  ARRAY['OPM', 'ADMIN', 'RM'], 
  ARRAY[]::INTEGER[]
FROM owner;

INSERT INTO module_email_notification_config (fk_owner_id, module_name, event_type, is_enabled, notification_roles, notification_user_ids) 
SELECT 
  owner_id, 
  'maintenance', 
  'maintenance_due', 
  false, 
  ARRAY['OPM', 'ADMIN', 'RM'], 
  ARRAY[]::INTEGER[]
FROM owner;

INSERT INTO module_email_notification_config (fk_owner_id, module_name, event_type, is_enabled, notification_roles, notification_user_ids) 
SELECT 
  owner_id, 
  'maintenance', 
  'intervention_started', 
  false, 
  ARRAY['OPM', 'ADMIN'], 
  ARRAY[]::INTEGER[]
FROM owner;

INSERT INTO module_email_notification_config (fk_owner_id, module_name, event_type, is_enabled, notification_roles, notification_user_ids) 
SELECT 
  owner_id, 
  'maintenance', 
  'intervention_ended', 
  false, 
  ARRAY['OPM', 'ADMIN'], 
  ARRAY[]::INTEGER[]
FROM owner;

-- Add comment to document the table
COMMENT ON TABLE module_email_notification_config IS 'Stores email notification configuration for each module and event type per company/owner';
COMMENT ON COLUMN module_email_notification_config.module_name IS 'The module name (e.g., maintenance, operations, flight_requests)';
COMMENT ON COLUMN module_email_notification_config.event_type IS 'The specific event within the module (e.g., ticket_created, ticket_closed)';
COMMENT ON COLUMN module_email_notification_config.notification_roles IS 'Array of user roles that should receive email notifications for this event';
COMMENT ON COLUMN module_email_notification_config.notification_user_ids IS 'Array of specific user IDs that should receive email notifications for this event';
