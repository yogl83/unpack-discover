
ALTER TABLE miem_units ADD COLUMN portfolio_summary text;

CREATE TABLE public.unit_portfolio_files (
  file_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES miem_units(unit_id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime_type text,
  file_size bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.unit_portfolio_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view unit portfolio files"
  ON public.unit_portfolio_files FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can insert unit portfolio files"
  ON public.unit_portfolio_files FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins and analysts can update unit portfolio files"
  ON public.unit_portfolio_files FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins can delete unit portfolio files"
  ON public.unit_portfolio_files FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO storage.buckets (id, name, public) VALUES ('unit-portfolio-files', 'unit-portfolio-files', false);

CREATE POLICY "Authenticated can view unit portfolio storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'unit-portfolio-files');

CREATE POLICY "Admins and analysts can upload unit portfolio files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'unit-portfolio-files' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role)));

CREATE POLICY "Admins and analysts can delete unit portfolio storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'unit-portfolio-files' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role)));
