-- Add flytrelay_access column to public_users table
-- This column controls whether a specific user has access to flytrelay flight logs
-- Only effective if the company (owner) also has flytrelay_enabled = true
ALTER TABLE public_users ADD COLUMN flytrelay_access BOOLEAN DEFAULT FALSE;
