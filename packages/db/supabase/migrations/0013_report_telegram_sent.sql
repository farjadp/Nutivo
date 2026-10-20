-- Nightly report pushed to Telegram at most once per day.
alter table public.daily_reports add column if not exists sent_telegram_at timestamptz;
