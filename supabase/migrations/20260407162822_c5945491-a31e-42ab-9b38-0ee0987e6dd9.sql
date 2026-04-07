
-- Sync settings (singleton config)
CREATE TABLE public.sync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spreadsheet_id text,
  enabled boolean NOT NULL DEFAULT false,
  auto_sync_enabled boolean NOT NULL DEFAULT false,
  auto_sync_interval_minutes integer NOT NULL DEFAULT 60,
  default_tables text[] NOT NULL DEFAULT '{}',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sync_settings"
  ON public.sync_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default singleton row
INSERT INTO public.sync_settings (id) VALUES (gen_random_uuid());

CREATE TRIGGER set_sync_settings_updated_at
  BEFORE UPDATE ON public.sync_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync log
CREATE TABLE public.sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  triggered_by text NOT NULL DEFAULT 'manual',
  trigger_user_id uuid,
  spreadsheet_id text,
  tables text[] NOT NULL DEFAULT '{}',
  stats jsonb DEFAULT '{}',
  errors jsonb DEFAULT '{}',
  row_errors jsonb DEFAULT '[]',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sync_log"
  ON public.sync_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view sync_log"
  ON public.sync_log FOR SELECT TO authenticated
  USING (true);

-- External IDs on partners
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS external_source text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_external
  ON public.partners (external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

-- External IDs on miem_units
ALTER TABLE public.miem_units
  ADD COLUMN IF NOT EXISTS external_source text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_miem_units_external
  ON public.miem_units (external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;
