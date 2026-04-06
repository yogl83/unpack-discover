
-- Fix views to use security invoker
drop view if exists public.partner_overview;
drop view if exists public.unit_overview;

create view public.partner_overview
with (security_invoker = on)
as
select
  p.partner_id, p.partner_name, p.industry, p.city,
  p.partner_status, p.priority_level, p.owner_user_id,
  p.created_at, p.updated_at,
  count(distinct c.contact_id) as contacts_count,
  count(distinct n.need_id) as needs_count,
  count(distinct h.hypothesis_id) as hypotheses_count,
  count(distinct ns.next_step_id) as next_steps_count
from public.partners p
left join public.contacts c on c.partner_id = p.partner_id
left join public.partner_needs n on n.partner_id = p.partner_id
left join public.collaboration_hypotheses h on h.partner_id = p.partner_id
left join public.next_steps ns on ns.partner_id = p.partner_id
group by p.partner_id;

create view public.unit_overview
with (security_invoker = on)
as
select
  u.unit_id, u.unit_name, u.lead_name, u.unit_type,
  u.research_area, u.readiness_level,
  count(distinct c.competency_id) as competencies_count,
  count(distinct h.hypothesis_id) as linked_hypotheses_count
from public.miem_units u
left join public.competencies c on c.unit_id = u.unit_id
left join public.collaboration_hypotheses h on h.unit_id = u.unit_id
group by u.unit_id;

-- Fix set_updated_at search_path
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
