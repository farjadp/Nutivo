-- نوتی on or off, per account, so web, app and bot all follow one switch.
alter table public.profiles add column if not exists nuti_enabled boolean not null default true;
