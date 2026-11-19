CREATE TABLE IF NOT EXISTS public.weather_tile (
  tile_id           SERIAL PRIMARY KEY,
  layer             VARCHAR(20) NOT NULL,
  z                 SMALLINT NOT NULL,
  x                 INTEGER NOT NULL,
  y                 INTEGER NOT NULL,
  data              BYTEA NOT NULL,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_weather_tile UNIQUE (layer, z, x, y)
);
CREATE INDEX IF NOT EXISTS idx_weather_tile_last_requested ON public.weather_tile (last_requested_at);
ALTER TABLE public.weather_tile ENABLE ROW LEVEL SECURITY;
