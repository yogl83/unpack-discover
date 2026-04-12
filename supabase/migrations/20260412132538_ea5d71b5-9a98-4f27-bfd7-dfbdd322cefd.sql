
ALTER TABLE public.unit_portfolio_items ADD COLUMN project_subtype text;
ALTER TABLE public.contact_portfolio_items ADD COLUMN project_subtype text;

UPDATE public.unit_portfolio_items SET item_type = 'project', project_subtype = 'grant' WHERE item_type = 'grant';
UPDATE public.contact_portfolio_items SET item_type = 'project', project_subtype = 'grant' WHERE item_type = 'grant';
