-- 1. Add new columns to contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS telegram text,
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS contact_kind text NOT NULL DEFAULT 'official',
  ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz;

-- 2. Fix contacts SELECT policy: all authenticated should view, not just admin/analyst
DROP POLICY IF EXISTS "Admins and analysts can view contacts" ON public.contacts;
CREATE POLICY "Authenticated can view contacts"
  ON public.contacts FOR SELECT TO authenticated
  USING (true);

-- 3. Create unit_contacts table
CREATE TABLE public.unit_contacts (
  unit_contact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.miem_units(unit_id) ON DELETE CASCADE,
  full_name text NOT NULL,
  job_title text,
  email text,
  phone text,
  telegram text,
  contact_role text,
  is_primary boolean NOT NULL DEFAULT false,
  availability_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Index
CREATE INDEX idx_unit_contacts_unit_id ON public.unit_contacts(unit_id);

-- 5. RLS
ALTER TABLE public.unit_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view unit contacts"
  ON public.unit_contacts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can insert unit contacts"
  ON public.unit_contacts FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins and analysts can update unit contacts"
  ON public.unit_contacts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins can delete unit contacts"
  ON public.unit_contacts FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Updated_at trigger
CREATE TRIGGER set_unit_contacts_updated_at
  BEFORE UPDATE ON public.unit_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();