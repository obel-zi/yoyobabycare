-- BabyCare initial Supabase schema
create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '我的家庭',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'caregiver' check (role in ('admin','caregiver','viewer')),
  created_at timestamptz not null default now(),
  unique(household_id,user_id)
);

create table if not exists public.babies (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  birth_date date not null,
  sex text not null check (sex in ('female','male','unknown')),
  gestational_age_weeks integer check (gestational_age_weeks between 22 and 44),
  created_at timestamptz not null default now()
);

create table if not exists public.care_records (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid not null references public.babies(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id),
  category text not null check (category in ('feeding','supplement','diaper','play','sleep','other')),
  detail text not null default '',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.health_measurements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid not null references public.babies(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id),
  measured_at timestamptz not null default now(),
  weight_kg numeric(5,2) check (weight_kg is null or weight_kg between 0 and 100),
  length_cm numeric(5,2) check (length_cm is null or length_cm between 0 and 250),
  head_circumference_cm numeric(5,2) check (head_circumference_cm is null or head_circumference_cm between 0 and 100),
  temperature_c numeric(4,1) check (temperature_c is null or temperature_c between 30 and 45),
  note text not null default '',
  created_at timestamptz not null default now(),
  check (weight_kg is not null or length_cm is not null or head_circumference_cm is not null or temperature_c is not null)
);

create table if not exists public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid references public.babies(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  baby_id uuid references public.babies(id) on delete cascade,
  title text not null,
  schedule jsonb not null default '{}'::jsonb,
  timezone text not null default 'Asia/Shanghai',
  enabled boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.growth_standards (
  id uuid primary key default gen_random_uuid(),
  standard_name text not null,
  version text not null,
  indicator text not null,
  sex text not null check (sex in ('female','male')),
  age_days integer not null check (age_days >= 0),
  l numeric not null,
  m numeric not null,
  s numeric not null,
  source_url text,
  verified_at timestamptz,
  unique(standard_name,version,indicator,sex,age_days)
);

create table if not exists public.growth_assessments (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  measurement_id uuid not null references public.health_measurements(id) on delete cascade,
  standard_name text not null,
  standard_version text not null,
  algorithm_version text not null,
  indicator text not null,
  z_score numeric,
  percentile numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_members_user on public.household_members(user_id);
create index if not exists idx_babies_household on public.babies(household_id);
create index if not exists idx_records_baby_time on public.care_records(baby_id,occurred_at desc);
create index if not exists idx_measurements_baby_time on public.health_measurements(baby_id,measured_at desc);
create index if not exists idx_tasks_household_due on public.care_tasks(household_id,due_at);
create index if not exists idx_reminders_household on public.reminders(household_id,enabled);

create or replace function public.is_household_member(target_household uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.household_members m where m.household_id=target_household and m.user_id=auth.uid()) $$;

create or replace function public.has_household_role(target_household uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.household_members m where m.household_id=target_household and m.user_id=auth.uid() and m.role=any(allowed_roles)) $$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.babies enable row level security;
alter table public.care_records enable row level security;
alter table public.health_measurements enable row level security;
alter table public.care_tasks enable row level security;
alter table public.reminders enable row level security;
alter table public.growth_standards enable row level security;
alter table public.growth_assessments enable row level security;

create policy "members can view households" on public.households for select using (public.is_household_member(id));
create policy "owners can create households" on public.households for insert with check (owner_id=auth.uid());
create policy "admins can update households" on public.households for update using (public.has_household_role(id,array['admin'])) with check (public.has_household_role(id,array['admin']));

create policy "members can view membership" on public.household_members for select using (public.is_household_member(household_id));
create policy "admins can manage membership" on public.household_members for all using (public.has_household_role(household_id,array['admin'])) with check (public.has_household_role(household_id,array['admin']));

create policy "members can view babies" on public.babies for select using (public.is_household_member(household_id));
create policy "caregivers can add babies" on public.babies for insert with check (public.has_household_role(household_id,array['admin','caregiver']));
create policy "caregivers can update babies" on public.babies for update using (public.has_household_role(household_id,array['admin','caregiver'])) with check (public.has_household_role(household_id,array['admin','caregiver']));
create policy "admins can delete babies" on public.babies for delete using (public.has_household_role(household_id,array['admin']));

create policy "members can view records" on public.care_records for select using (public.is_household_member(household_id));
create policy "caregivers can add records" on public.care_records for insert with check (public.has_household_role(household_id,array['admin','caregiver']) and created_by=auth.uid());
create policy "authors or admins can update records" on public.care_records for update using (created_by=auth.uid() or public.has_household_role(household_id,array['admin'])) with check (public.has_household_role(household_id,array['admin','caregiver']));
create policy "admins can delete records" on public.care_records for delete using (public.has_household_role(household_id,array['admin']));

create policy "members can view measurements" on public.health_measurements for select using (public.is_household_member(household_id));
create policy "caregivers can add measurements" on public.health_measurements for insert with check (public.has_household_role(household_id,array['admin','caregiver']) and created_by=auth.uid());
create policy "caregivers can update measurements" on public.health_measurements for update using (public.has_household_role(household_id,array['admin','caregiver'])) with check (public.has_household_role(household_id,array['admin','caregiver']));
create policy "admins can delete measurements" on public.health_measurements for delete using (public.has_household_role(household_id,array['admin']));

create policy "members can view tasks" on public.care_tasks for select using (public.is_household_member(household_id));
create policy "caregivers can manage tasks" on public.care_tasks for all using (public.has_household_role(household_id,array['admin','caregiver'])) with check (public.has_household_role(household_id,array['admin','caregiver']));
create policy "members can view reminders" on public.reminders for select using (public.is_household_member(household_id));
create policy "admins and caregivers manage reminders" on public.reminders for all using (public.has_household_role(household_id,array['admin','caregiver'])) with check (public.has_household_role(household_id,array['admin','caregiver']));
create policy "anyone can read verified standards" on public.growth_standards for select using (verified_at is not null);
create policy "members can view growth assessments" on public.growth_assessments for select using (exists(select 1 from public.health_measurements h where h.id=measurement_id and public.is_household_member(h.household_id)));
create policy "caregivers can add growth assessments" on public.growth_assessments for insert with check (exists(select 1 from public.health_measurements h where h.id=measurement_id and public.has_household_role(h.household_id,array['admin','caregiver'])));

create or replace function public.create_family_with_baby(
  household_name text, baby_name text, baby_birth_date date, baby_sex text, baby_gestational_age_weeks integer default null
) returns uuid language plpgsql security definer set search_path=public
as $$
declare new_household uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.households(name,owner_id) values(coalesce(nullif(household_name,''),'我的家庭'),auth.uid()) returning id into new_household;
  insert into public.household_members(household_id,user_id,role) values(new_household,auth.uid(),'admin');
  insert into public.babies(household_id,name,birth_date,sex,gestational_age_weeks)
  values(new_household,baby_name,baby_birth_date,baby_sex,baby_gestational_age_weeks);
  return new_household;
end; $$;

grant execute on function public.create_family_with_baby(text,text,date,text,integer) to authenticated;
