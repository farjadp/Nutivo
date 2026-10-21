-- «حالت شیطان»: ناخنک, the opt-in trickster. Off by default; one story a day per user.
alter table public.profiles add column if not exists nakhonak_enabled boolean not null default false;

-- One row per user per local day: the story picked for that day and, once answered, how it went.
-- Only the web server (service role) touches it; RLS is on with no policies.
create table if not exists public.nakhonak_days (
  user_id           uuid not null references auth.users(id) on delete cascade,
  local_date        date not null,
  story_id          text not null,
  choice            text,
  outcome           text check (outcome in ('fall','spot','feeling','ask','skip')),
  points            int  not null default 0,
  sent_telegram_at  timestamptz,
  answered_at       timestamptz,
  created_at        timestamptz not null default now(),
  primary key (user_id, local_date)
);

alter table public.nakhonak_days enable row level security;
grant all on public.nakhonak_days to service_role;
