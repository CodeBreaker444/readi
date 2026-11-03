ALTER TABLE public.event_contact
  ADD COLUMN IF NOT EXISTS fk_client_id INTEGER REFERENCES public.client(client_id) ON DELETE SET NULL;

-- One-time best effort: link contacts whose old company text equals one of the owner's client names.
UPDATE public.event_contact ec
SET fk_client_id = c.client_id,
    company      = NULL
FROM public.client c
WHERE ec.fk_client_id IS NULL
  AND ec.company IS NOT NULL
  AND c.fk_owner_id = ec.fk_owner_id
  AND lower(trim(c.client_name)) = lower(trim(ec.company));
