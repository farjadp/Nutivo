-- Nutivo — initial schema (Supabase / Postgres)
-- Idempotent where Postgres allows it. Safe to re-run on an empty or partially applied DB.

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  sex             text check (sex in ('male','female','other')),
  age             int  check (age between 10 and 120),
  height_cm       numeric(5,1) check (height_cm between 100 and 250),
  weight_kg       numeric(5,1) check (weight_kg between 25 and 400),
  activity        text check (activity in ('sedentary','light','moderate','active','very_active')),
  goal            text check (goal in ('lose','maintain','gain')),
  goal_kcal       int     check (goal_kcal between 800 and 6000),
  goal_protein_g  numeric check (goal_protein_g >= 0),
  goal_carbs_g    numeric check (goal_carbs_g >= 0),
  goal_fat_g      numeric check (goal_fat_g >= 0),
  locale          text not null default 'fa',
  timezone        text not null default 'America/Toronto',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- foods (reference data; per-100 g values are for the row's `state`)
-- ---------------------------------------------------------------------------
create table if not exists public.foods (
  id              text primary key,                       -- e.g. 'fa:chelo', 'usda:171477', 'off:4058700302265'
  name_fa         text not null,
  name_en         text not null,
  source          text not null check (source in ('fa_manual','usda','off')),
  kcal_100g       numeric not null check (kcal_100g >= 0),
  protein_100g    numeric not null check (protein_100g >= 0),
  carbs_100g      numeric not null check (carbs_100g >= 0),
  fat_100g        numeric not null check (fat_100g >= 0),
  cooked_factor   numeric not null default 1 check (cooked_factor > 0), -- cooked grams per 1 g raw
  state           text not null check (state in ('raw','cooked','as_served')),
  confidence      text not null check (confidence in ('high','medium','low')),
  tags            text[] not null default '{}',
  source_ref      text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists foods_name_fa_trgm_idx on public.foods using gin (name_fa extensions.gin_trgm_ops);
create index if not exists foods_name_en_trgm_idx on public.foods using gin (lower(name_en) extensions.gin_trgm_ops);
create index if not exists foods_tags_idx        on public.foods using gin (tags);

-- ---------------------------------------------------------------------------
-- portion_units (local units -> grams)
-- ---------------------------------------------------------------------------
create table if not exists public.portion_units (
  id              bigserial primary key,
  food_id         text not null references public.foods(id) on delete cascade,
  unit_fa         text not null,
  unit_en         text not null,
  grams_default   numeric not null check (grams_default > 0),
  grams_min       numeric not null check (grams_min > 0),
  grams_max       numeric not null check (grams_max > 0),
  notes           text,
  constraint portion_units_food_unit_uniq unique (food_id, unit_fa),
  constraint portion_units_range_chk check (grams_min <= grams_default and grams_default <= grams_max)
);

create index if not exists portion_units_food_id_idx on public.portion_units (food_id);

-- ---------------------------------------------------------------------------
-- meal_entries
-- ---------------------------------------------------------------------------
create table if not exists public.meal_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  eaten_at        timestamptz not null default now(),
  meal_type       text not null check (meal_type in ('breakfast','lunch','snack','dinner')),
  raw_input       text,
  input_channel   text not null check (input_channel in ('web_text','web_photo','web_quick','telegram','mobile')),
  photo_path      text,
  status          text not null default 'draft' check (status in ('draft','confirmed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists meal_entries_user_eaten_idx on public.meal_entries (user_id, eaten_at desc);

drop trigger if exists meal_entries_set_updated_at on public.meal_entries;
create trigger meal_entries_set_updated_at
  before update on public.meal_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- entry_items (macros are a frozen snapshot at confirmation time)
-- ---------------------------------------------------------------------------
create table if not exists public.entry_items (
  id              uuid primary key default gen_random_uuid(),
  entry_id        uuid not null references public.meal_entries(id) on delete cascade,
  food_id         text references public.foods(id) on delete set null,
  name_raw        text not null,
  qty             numeric check (qty >= 0),
  unit            text,
  grams           numeric check (grams >= 0),
  kcal            numeric check (kcal >= 0),
  protein_g       numeric check (protein_g >= 0),
  carbs_g         numeric check (carbs_g >= 0),
  fat_g           numeric check (fat_g >= 0),
  is_estimated    boolean not null default false,
  confidence      text check (confidence in ('high','medium','low')),
  position        int not null default 0
);

create index if not exists entry_items_entry_id_idx on public.entry_items (entry_id);

-- ---------------------------------------------------------------------------
-- daily_reports
-- ---------------------------------------------------------------------------
create table if not exists public.daily_reports (
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  totals          jsonb not null default '{}'::jsonb,
  analysis_md     text,
  is_partial      boolean not null default false,
  generated_at    timestamptz not null default now(),
  primary key (user_id, date)
);

-- ---------------------------------------------------------------------------
-- weight_logs
-- ---------------------------------------------------------------------------
create table if not exists public.weight_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  measured_at     date not null default (now() at time zone 'utc')::date,
  weight_kg       numeric(5,1) not null check (weight_kg between 25 and 400),
  created_at      timestamptz not null default now(),
  constraint weight_logs_user_day_uniq unique (user_id, measured_at)
);

-- ---------------------------------------------------------------------------
-- quick_meals (one-tap re-log)
-- ---------------------------------------------------------------------------
create table if not exists public.quick_meals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  items           jsonb not null default '[]'::jsonb,
  last_used_at    timestamptz,
  use_count       int not null default 0 check (use_count >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists quick_meals_user_last_used_idx on public.quick_meals (user_id, last_used_at desc nulls last);

drop trigger if exists quick_meals_set_updated_at on public.quick_meals;
create trigger quick_meals_set_updated_at
  before update on public.quick_meals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.foods         enable row level security;
alter table public.portion_units enable row level security;
alter table public.meal_entries  enable row level security;
alter table public.entry_items   enable row level security;
alter table public.daily_reports enable row level security;
alter table public.weight_logs   enable row level security;
alter table public.quick_meals   enable row level security;

-- profiles: own row only (id = auth.uid())
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles for delete to authenticated using (id = auth.uid());

-- foods / portion_units: read for all authenticated users; no write policies,
-- so only the service role (which bypasses RLS) can write.
drop policy if exists foods_read_authenticated on public.foods;
create policy foods_read_authenticated on public.foods for select to authenticated using (true);
drop policy if exists portion_units_read_authenticated on public.portion_units;
create policy portion_units_read_authenticated on public.portion_units for select to authenticated using (true);

-- meal_entries: own rows
drop policy if exists meal_entries_all_own on public.meal_entries;
create policy meal_entries_all_own on public.meal_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- entry_items: through the parent entry's owner
drop policy if exists entry_items_all_own on public.entry_items;
create policy entry_items_all_own on public.entry_items for all to authenticated
  using (exists (select 1 from public.meal_entries e where e.id = entry_items.entry_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.meal_entries e where e.id = entry_items.entry_id and e.user_id = auth.uid()));

-- daily_reports: own rows
drop policy if exists daily_reports_all_own on public.daily_reports;
create policy daily_reports_all_own on public.daily_reports for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- weight_logs: own rows
drop policy if exists weight_logs_all_own on public.weight_logs;
create policy weight_logs_all_own on public.weight_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- quick_meals: own rows
drop policy if exists quick_meals_all_own on public.quick_meals;
create policy quick_meals_all_own on public.quick_meals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants (Supabase roles)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on public.foods, public.portion_units to authenticated;
grant select, insert, update, delete on public.profiles, public.meal_entries, public.entry_items,
  public.daily_reports, public.weight_logs, public.quick_meals to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
