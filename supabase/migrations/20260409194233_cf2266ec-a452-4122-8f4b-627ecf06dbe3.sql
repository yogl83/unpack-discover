
-- 1a. Add lead_contact_id to miem_units
ALTER TABLE public.miem_units
  ADD COLUMN lead_contact_id uuid REFERENCES public.unit_contacts(unit_contact_id) ON DELETE SET NULL;

-- 1b. Create unit_contact_memberships
CREATE TABLE public.unit_contact_memberships (
  membership_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.miem_units(unit_id) ON DELETE CASCADE,
  unit_contact_id uuid NOT NULL REFERENCES public.unit_contacts(unit_contact_id) ON DELETE CASCADE,
  member_role text NOT NULL DEFAULT 'other',
  is_lead boolean NOT NULL DEFAULT false,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, unit_contact_id)
);

CREATE INDEX idx_ucm_unit_id ON public.unit_contact_memberships(unit_id);
CREATE INDEX idx_ucm_contact_id ON public.unit_contact_memberships(unit_contact_id);

-- 1c. RLS
ALTER TABLE public.unit_contact_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view memberships"
  ON public.unit_contact_memberships FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can insert memberships"
  ON public.unit_contact_memberships FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins and analysts can update memberships"
  ON public.unit_contact_memberships FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins can delete memberships"
  ON public.unit_contact_memberships FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 1d. Migrate lead_name data
DO $$
DECLARE
  r RECORD;
  v_contact_id uuid;
BEGIN
  FOR r IN
    SELECT unit_id, lead_name
    FROM public.miem_units
    WHERE lead_name IS NOT NULL AND lead_name <> '' AND lead_contact_id IS NULL
  LOOP
    -- Try to find existing unit_contact with matching name
    SELECT unit_contact_id INTO v_contact_id
    FROM public.unit_contacts
    WHERE unit_id = r.unit_id AND full_name = r.lead_name
    LIMIT 1;

    -- If not found, create one
    IF v_contact_id IS NULL THEN
      INSERT INTO public.unit_contacts (unit_id, full_name, contact_role, is_primary)
      VALUES (r.unit_id, r.lead_name, 'lead', true)
      RETURNING unit_contact_id INTO v_contact_id;
    END IF;

    -- Set lead_contact_id
    UPDATE public.miem_units SET lead_contact_id = v_contact_id WHERE unit_id = r.unit_id;

    -- Create membership
    INSERT INTO public.unit_contact_memberships (unit_id, unit_contact_id, member_role, is_lead)
    VALUES (r.unit_id, v_contact_id, 'lead', true)
    ON CONFLICT (unit_id, unit_contact_id) DO UPDATE SET is_lead = true, member_role = 'lead';
  END LOOP;
END;
$$;

-- 1e. Trigger
CREATE TRIGGER set_ucm_updated_at
  BEFORE UPDATE ON public.unit_contact_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
