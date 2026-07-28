-- Remove license_plate column (DRC serves the same purpose)
-- Drop the index first
DROP INDEX IF EXISTS idx_tool_component_license_plate;

-- Remove the license_plate column from tool_component table
ALTER TABLE public.tool_component 
  DROP COLUMN IF EXISTS license_plate;

-- Clean up certifications JSON to remove enac_authorizations (keeping only sts_declarations)
-- This updates existing records to remove the enac_authorizations field from the certifications JSON
UPDATE public.tool_component 
SET certifications = 
  CASE 
    WHEN certifications IS NOT NULL THEN
      (certifications - 'enac_authorizations')
    ELSE 
      NULL 
  END
WHERE certifications ? 'enac_authorizations';

-- If certifications JSON is now empty after removing enac_authorizations, set it to NULL
UPDATE public.tool_component 
SET certifications = NULL
WHERE certifications = '{}'::jsonb;
