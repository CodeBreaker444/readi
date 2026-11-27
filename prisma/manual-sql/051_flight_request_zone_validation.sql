-- Flight requests from clients are checked against the operation zones of the
-- client's systems when they arrive.
--   zone_validated      true  = inside the zones of at least one client system
--                       false = outside every system's zones (request auto-rejected)
--                       null  = not checked (no coordinates, no client, or no system with zones)
--   fk_matched_tool_id  the closest system whose zones cover the requested location
--   zone_check          details shown to the OPM (system code, distance, reason)
ALTER TABLE public.flight_requests
  ADD COLUMN IF NOT EXISTS zone_validated boolean NULL,
  ADD COLUMN IF NOT EXISTS fk_matched_tool_id integer NULL
    REFERENCES public.tool(tool_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS zone_check jsonb NULL;

CREATE INDEX IF NOT EXISTS idx_flight_requests_matched_tool
  ON public.flight_requests (fk_matched_tool_id);
