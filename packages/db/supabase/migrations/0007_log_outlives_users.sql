-- Audit rows must outlive the users they mention. With a foreign key, deleting a user failed:
-- the cascade deleted their profile/meals, the log trigger wrote a row pointing at that same
-- user, and the FK rejected it, rolling back the whole delete.
alter table public.activity_log drop constraint if exists activity_log_actor_id_fkey;
comment on column public.activity_log.actor_id is 'auth.users id at the time of the event; not a foreign key so logs survive user deletion';
