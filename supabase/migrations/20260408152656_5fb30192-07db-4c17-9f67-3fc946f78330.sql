-- Revoke direct EXECUTE so authenticated/anon users cannot call has_role via RPC
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated, anon, public;