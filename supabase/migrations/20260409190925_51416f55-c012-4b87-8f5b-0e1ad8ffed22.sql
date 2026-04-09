
-- =============================================
-- 1. Table: partner_profiles
-- =============================================
CREATE TABLE public.partner_profiles (
  profile_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(partner_id) ON DELETE CASCADE,
  title text,

  -- Status / versioning
  status text NOT NULL DEFAULT 'draft',
  version_number integer NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT false,
  profile_date date,

  -- Type
  profile_type text NOT NULL DEFAULT 'manual',
  source_type text NOT NULL DEFAULT 'manual',

  -- Content sections
  summary_short text,
  company_overview text,
  business_scale text,
  technology_focus text,
  strategic_priorities text,
  talent_needs text,
  collaboration_opportunities text,
  current_relationship_with_miem text,
  relationship_with_other_universities text,
  recent_news_and_plans text,
  key_events_and_touchpoints text,
  risks_and_constraints text,
  recommended_next_steps text,

  -- References
  references_json jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Change tracking
  change_summary text,
  based_on_profile_id uuid REFERENCES public.partner_profiles(profile_id),

  -- Authorship
  created_by uuid,
  updated_by uuid,
  approved_by uuid,
  approved_at timestamptz,

  -- LLM-ready (Phase 2)
  generation_status text,
  generated_from_prompt text,
  generated_from_sources_json jsonb,
  needs_human_review boolean DEFAULT false,
  last_generated_at timestamptz,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_partner_profiles_partner_id ON public.partner_profiles(partner_id);
CREATE INDEX idx_partner_profiles_status ON public.partner_profiles(status);
CREATE INDEX idx_partner_profiles_is_current ON public.partner_profiles(is_current) WHERE is_current = true;
CREATE INDEX idx_partner_profiles_profile_date ON public.partner_profiles(profile_date);

-- Only one current approved profile per partner
CREATE UNIQUE INDEX idx_partner_profiles_unique_current
  ON public.partner_profiles(partner_id)
  WHERE is_current = true AND status = 'approved';

-- Updated_at trigger
CREATE TRIGGER set_partner_profiles_updated_at
  BEFORE UPDATE ON public.partner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view profiles"
  ON public.partner_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can insert profiles"
  ON public.partner_profiles FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins and analysts can update profiles"
  ON public.partner_profiles FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins can delete profiles"
  ON public.partner_profiles FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 2. Table: partner_profile_files
-- =============================================
CREATE TABLE public.partner_profile_files (
  file_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.partner_profiles(profile_id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(partner_id) ON DELETE CASCADE,
  storage_bucket text NOT NULL DEFAULT 'partner-profile-files',
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime_type text,
  file_size bigint,
  uploaded_by uuid,
  is_source_document boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_profile_files_profile ON public.partner_profile_files(profile_id);
CREATE INDEX idx_partner_profile_files_partner ON public.partner_profile_files(partner_id);

ALTER TABLE public.partner_profile_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view profile files"
  ON public.partner_profile_files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can insert profile files"
  ON public.partner_profile_files FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins and analysts can update profile files"
  ON public.partner_profile_files FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins can delete profile files"
  ON public.partner_profile_files FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 3. Storage bucket
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-profile-files', 'partner-profile-files', false);

-- Storage policies: authenticated can read
CREATE POLICY "Authenticated can read profile files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'partner-profile-files');

-- Admins and analysts can upload
CREATE POLICY "Admins and analysts can upload profile files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'partner-profile-files'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role))
  );

-- Admins can delete storage objects
CREATE POLICY "Admins can delete profile storage files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'partner-profile-files'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- =============================================
-- 4. Data migration: existing partner profile fields → partner_profiles
-- =============================================
INSERT INTO public.partner_profiles (
  partner_id, title, status, version_number, is_current, profile_date,
  profile_type, source_type,
  company_overview, technology_focus, strategic_priorities,
  created_at, updated_at
)
SELECT
  p.partner_id,
  p.partner_name || ' — Профайл v1',
  'approved',
  1,
  true,
  CURRENT_DATE,
  'manual',
  'manual',
  p.company_profile,
  p.technology_profile,
  p.strategic_priorities,
  p.created_at,
  p.updated_at
FROM public.partners p
WHERE p.company_profile IS NOT NULL
   OR p.technology_profile IS NOT NULL
   OR p.strategic_priorities IS NOT NULL;
