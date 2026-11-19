
CREATE TABLE IF NOT EXISTS public.slot_group (
  slot_group_id SERIAL PRIMARY KEY,
  fk_owner_id   INTEGER NOT NULL REFERENCES public.owner(owner_id) ON DELETE CASCADE,
  name          VARCHAR(150) NOT NULL,
  description   VARCHAR(500),
  slot_mode     VARCHAR(10) NOT NULL CHECK (slot_mode IN ('HOURLY', 'SHIFT')),
  hour_start    SMALLINT NOT NULL DEFAULT 6,
  hour_end      SMALLINT NOT NULL DEFAULT 22,
  range_mode    VARCHAR(10) NOT NULL CHECK (range_mode IN ('DAY', 'WEEK', 'TWO_WEEKS')),
  start_date    DATE NOT NULL,
  is_blocked    BOOLEAN NOT NULL DEFAULT false,
  -- 0 = Sunday … 6 = Saturday
  approval_days SMALLINT[] NOT NULL DEFAULT '{}',
  created_by    INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at    TIMESTAMP(6) NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_slot_group_owner ON public.slot_group (fk_owner_id, start_date DESC);

CREATE TABLE IF NOT EXISTS public.slot (
  slot_id          SERIAL PRIMARY KEY,
  fk_slot_group_id INTEGER NOT NULL REFERENCES public.slot_group(slot_group_id) ON DELETE CASCADE,
  slot_date        DATE NOT NULL,
  start_time       VARCHAR(5) NOT NULL,
  end_time         VARCHAR(5) NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  updated_at       TIMESTAMP(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_slot_group_date ON public.slot (fk_slot_group_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_slot_date ON public.slot (slot_date);

CREATE TABLE IF NOT EXISTS public.slot_booking (
  booking_id       SERIAL PRIMARY KEY,
  fk_slot_id       INTEGER NOT NULL REFERENCES public.slot(slot_id) ON DELETE CASCADE,
  fk_slot_group_id INTEGER NOT NULL REFERENCES public.slot_group(slot_group_id) ON DELETE CASCADE,
  fk_pilot_user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  status           VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  requested_at     TIMESTAMP(6) NOT NULL DEFAULT now(),
  decided_at       TIMESTAMP(6),
  decided_by       INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
  decision_note    VARCHAR(500),
  pdf_file_key     TEXT,
  pdf_file_name    VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_slot_booking_slot ON public.slot_booking (fk_slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_booking_group ON public.slot_booking (fk_slot_group_id, status);
CREATE INDEX IF NOT EXISTS idx_slot_booking_pilot ON public.slot_booking (fk_pilot_user_id, status);
-- A pilot can hold only one live (non-rejected) request per slot.
CREATE UNIQUE INDEX IF NOT EXISTS uq_slot_booking_live ON public.slot_booking (fk_slot_id, fk_pilot_user_id) WHERE status <> 'REJECTED';
-- At most one approved pilot per slot.
CREATE UNIQUE INDEX IF NOT EXISTS uq_slot_booking_approved ON public.slot_booking (fk_slot_id) WHERE status = 'APPROVED';

-- Company-wide defaults that pre-fill every new slot group.
CREATE TABLE IF NOT EXISTS public.slot_settings (
  fk_owner_id   INTEGER PRIMARY KEY REFERENCES public.owner(owner_id) ON DELETE CASCADE,
  slot_mode     VARCHAR(10) NOT NULL DEFAULT 'SHIFT' CHECK (slot_mode IN ('HOURLY', 'SHIFT')),
  hour_start    SMALLINT NOT NULL DEFAULT 6,
  hour_end      SMALLINT NOT NULL DEFAULT 22,
  range_mode    VARCHAR(10) NOT NULL DEFAULT 'WEEK' CHECK (range_mode IN ('DAY', 'WEEK', 'TWO_WEEKS')),
  is_blocked    BOOLEAN NOT NULL DEFAULT false,
  approval_days SMALLINT[] NOT NULL DEFAULT '{1,4}',
  updated_at    TIMESTAMP(6) NOT NULL DEFAULT now()
);

-- Same access model as the other module tables: only the server (service role) touches them.
ALTER TABLE public.slot_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_settings ENABLE ROW LEVEL SECURITY;
