
CREATE TABLE public.portfolio_item_files (
  file_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_item_id uuid NOT NULL,
  item_source text NOT NULL DEFAULT 'unit',
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime_type text,
  file_size bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_item_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view portfolio item files"
  ON public.portfolio_item_files FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can insert portfolio item files"
  ON public.portfolio_item_files FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins and analysts can update portfolio item files"
  ON public.portfolio_item_files FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins can delete portfolio item files"
  ON public.portfolio_item_files FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_portfolio_item_files_item ON public.portfolio_item_files (portfolio_item_id, item_source);
