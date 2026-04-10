DROP VIEW IF EXISTS public.unit_overview;

CREATE VIEW public.unit_overview WITH (security_invoker = on) AS
SELECT
  u.unit_id,
  u.unit_name,
  uc.full_name AS lead_name,
  u.unit_type,
  u.research_area,
  u.readiness_level,
  count(DISTINCT c.competency_id) AS competencies_count,
  count(DISTINCT h.hypothesis_id) AS linked_hypotheses_count
FROM public.miem_units u
LEFT JOIN public.unit_contacts uc ON uc.unit_contact_id = u.lead_contact_id
LEFT JOIN public.competencies c ON c.unit_id = u.unit_id
LEFT JOIN public.collaboration_hypotheses h ON h.unit_id = u.unit_id
GROUP BY u.unit_id, u.unit_name, uc.full_name, u.unit_type, u.research_area, u.readiness_level;