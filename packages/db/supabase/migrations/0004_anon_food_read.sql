-- Nutivo — foods and portion units are public reference data: let anonymous clients read and search them.
-- User data tables stay authenticated-only.
grant select on public.foods, public.portion_units to anon;

drop policy if exists foods_read_anon on public.foods;
create policy foods_read_anon on public.foods for select to anon using (true);
drop policy if exists portion_units_read_anon on public.portion_units;
create policy portion_units_read_anon on public.portion_units for select to anon using (true);

grant execute on function public.search_foods(text, int) to anon;
