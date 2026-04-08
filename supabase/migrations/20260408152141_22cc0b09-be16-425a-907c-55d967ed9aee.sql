-- Fix 1: Restrict contacts SELECT to admins and analysts only (protects email, phone, etc.)
DROP POLICY "Authenticated can view contacts" ON public.contacts;
CREATE POLICY "Admins and analysts can view contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

-- Fix 2: Restrict sync_log SELECT to admins only (protects spreadsheet_id, errors, etc.)
DROP POLICY "Authenticated can view sync_log" ON public.sync_log;
CREATE POLICY "Admins can view sync_log"
  ON public.sync_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));