-- Nutivo — RLS performance: evaluate auth.uid() once per statement, index entry_items.food_id.
create index if not exists entry_items_food_id_idx on public.entry_items (food_id);

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles for delete to authenticated using (id = (select auth.uid()));

drop policy if exists meal_entries_all_own on public.meal_entries;
create policy meal_entries_all_own on public.meal_entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists entry_items_all_own on public.entry_items;
create policy entry_items_all_own on public.entry_items for all to authenticated
  using (exists (select 1 from public.meal_entries e where e.id = entry_items.entry_id and e.user_id = (select auth.uid())))
  with check (exists (select 1 from public.meal_entries e where e.id = entry_items.entry_id and e.user_id = (select auth.uid())));

drop policy if exists daily_reports_all_own on public.daily_reports;
create policy daily_reports_all_own on public.daily_reports for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists weight_logs_all_own on public.weight_logs;
create policy weight_logs_all_own on public.weight_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists quick_meals_all_own on public.quick_meals;
create policy quick_meals_all_own on public.quick_meals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
