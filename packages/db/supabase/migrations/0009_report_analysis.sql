-- Nightly report: structured analysis written by the model from engine facts,
-- plus a hash of the day's items so the app can tell when a report is out of date.
alter table public.daily_reports add column if not exists analysis jsonb;
alter table public.daily_reports add column if not exists source_hash text;
alter table public.daily_reports add column if not exists model text;
