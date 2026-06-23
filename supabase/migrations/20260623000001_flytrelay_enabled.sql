-- Add flytrelay_enabled column to owner table
ALTER TABLE owner ADD COLUMN flytrelay_enabled BOOLEAN DEFAULT FALSE;
