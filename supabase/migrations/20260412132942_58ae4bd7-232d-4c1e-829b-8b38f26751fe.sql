
ALTER TABLE public.unit_portfolio_items ADD COLUMN rid_subtype text;
ALTER TABLE public.contact_portfolio_items ADD COLUMN rid_subtype text;

UPDATE public.unit_portfolio_items SET item_type = 'rid', rid_subtype = 'invention_patent' WHERE item_type = 'patent';
UPDATE public.contact_portfolio_items SET item_type = 'rid', rid_subtype = 'invention_patent' WHERE item_type = 'patent';
