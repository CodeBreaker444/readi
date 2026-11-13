CREATE TABLE IF NOT EXISTS public.weather_forecast (
  forecast_id       SERIAL PRIMARY KEY,
  cache_key         VARCHAR(40) NOT NULL,
  latitude          DOUBLE PRECISION NOT NULL,
  longitude         DOUBLE PRECISION NOT NULL,
  data              JSONB NOT NULL,
  fetched_at        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  last_requested_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_weather_forecast_key ON public.weather_forecast (cache_key);
CREATE INDEX IF NOT EXISTS idx_weather_forecast_last_requested ON public.weather_forecast (last_requested_at);
ALTER TABLE public.weather_forecast ENABLE ROW LEVEL SECURITY;
