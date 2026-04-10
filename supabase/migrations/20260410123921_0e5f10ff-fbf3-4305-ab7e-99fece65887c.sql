-- 1. Fix profiles SELECT policy: restrict to own profile or admin/analyst
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Users can view own profile or admins/analysts see all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'analyst'::app_role)
  );

-- 2. Add UPDATE policy on storage.objects for partner-profile-files bucket
CREATE POLICY "Admins and analysts can update partner profile files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'partner-profile-files'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'analyst'::app_role)
    )
  );

-- 3. Revoke public EXECUTE on has_role to prevent role enumeration via RPC
-- RLS policies still work because they execute as the function owner
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated, anon, public;
