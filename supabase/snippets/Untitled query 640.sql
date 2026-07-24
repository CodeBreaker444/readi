ALTER TABLE public.d_flight_integrations 
ADD COLUMN IF NOT EXISTS pfx_content TEXT,
ADD COLUMN IF NOT EXISTS pfx_password VARCHAR(500);