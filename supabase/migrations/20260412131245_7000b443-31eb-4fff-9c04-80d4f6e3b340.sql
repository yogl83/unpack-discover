
-- Add citation profile fields to unit_contacts
ALTER TABLE public.unit_contacts
  ADD COLUMN orcid text,
  ADD COLUMN scopus_id text,
  ADD COLUMN scholar_url text,
  ADD COLUMN personal_summary text;

-- Create contact_portfolio_items table
CREATE TABLE public.contact_portfolio_items (
  portfolio_item_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_contact_id uuid NOT NULL REFERENCES public.unit_contacts(unit_contact_id) ON DELETE CASCADE,
  title text NOT NULL,
  item_type text NOT NULL,
  organization_name text,
  description text,
  url text,
  notes text,
  year_from integer,
  year_to integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_portfolio_items ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as unit_portfolio_items)
CREATE POLICY "Authenticated can view contact portfolio"
  ON public.contact_portfolio_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can insert contact portfolio"
  ON public.contact_portfolio_items FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Admins and analysts can update contact portfolio"
  ON public.contact_portfolio_items FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Admins can delete contact portfolio"
  ON public.contact_portfolio_items FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER set_contact_portfolio_items_updated_at
  BEFORE UPDATE ON public.contact_portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
