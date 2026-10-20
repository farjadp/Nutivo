-- One user with the same columns as admin_list_users (service role only).
create or replace function public.admin_get_user(uid uuid)
returns table (
  id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz,
  status text, is_admin boolean, goal_kcal int, meals_total bigint, meals_7d bigint, last_meal_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email::text, u.created_at, u.last_sign_in_at, u.banned_until,
         coalesce(p.status, 'active'),
         exists (select 1 from public.admin_users a where a.user_id = u.id),
         p.goal_kcal,
         (select count(*) from public.meal_entries m where m.user_id = u.id and m.status = 'confirmed'),
         (select count(*) from public.meal_entries m where m.user_id = u.id and m.status = 'confirmed' and m.eaten_at > now() - interval '7 days'),
         (select max(m.eaten_at) from public.meal_entries m where m.user_id = u.id)
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = uid;
$$;
revoke execute on function public.admin_get_user(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_user(uuid) to service_role;
