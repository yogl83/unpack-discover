ALTER TABLE public.contact_portfolio_items
  ADD COLUMN doi text,
  ADD COLUMN oa_status text,
  ADD COLUMN oa_url text,
  ADD COLUMN pdf_url text,
  ADD COLUMN arxiv_url text,
  ADD COLUMN biblio_volume text,
  ADD COLUMN biblio_issue text,
  ADD COLUMN biblio_first_page text,
  ADD COLUMN biblio_last_page text;