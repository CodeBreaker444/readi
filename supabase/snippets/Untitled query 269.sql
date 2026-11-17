ALTER TABLE public.slot_group ADD COLUMN IF NOT EXISTS timezone VARCHAR(64);

ALTER TABLE public.slot_group ADD COLUMN IF NOT EXISTS approval_reminded_on DATE;
