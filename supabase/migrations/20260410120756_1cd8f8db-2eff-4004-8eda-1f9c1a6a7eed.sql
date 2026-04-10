
DO $$ BEGIN
  -- contacts.partner_id → partners
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_partner_id_fkey') THEN
    ALTER TABLE public.contacts ADD CONSTRAINT contacts_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id) ON DELETE SET NULL;
  END IF;

  -- partner_needs.partner_id → partners
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_needs_partner_id_fkey') THEN
    ALTER TABLE public.partner_needs ADD CONSTRAINT partner_needs_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id) ON DELETE CASCADE;
  END IF;

  -- partner_needs.owner_contact_id → contacts
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_needs_owner_contact_id_fkey') THEN
    ALTER TABLE public.partner_needs ADD CONSTRAINT partner_needs_owner_contact_id_fkey FOREIGN KEY (owner_contact_id) REFERENCES public.contacts(contact_id) ON DELETE SET NULL;
  END IF;

  -- collaboration_hypotheses.partner_id → partners
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collaboration_hypotheses_partner_id_fkey') THEN
    ALTER TABLE public.collaboration_hypotheses ADD CONSTRAINT collaboration_hypotheses_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id) ON DELETE CASCADE;
  END IF;

  -- collaboration_hypotheses.need_id → partner_needs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collaboration_hypotheses_need_id_fkey') THEN
    ALTER TABLE public.collaboration_hypotheses ADD CONSTRAINT collaboration_hypotheses_need_id_fkey FOREIGN KEY (need_id) REFERENCES public.partner_needs(need_id) ON DELETE CASCADE;
  END IF;

  -- collaboration_hypotheses.unit_id → miem_units
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collaboration_hypotheses_unit_id_fkey') THEN
    ALTER TABLE public.collaboration_hypotheses ADD CONSTRAINT collaboration_hypotheses_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.miem_units(unit_id) ON DELETE SET NULL;
  END IF;

  -- collaboration_hypotheses.competency_id → competencies
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collaboration_hypotheses_competency_id_fkey') THEN
    ALTER TABLE public.collaboration_hypotheses ADD CONSTRAINT collaboration_hypotheses_competency_id_fkey FOREIGN KEY (competency_id) REFERENCES public.competencies(competency_id) ON DELETE SET NULL;
  END IF;

  -- competencies.unit_id → miem_units
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'competencies_unit_id_fkey') THEN
    ALTER TABLE public.competencies ADD CONSTRAINT competencies_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.miem_units(unit_id) ON DELETE CASCADE;
  END IF;

  -- sources.partner_id → partners
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sources_partner_id_fkey') THEN
    ALTER TABLE public.sources ADD CONSTRAINT sources_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id) ON DELETE SET NULL;
  END IF;

  -- evidence.partner_id → partners
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evidence_partner_id_fkey') THEN
    ALTER TABLE public.evidence ADD CONSTRAINT evidence_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id) ON DELETE SET NULL;
  END IF;

  -- evidence.source_id → sources
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evidence_source_id_fkey') THEN
    ALTER TABLE public.evidence ADD CONSTRAINT evidence_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(source_id) ON DELETE SET NULL;
  END IF;

  -- evidence.need_id → partner_needs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evidence_need_id_fkey') THEN
    ALTER TABLE public.evidence ADD CONSTRAINT evidence_need_id_fkey FOREIGN KEY (need_id) REFERENCES public.partner_needs(need_id) ON DELETE SET NULL;
  END IF;

  -- evidence.hypothesis_id → collaboration_hypotheses
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evidence_hypothesis_id_fkey') THEN
    ALTER TABLE public.evidence ADD CONSTRAINT evidence_hypothesis_id_fkey FOREIGN KEY (hypothesis_id) REFERENCES public.collaboration_hypotheses(hypothesis_id) ON DELETE SET NULL;
  END IF;

  -- evidence.unit_id → miem_units
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evidence_unit_id_fkey') THEN
    ALTER TABLE public.evidence ADD CONSTRAINT evidence_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.miem_units(unit_id) ON DELETE SET NULL;
  END IF;

  -- evidence.competency_id → competencies
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evidence_competency_id_fkey') THEN
    ALTER TABLE public.evidence ADD CONSTRAINT evidence_competency_id_fkey FOREIGN KEY (competency_id) REFERENCES public.competencies(competency_id) ON DELETE SET NULL;
  END IF;

  -- next_steps.partner_id → partners
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'next_steps_partner_id_fkey') THEN
    ALTER TABLE public.next_steps ADD CONSTRAINT next_steps_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id) ON DELETE SET NULL;
  END IF;

  -- next_steps.need_id → partner_needs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'next_steps_need_id_fkey') THEN
    ALTER TABLE public.next_steps ADD CONSTRAINT next_steps_need_id_fkey FOREIGN KEY (need_id) REFERENCES public.partner_needs(need_id) ON DELETE SET NULL;
  END IF;

  -- next_steps.hypothesis_id → collaboration_hypotheses
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'next_steps_hypothesis_id_fkey') THEN
    ALTER TABLE public.next_steps ADD CONSTRAINT next_steps_hypothesis_id_fkey FOREIGN KEY (hypothesis_id) REFERENCES public.collaboration_hypotheses(hypothesis_id) ON DELETE SET NULL;
  END IF;

  -- partner_profiles.partner_id → partners
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_profiles_partner_id_fkey') THEN
    ALTER TABLE public.partner_profiles ADD CONSTRAINT partner_profiles_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id) ON DELETE CASCADE;
  END IF;

  -- partner_profiles.based_on_profile_id → partner_profiles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_profiles_based_on_profile_id_fkey') THEN
    ALTER TABLE public.partner_profiles ADD CONSTRAINT partner_profiles_based_on_profile_id_fkey FOREIGN KEY (based_on_profile_id) REFERENCES public.partner_profiles(profile_id) ON DELETE SET NULL;
  END IF;

  -- partner_profile_files.partner_id → partners
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_profile_files_partner_id_fkey') THEN
    ALTER TABLE public.partner_profile_files ADD CONSTRAINT partner_profile_files_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id) ON DELETE CASCADE;
  END IF;

  -- partner_profile_files.profile_id → partner_profiles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_profile_files_profile_id_fkey') THEN
    ALTER TABLE public.partner_profile_files ADD CONSTRAINT partner_profile_files_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.partner_profiles(profile_id) ON DELETE CASCADE;
  END IF;

  -- miem_units.lead_contact_id → unit_contacts
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'miem_units_lead_contact_id_fkey') THEN
    ALTER TABLE public.miem_units ADD CONSTRAINT miem_units_lead_contact_id_fkey FOREIGN KEY (lead_contact_id) REFERENCES public.unit_contacts(unit_contact_id) ON DELETE SET NULL;
  END IF;

  -- unit_contacts.unit_id → miem_units
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unit_contacts_unit_id_fkey') THEN
    ALTER TABLE public.unit_contacts ADD CONSTRAINT unit_contacts_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.miem_units(unit_id) ON DELETE CASCADE;
  END IF;

  -- unit_contact_memberships.unit_id → miem_units
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unit_contact_memberships_unit_id_fkey') THEN
    ALTER TABLE public.unit_contact_memberships ADD CONSTRAINT unit_contact_memberships_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.miem_units(unit_id) ON DELETE CASCADE;
  END IF;

  -- unit_contact_memberships.unit_contact_id → unit_contacts
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unit_contact_memberships_unit_contact_id_fkey') THEN
    ALTER TABLE public.unit_contact_memberships ADD CONSTRAINT unit_contact_memberships_unit_contact_id_fkey FOREIGN KEY (unit_contact_id) REFERENCES public.unit_contacts(unit_contact_id) ON DELETE CASCADE;
  END IF;

  -- unit_portfolio_items.unit_id → miem_units
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unit_portfolio_items_unit_id_fkey') THEN
    ALTER TABLE public.unit_portfolio_items ADD CONSTRAINT unit_portfolio_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.miem_units(unit_id) ON DELETE CASCADE;
  END IF;
END $$;
