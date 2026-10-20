-- Nutivo — admin: activity/system log, admin roster, encrypted app settings, admin RPCs.
-- Everything here is reachable only through the service role (server-side admin pages).

-- ---------------------------------------------------------------------------
-- activity_log: one table for user activity and system events
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  kind        text not null check (kind in ('activity','system')),
  level       text not null default 'info' check (level in ('debug','info','warn','error')),
  event       text not null,                 -- e.g. meal.confirmed, ai.extract, auth.signup
  actor_id    uuid references auth.users(id) on delete set null,
  actor_email text,
  entity      text,                          -- e.g. meal_entry, profile, setting
  entity_id   text,
  message     text,
  meta        jsonb not null default '{}'::jsonb
);
create index if not exists activity_log_at_idx on public.activity_log (at desc);
create index if not exists activity_log_actor_idx on public.activity_log (actor_id, at desc);
create index if not exists activity_log_event_idx on public.activity_log (event, at desc);
create index if not exists activity_log_level_idx on public.activity_log (level, at desc) where level in ('warn','error');
alter table public.activity_log enable row level security;
-- No policies: only the service role reads or writes. Triggers below run as definer.

-- ---------------------------------------------------------------------------
-- admin_users: who may open /admin (env NUTIVO_ADMIN_EMAILS also bootstraps admins)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

-- ---------------------------------------------------------------------------
-- app_settings: plain values in `value`, secrets AES-GCM-encrypted by the app server
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key               text primary key,      -- e.g. ai.anthropic.api_key, ai.anthropic.extract_model
  value             jsonb,
  secret_ciphertext text,                  -- base64(iv|tag|ciphertext); never returned to browsers
  secret_last4      text,
  updated_at        timestamptz not null default now(),
  updated_by        uuid references auth.users(id) on delete set null
);
alter table public.app_settings enable row level security;

-- ---------------------------------------------------------------------------
-- Status column for soft-blocking users in-app (auth ban is applied via Admin API too)
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists status text not null default 'active' check (status in ('active','blocked'));

-- ---------------------------------------------------------------------------
-- Triggers: log data changes with the acting user, whatever client made them
-- ---------------------------------------------------------------------------
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_event text;
  v_entity_id text;
  v_meta jsonb := '{}'::jsonb;
  v_user uuid;
begin
  if tg_table_name = 'meal_entries' then
    v_entity_id := coalesce(new.id, old.id)::text;
    v_user := coalesce(new.user_id, old.user_id);
    v_event := case tg_op when 'INSERT' then 'meal.' || new.status when 'DELETE' then 'meal.deleted' else 'meal.updated' end;
    v_meta := jsonb_build_object('meal_type', coalesce(new.meal_type, old.meal_type), 'channel', coalesce(new.input_channel, old.input_channel));
  elsif tg_table_name = 'profiles' then
    v_entity_id := coalesce(new.id, old.id)::text;
    v_user := coalesce(new.id, old.id);
    v_event := case tg_op when 'INSERT' then 'profile.created' when 'DELETE' then 'profile.deleted' else 'profile.updated' end;
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      v_event := 'user.' || new.status;
    end if;
    if tg_op <> 'DELETE' then
      v_meta := jsonb_build_object('goal', new.goal, 'goal_kcal', new.goal_kcal);
    end if;
  else
    return coalesce(new, old);
  end if;

  insert into public.activity_log (kind, event, actor_id, actor_email, entity, entity_id, meta)
  values (
    'activity', v_event, coalesce(v_actor, v_user),
    (select u.email from auth.users u where u.id = coalesce(v_actor, v_user)),
    tg_table_name, v_entity_id, v_meta
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists meal_entries_log on public.meal_entries;
create trigger meal_entries_log after insert or update or delete on public.meal_entries
  for each row execute function public.log_activity();

drop trigger if exists profiles_log on public.profiles;
create trigger profiles_log after insert or update or delete on public.profiles
  for each row execute function public.log_activity();

create or replace function public.log_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log (kind, event, actor_id, actor_email, entity, entity_id)
    values ('activity', 'auth.signup', new.id, new.email, 'user', new.id::text);
  elsif tg_op = 'UPDATE' and new.last_sign_in_at is distinct from old.last_sign_in_at and new.last_sign_in_at is not null then
    insert into public.activity_log (kind, event, actor_id, actor_email, entity, entity_id)
    values ('activity', 'auth.signin', new.id, new.email, 'user', new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists auth_users_log on auth.users;
create trigger auth_users_log after insert or update of last_sign_in_at on auth.users
  for each row execute function public.log_auth_user();

revoke execute on function public.log_activity() from public, anon, authenticated;
revoke execute on function public.log_auth_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin RPCs (service role only)
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_users(q text default null, lim int default 20, off int default 0, only_status text default null)
returns table (
  id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz,
  status text, is_admin boolean, goal_kcal int, meals_total bigint, meals_7d bigint, last_meal_at timestamptz, total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select u.id, u.email::text, u.created_at, u.last_sign_in_at, u.banned_until,
           coalesce(p.status, 'active') as status,
           exists (select 1 from public.admin_users a where a.user_id = u.id) as is_admin,
           p.goal_kcal,
           (select count(*) from public.meal_entries m where m.user_id = u.id and m.status = 'confirmed') as meals_total,
           (select count(*) from public.meal_entries m where m.user_id = u.id and m.status = 'confirmed' and m.eaten_at > now() - interval '7 days') as meals_7d,
           (select max(m.eaten_at) from public.meal_entries m where m.user_id = u.id) as last_meal_at
    from auth.users u
    left join public.profiles p on p.id = u.id
    where (q is null or q = '' or u.email ilike '%' || q || '%')
      and (only_status is null or only_status = '' or coalesce(p.status, 'active') = only_status)
  )
  select b.*, count(*) over () as total_count
  from base b
  order by b.created_at desc
  limit greatest(1, least(lim, 100)) offset greatest(0, off);
$$;

create or replace function public.admin_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'users_total',   (select count(*) from auth.users),
    'users_7d',      (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'active_today',  (select count(distinct user_id) from public.meal_entries where status = 'confirmed' and eaten_at > now() - interval '24 hours'),
    'active_7d',     (select count(distinct user_id) from public.meal_entries where status = 'confirmed' and eaten_at > now() - interval '7 days'),
    'meals_today',   (select count(*) from public.meal_entries where status = 'confirmed' and eaten_at > now() - interval '24 hours'),
    'photo_share_7d',(select coalesce(round(avg((input_channel = 'web_photo')::int)::numeric, 3), 0) from public.meal_entries where status = 'confirmed' and eaten_at > now() - interval '7 days'),
    'ai_calls_24h',  (select count(*) from public.activity_log where event like 'ai.%' and at > now() - interval '24 hours'),
    'errors_24h',    (select count(*) from public.activity_log where level = 'error' and at > now() - interval '24 hours'),
    'blocked',       (select count(*) from public.profiles where status = 'blocked')
  );
$$;

revoke execute on function public.admin_list_users(text, int, int, text) from public, anon, authenticated;
revoke execute on function public.admin_stats() from public, anon, authenticated;
grant execute on function public.admin_list_users(text, int, int, text) to service_role;
grant execute on function public.admin_stats() to service_role;
grant all on public.activity_log, public.admin_users, public.app_settings to service_role;
