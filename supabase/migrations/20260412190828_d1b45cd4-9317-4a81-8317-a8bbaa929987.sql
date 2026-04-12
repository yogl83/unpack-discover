
-- Security definer function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND approved = true
  )
$$;

-- Now update all SELECT policies on data tables to require approved status
-- We drop and recreate each SELECT policy

-- partners
DROP POLICY IF EXISTS "Authenticated can view partners" ON public.partners;
CREATE POLICY "Approved users can view partners" ON public.partners
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- contacts
DROP POLICY IF EXISTS "Authenticated can view contacts" ON public.contacts;
CREATE POLICY "Approved users can view contacts" ON public.contacts
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- partner_needs
DROP POLICY IF EXISTS "Authenticated can view needs" ON public.partner_needs;
CREATE POLICY "Approved users can view needs" ON public.partner_needs
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- collaboration_hypotheses
DROP POLICY IF EXISTS "Authenticated can view hypotheses" ON public.collaboration_hypotheses;
CREATE POLICY "Approved users can view hypotheses" ON public.collaboration_hypotheses
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- next_steps
DROP POLICY IF EXISTS "Authenticated can view steps" ON public.next_steps;
CREATE POLICY "Approved users can view steps" ON public.next_steps
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- miem_units
DROP POLICY IF EXISTS "Authenticated can view units" ON public.miem_units;
CREATE POLICY "Approved users can view units" ON public.miem_units
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- competencies
DROP POLICY IF EXISTS "Authenticated can view competencies" ON public.competencies;
CREATE POLICY "Approved users can view competencies" ON public.competencies
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- unit_contacts
DROP POLICY IF EXISTS "Authenticated can view unit contacts" ON public.unit_contacts;
CREATE POLICY "Approved users can view unit contacts" ON public.unit_contacts
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- unit_contact_memberships
DROP POLICY IF EXISTS "Authenticated can view memberships" ON public.unit_contact_memberships;
CREATE POLICY "Approved users can view memberships" ON public.unit_contact_memberships
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- contact_portfolio_items
DROP POLICY IF EXISTS "Authenticated can view contact portfolio" ON public.contact_portfolio_items;
CREATE POLICY "Approved users can view contact portfolio" ON public.contact_portfolio_items
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- unit_portfolio_items
DROP POLICY IF EXISTS "Authenticated can view portfolio" ON public.unit_portfolio_items;
CREATE POLICY "Approved users can view portfolio" ON public.unit_portfolio_items
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- unit_portfolio_files
DROP POLICY IF EXISTS "Authenticated can view unit portfolio files" ON public.unit_portfolio_files;
CREATE POLICY "Approved users can view unit portfolio files" ON public.unit_portfolio_files
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- portfolio_item_files
DROP POLICY IF EXISTS "Authenticated can view portfolio item files" ON public.portfolio_item_files;
CREATE POLICY "Approved users can view portfolio item files" ON public.portfolio_item_files
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- partner_profiles
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.partner_profiles;
CREATE POLICY "Approved users can view partner profiles" ON public.partner_profiles
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- partner_profile_files
DROP POLICY IF EXISTS "Authenticated can view profile files" ON public.partner_profile_files;
CREATE POLICY "Approved users can view profile files" ON public.partner_profile_files
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- app_settings
DROP POLICY IF EXISTS "authenticated_read" ON public.app_settings;
CREATE POLICY "Approved users can read settings" ON public.app_settings
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));

-- Also update INSERT/UPDATE/DELETE policies to require approved status
-- (admins/analysts must also be approved)

-- We'll add is_approved check to all write policies by dropping and recreating them

-- partners write
DROP POLICY IF EXISTS "Admins and analysts can insert partners" ON public.partners;
CREATE POLICY "Approved admins and analysts can insert partners" ON public.partners
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update partners" ON public.partners;
CREATE POLICY "Approved admins and analysts can update partners" ON public.partners
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete partners" ON public.partners;
CREATE POLICY "Approved admins can delete partners" ON public.partners
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- contacts write
DROP POLICY IF EXISTS "Admins and analysts can insert contacts" ON public.contacts;
CREATE POLICY "Approved admins and analysts can insert contacts" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update contacts" ON public.contacts;
CREATE POLICY "Approved admins and analysts can update contacts" ON public.contacts
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete contacts" ON public.contacts;
CREATE POLICY "Approved admins can delete contacts" ON public.contacts
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- partner_needs write
DROP POLICY IF EXISTS "Admins and analysts can insert needs" ON public.partner_needs;
CREATE POLICY "Approved admins and analysts can insert needs" ON public.partner_needs
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update needs" ON public.partner_needs;
CREATE POLICY "Approved admins and analysts can update needs" ON public.partner_needs
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete needs" ON public.partner_needs;
CREATE POLICY "Approved admins can delete needs" ON public.partner_needs
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- collaboration_hypotheses write
DROP POLICY IF EXISTS "Admins and analysts can insert hypotheses" ON public.collaboration_hypotheses;
CREATE POLICY "Approved admins and analysts can insert hypotheses" ON public.collaboration_hypotheses
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update hypotheses" ON public.collaboration_hypotheses;
CREATE POLICY "Approved admins and analysts can update hypotheses" ON public.collaboration_hypotheses
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete hypotheses" ON public.collaboration_hypotheses;
CREATE POLICY "Approved admins can delete hypotheses" ON public.collaboration_hypotheses
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- next_steps write
DROP POLICY IF EXISTS "Admins and analysts can insert steps" ON public.next_steps;
CREATE POLICY "Approved admins and analysts can insert steps" ON public.next_steps
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update steps" ON public.next_steps;
CREATE POLICY "Approved admins and analysts can update steps" ON public.next_steps
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete steps" ON public.next_steps;
CREATE POLICY "Approved admins can delete steps" ON public.next_steps
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- miem_units write
DROP POLICY IF EXISTS "Admins and analysts can insert units" ON public.miem_units;
CREATE POLICY "Approved admins and analysts can insert units" ON public.miem_units
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update units" ON public.miem_units;
CREATE POLICY "Approved admins and analysts can update units" ON public.miem_units
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete units" ON public.miem_units;
CREATE POLICY "Approved admins can delete units" ON public.miem_units
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- competencies write
DROP POLICY IF EXISTS "Admins and analysts can insert competencies" ON public.competencies;
CREATE POLICY "Approved admins and analysts can insert competencies" ON public.competencies
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update competencies" ON public.competencies;
CREATE POLICY "Approved admins and analysts can update competencies" ON public.competencies
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete competencies" ON public.competencies;
CREATE POLICY "Approved admins can delete competencies" ON public.competencies
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- unit_contacts write
DROP POLICY IF EXISTS "Admins and analysts can insert unit contacts" ON public.unit_contacts;
CREATE POLICY "Approved admins and analysts can insert unit contacts" ON public.unit_contacts
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update unit contacts" ON public.unit_contacts;
CREATE POLICY "Approved admins and analysts can update unit contacts" ON public.unit_contacts
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete unit contacts" ON public.unit_contacts;
CREATE POLICY "Approved admins can delete unit contacts" ON public.unit_contacts
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- unit_contact_memberships write
DROP POLICY IF EXISTS "Admins and analysts can insert memberships" ON public.unit_contact_memberships;
CREATE POLICY "Approved admins and analysts can insert memberships" ON public.unit_contact_memberships
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update memberships" ON public.unit_contact_memberships;
CREATE POLICY "Approved admins and analysts can update memberships" ON public.unit_contact_memberships
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete memberships" ON public.unit_contact_memberships;
CREATE POLICY "Approved admins can delete memberships" ON public.unit_contact_memberships
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- contact_portfolio_items write
DROP POLICY IF EXISTS "Admins and analysts can insert contact portfolio" ON public.contact_portfolio_items;
CREATE POLICY "Approved admins and analysts can insert contact portfolio" ON public.contact_portfolio_items
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update contact portfolio" ON public.contact_portfolio_items;
CREATE POLICY "Approved admins and analysts can update contact portfolio" ON public.contact_portfolio_items
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete contact portfolio" ON public.contact_portfolio_items;
CREATE POLICY "Approved admins can delete contact portfolio" ON public.contact_portfolio_items
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- unit_portfolio_items write
DROP POLICY IF EXISTS "Admins and analysts can insert portfolio" ON public.unit_portfolio_items;
CREATE POLICY "Approved admins and analysts can insert portfolio" ON public.unit_portfolio_items
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update portfolio" ON public.unit_portfolio_items;
CREATE POLICY "Approved admins and analysts can update portfolio" ON public.unit_portfolio_items
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete portfolio" ON public.unit_portfolio_items;
CREATE POLICY "Approved admins can delete portfolio" ON public.unit_portfolio_items
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- unit_portfolio_files write
DROP POLICY IF EXISTS "Admins and analysts can insert unit portfolio files" ON public.unit_portfolio_files;
CREATE POLICY "Approved admins and analysts can insert unit portfolio files" ON public.unit_portfolio_files
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update unit portfolio files" ON public.unit_portfolio_files;
CREATE POLICY "Approved admins and analysts can update unit portfolio files" ON public.unit_portfolio_files
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete unit portfolio files" ON public.unit_portfolio_files;
CREATE POLICY "Approved admins can delete unit portfolio files" ON public.unit_portfolio_files
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- portfolio_item_files write
DROP POLICY IF EXISTS "Admins and analysts can insert portfolio item files" ON public.portfolio_item_files;
CREATE POLICY "Approved admins and analysts can insert portfolio item files" ON public.portfolio_item_files
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update portfolio item files" ON public.portfolio_item_files;
CREATE POLICY "Approved admins and analysts can update portfolio item files" ON public.portfolio_item_files
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete portfolio item files" ON public.portfolio_item_files;
CREATE POLICY "Approved admins can delete portfolio item files" ON public.portfolio_item_files
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- partner_profiles write
DROP POLICY IF EXISTS "Admins and analysts can insert profiles" ON public.partner_profiles;
CREATE POLICY "Approved admins and analysts can insert partner profiles" ON public.partner_profiles
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update profiles" ON public.partner_profiles;
CREATE POLICY "Approved admins and analysts can update partner profiles" ON public.partner_profiles
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.partner_profiles;
CREATE POLICY "Approved admins can delete partner profiles" ON public.partner_profiles
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- partner_profile_files write
DROP POLICY IF EXISTS "Admins and analysts can insert profile files" ON public.partner_profile_files;
CREATE POLICY "Approved admins and analysts can insert profile files" ON public.partner_profile_files
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins and analysts can update profile files" ON public.partner_profile_files;
CREATE POLICY "Approved admins and analysts can update profile files" ON public.partner_profile_files
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst')));

DROP POLICY IF EXISTS "Admins can delete profile files" ON public.partner_profile_files;
CREATE POLICY "Approved admins can delete profile files" ON public.partner_profile_files
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- app_settings write
DROP POLICY IF EXISTS "admin_write" ON public.app_settings;
CREATE POLICY "Approved admin can write settings" ON public.app_settings
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_update" ON public.app_settings;
CREATE POLICY "Approved admin can update settings" ON public.app_settings
  FOR UPDATE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'))
  WITH CHECK (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_delete" ON public.app_settings;
CREATE POLICY "Approved admin can delete settings" ON public.app_settings
  FOR DELETE TO authenticated USING (is_approved(auth.uid()) AND has_role(auth.uid(), 'admin'));
