-- Telegram bot (phase 2). Only the web server (service role) touches these tables;
-- RLS is on with no policies, so the anon/authenticated roles see nothing.

create table if not exists public.telegram_links (
  telegram_id   bigint primary key,
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  chat_id       bigint not null,
  username      text,
  first_name    text,
  language      text,
  notify_report boolean not null default true,
  linked_at     timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- Drafts waiting for the user's confirmation in Telegram (the web app keeps drafts in the browser).
create table if not exists public.bot_drafts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  draft       jsonb not null,
  meal_type   text not null check (meal_type in ('breakfast','lunch','snack','dinner')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '2 hours'
);
create index if not exists bot_drafts_user_idx on public.bot_drafts (user_id, created_at desc);

-- One-time codes that link a Telegram chat to an existing web account (created from the «من» page).
create table if not exists public.link_codes (
  code        text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  expires_at  timestamptz not null default now() + interval '15 minutes'
);

-- Onboarding answers collected step by step in the chat.
create table if not exists public.bot_sessions (
  telegram_id bigint primary key,
  state       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.telegram_links enable row level security;
alter table public.bot_drafts     enable row level security;
alter table public.link_codes     enable row level security;
alter table public.bot_sessions   enable row level security;

grant all on public.telegram_links, public.bot_drafts, public.link_codes, public.bot_sessions to service_role;
