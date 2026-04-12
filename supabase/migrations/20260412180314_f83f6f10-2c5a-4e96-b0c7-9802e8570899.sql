ALTER TABLE public.contact_portfolio_items
  ADD COLUMN publication_type text,
  ADD COLUMN language text,
  ADD COLUMN cited_by_count integer DEFAULT 0,
  ADD COLUMN primary_topic text,
  ADD COLUMN publisher text,
  ADD COLUMN source_type text,
  ADD COLUMN keywords text,
  ADD COLUMN is_retracted boolean DEFAULT false;