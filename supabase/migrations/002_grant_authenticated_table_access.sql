-- Grant API roles the table privileges needed to reach RLS policies.
-- Row-level security remains enabled and continues to control which rows are visible.

grant usage on schema public to authenticated, anon;

grant select, insert, update, delete on table
  public.households,
  public.household_members,
  public.babies,
  public.care_records,
  public.health_measurements,
  public.care_tasks,
  public.reminders,
  public.growth_assessments
to authenticated;

grant select on table public.growth_standards to anon, authenticated;

grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.has_household_role(uuid, text[]) to authenticated;
grant execute on function public.create_family_with_baby(text, text, date, text, integer) to authenticated;
