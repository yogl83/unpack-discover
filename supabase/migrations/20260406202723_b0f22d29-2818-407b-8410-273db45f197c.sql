
-- Utility function for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- RBAC: user_roles table + has_role() security definer
-- ============================================================
create type public.app_role as enum ('admin', 'analyst', 'viewer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'viewer',
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- user_roles RLS
create policy "Users can view own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view all roles"
  on public.user_roles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Auto-create viewer role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'viewer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Profiles table (linked to auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles viewable by authenticated" on public.profiles
  for select to authenticated using (true);
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- Partners
-- ============================================================
create table public.partners (
  partner_id uuid primary key default gen_random_uuid(),
  partner_name text not null,
  legal_name text,
  website_url text,
  industry text,
  subindustry text,
  business_model text check (business_model in ('B2B', 'B2G', 'B2C', 'mixed')),
  city text,
  geography text,
  company_size text,
  company_profile text,
  technology_profile text,
  strategic_priorities text,
  priority_level text check (priority_level in ('low', 'medium', 'high', 'critical')),
  partner_status text check (partner_status in ('new', 'in_review', 'in_progress', 'active', 'on_hold', 'archived')) default 'new',
  owner_user_id uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_partners_owner on public.partners(owner_user_id);
create index idx_partners_status on public.partners(partner_status);
create index idx_partners_priority on public.partners(priority_level);

alter table public.partners enable row level security;
create policy "Authenticated can view partners" on public.partners for select to authenticated using (true);
create policy "Admins and analysts can insert partners" on public.partners for insert to authenticated with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins and analysts can update partners" on public.partners for update to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins can delete partners" on public.partners for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_partners_updated_at before update on public.partners for each row execute function public.set_updated_at();

-- ============================================================
-- Contacts
-- ============================================================
create table public.contacts (
  contact_id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(partner_id) on delete cascade,
  full_name text not null,
  job_title text,
  department_name text,
  email text,
  phone text,
  contact_role text,
  influence_level text check (influence_level in ('low', 'medium', 'high')),
  relationship_status text,
  last_contact_date date,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contacts_partner on public.contacts(partner_id);

alter table public.contacts enable row level security;
create policy "Authenticated can view contacts" on public.contacts for select to authenticated using (true);
create policy "Admins and analysts can insert contacts" on public.contacts for insert to authenticated with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins and analysts can update contacts" on public.contacts for update to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins can delete contacts" on public.contacts for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_contacts_updated_at before update on public.contacts for each row execute function public.set_updated_at();

-- ============================================================
-- Sources
-- ============================================================
create table public.sources (
  source_id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(partner_id) on delete cascade,
  source_type text,
  title text not null,
  source_url text,
  publisher text,
  publication_date date,
  checked_at date,
  source_reliability text check (source_reliability in ('A', 'B', 'C', 'official', 'external', 'internal')),
  summary text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sources_partner on public.sources(partner_id);

alter table public.sources enable row level security;
create policy "Authenticated can view sources" on public.sources for select to authenticated using (true);
create policy "Admins and analysts can insert sources" on public.sources for insert to authenticated with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins and analysts can update sources" on public.sources for update to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins can delete sources" on public.sources for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_sources_updated_at before update on public.sources for each row execute function public.set_updated_at();

-- ============================================================
-- MIEM Units
-- ============================================================
create table public.miem_units (
  unit_id uuid primary key default gen_random_uuid(),
  unit_name text not null,
  lead_name text,
  unit_type text,
  team_summary text,
  research_area text,
  business_problem_focus text,
  application_domain text,
  industry_fit text,
  end_customer_fit text,
  collaboration_formats text[],
  value_chain_role text,
  readiness_level text,
  discussion_readiness text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.miem_units enable row level security;
create policy "Authenticated can view units" on public.miem_units for select to authenticated using (true);
create policy "Admins and analysts can insert units" on public.miem_units for insert to authenticated with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins and analysts can update units" on public.miem_units for update to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins can delete units" on public.miem_units for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_miem_units_updated_at before update on public.miem_units for each row execute function public.set_updated_at();

-- ============================================================
-- Competencies
-- ============================================================
create table public.competencies (
  competency_id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.miem_units(unit_id) on delete cascade,
  competency_name text not null,
  competency_type text,
  description text,
  keywords text[],
  application_domain text,
  maturity_level text,
  methods_and_tools text,
  evidence_of_experience text,
  education_link text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_competencies_unit on public.competencies(unit_id);

alter table public.competencies enable row level security;
create policy "Authenticated can view competencies" on public.competencies for select to authenticated using (true);
create policy "Admins and analysts can insert competencies" on public.competencies for insert to authenticated with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins and analysts can update competencies" on public.competencies for update to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins can delete competencies" on public.competencies for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_competencies_updated_at before update on public.competencies for each row execute function public.set_updated_at();

-- ============================================================
-- Partner Needs
-- ============================================================
create table public.partner_needs (
  need_id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(partner_id) on delete cascade,
  owner_contact_id uuid references public.contacts(contact_id) on delete set null,
  title text not null,
  need_type text,
  description text,
  business_context text,
  expected_result text,
  time_horizon text,
  maturity_level text,
  need_status text check (need_status in ('hypothesis', 'probable', 'confirmed', 'in_progress', 'closed', 'archived')) default 'hypothesis',
  priority_level text check (priority_level in ('low', 'medium', 'high', 'critical')),
  budget_signal text,
  data_access_signal text,
  recommended_collaboration_format text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_partner_needs_partner on public.partner_needs(partner_id);

alter table public.partner_needs enable row level security;
create policy "Authenticated can view needs" on public.partner_needs for select to authenticated using (true);
create policy "Admins and analysts can insert needs" on public.partner_needs for insert to authenticated with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins and analysts can update needs" on public.partner_needs for update to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins can delete needs" on public.partner_needs for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_partner_needs_updated_at before update on public.partner_needs for each row execute function public.set_updated_at();

-- ============================================================
-- Collaboration Hypotheses
-- ============================================================
create table public.collaboration_hypotheses (
  hypothesis_id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(partner_id) on delete cascade,
  need_id uuid not null references public.partner_needs(need_id) on delete cascade,
  unit_id uuid references public.miem_units(unit_id) on delete set null,
  competency_id uuid references public.competencies(competency_id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  title text,
  rationale text,
  relevance_score numeric(3,1) check (relevance_score >= 0 and relevance_score <= 5),
  confidence_level text check (confidence_level in ('A', 'B', 'C')),
  recommended_collaboration_format text,
  recommended_entry_point text,
  hypothesis_status text check (hypothesis_status in ('new', 'in_progress', 'confirmed', 'rejected', 'moved_to_initiative', 'moved_to_project')) default 'new',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_hypotheses_partner on public.collaboration_hypotheses(partner_id);
create index idx_hypotheses_need on public.collaboration_hypotheses(need_id);
create index idx_hypotheses_unit on public.collaboration_hypotheses(unit_id);

alter table public.collaboration_hypotheses enable row level security;
create policy "Authenticated can view hypotheses" on public.collaboration_hypotheses for select to authenticated using (true);
create policy "Admins and analysts can insert hypotheses" on public.collaboration_hypotheses for insert to authenticated with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins and analysts can update hypotheses" on public.collaboration_hypotheses for update to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins can delete hypotheses" on public.collaboration_hypotheses for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_hypotheses_updated_at before update on public.collaboration_hypotheses for each row execute function public.set_updated_at();

-- ============================================================
-- Next Steps
-- ============================================================
create table public.next_steps (
  next_step_id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  partner_id uuid references public.partners(partner_id) on delete cascade,
  need_id uuid references public.partner_needs(need_id) on delete cascade,
  hypothesis_id uuid references public.collaboration_hypotheses(hypothesis_id) on delete cascade,
  action_title text not null,
  action_description text,
  owner_user_id uuid references auth.users(id) on delete set null,
  due_date date,
  next_step_status text check (next_step_status in ('new', 'in_progress', 'done', 'cancelled')) default 'new',
  result text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_next_steps_partner on public.next_steps(partner_id);
create index idx_next_steps_entity on public.next_steps(entity_type, entity_id);

alter table public.next_steps enable row level security;
create policy "Authenticated can view steps" on public.next_steps for select to authenticated using (true);
create policy "Admins and analysts can insert steps" on public.next_steps for insert to authenticated with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins and analysts can update steps" on public.next_steps for update to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins can delete steps" on public.next_steps for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_next_steps_updated_at before update on public.next_steps for each row execute function public.set_updated_at();

-- ============================================================
-- Evidence
-- ============================================================
create table public.evidence (
  evidence_id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  partner_id uuid references public.partners(partner_id) on delete cascade,
  need_id uuid references public.partner_needs(need_id) on delete cascade,
  unit_id uuid references public.miem_units(unit_id) on delete set null,
  competency_id uuid references public.competencies(competency_id) on delete set null,
  hypothesis_id uuid references public.collaboration_hypotheses(hypothesis_id) on delete cascade,
  field_name text,
  field_value text,
  data_collection_method text,
  source_id uuid references public.sources(source_id) on delete set null,
  confidence_level text check (confidence_level in ('A', 'B', 'C')),
  requires_interview_validation boolean default false,
  analyst_comment text,
  created_at timestamptz not null default now()
);

create index idx_evidence_entity on public.evidence(entity_type, entity_id);
create index idx_evidence_partner on public.evidence(partner_id);

alter table public.evidence enable row level security;
create policy "Authenticated can view evidence" on public.evidence for select to authenticated using (true);
create policy "Admins and analysts can insert evidence" on public.evidence for insert to authenticated with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins and analysts can update evidence" on public.evidence for update to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins can delete evidence" on public.evidence for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Unit Portfolio Items
-- ============================================================
create table public.unit_portfolio_items (
  portfolio_item_id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.miem_units(unit_id) on delete cascade,
  item_type text not null check (item_type in ('publication', 'grant', 'rnd_project', 'ip', 'case', 'other')),
  title text not null,
  organization_name text,
  year_from int,
  year_to int,
  description text,
  url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_portfolio_unit on public.unit_portfolio_items(unit_id);

alter table public.unit_portfolio_items enable row level security;
create policy "Authenticated can view portfolio" on public.unit_portfolio_items for select to authenticated using (true);
create policy "Admins and analysts can insert portfolio" on public.unit_portfolio_items for insert to authenticated with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins and analysts can update portfolio" on public.unit_portfolio_items for update to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'analyst'));
create policy "Admins can delete portfolio" on public.unit_portfolio_items for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_portfolio_updated_at before update on public.unit_portfolio_items for each row execute function public.set_updated_at();

-- ============================================================
-- Views
-- ============================================================
create or replace view public.partner_overview as
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

create or replace view public.unit_overview as
select
  u.unit_id, u.unit_name, u.lead_name, u.unit_type,
  u.research_area, u.readiness_level,
  count(distinct c.competency_id) as competencies_count,
  count(distinct h.hypothesis_id) as linked_hypotheses_count
from public.miem_units u
left join public.competencies c on c.unit_id = u.unit_id
left join public.collaboration_hypotheses h on h.unit_id = u.unit_id
group by u.unit_id;
