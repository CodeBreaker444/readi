ALTER TABLE public.flight_requests
  ADD COLUMN IF NOT EXISTS zone_validated boolean NULL,
  ADD COLUMN IF NOT EXISTS fk_matched_tool_id integer NULL
    REFERENCES public.tool(tool_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS zone_check jsonb NULL;

CREATE INDEX IF NOT EXISTS idx_flight_requests_matched_tool
  ON public.flight_requests (fk_matched_tool_id);
