-- Product metrics for the admin panel (service role only).
-- Day 0 is a user's first logging day in their own timezone ("activation"), so cohorts measure
-- whether people keep logging after they start, independent of when the account was created.
create or replace function public.admin_metrics(weeks int default 8, ai_days int default 14)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with logs as (
    select distinct e.user_id,
           (e.eaten_at at time zone coalesce(p.timezone, 'America/Toronto'))::date as d
    from public.meal_entries e
    left join public.profiles p on p.id = e.user_id
    where e.status = 'confirmed'
  ),
  today as (select (now() at time zone 'America/Toronto')::date as t),
  firsts as (select user_id, min(d) as d0 from logs group by user_id),
  ret as (
    select f.user_id, f.d0,
           exists (select 1 from logs l where l.user_id = f.user_id and l.d = f.d0 + 1)  as r1,
           exists (select 1 from logs l where l.user_id = f.user_id and l.d = f.d0 + 7)  as r7,
           exists (select 1 from logs l where l.user_id = f.user_id and l.d = f.d0 + 30) as r30
    from firsts f
  ),
  freq as (
    select l.user_id, count(*)::int as days
    from logs l, today
    where l.d > today.t - 7 and l.d <= today.t
    group by l.user_id
  ),
  ai as (
    select (a.at at time zone 'America/Toronto')::date as d,
           coalesce(a.meta->>'model', 'unknown') as model,
           a.event,
           coalesce((a.meta->>'input_tokens')::bigint, 0) as tin,
           coalesce((a.meta->>'output_tokens')::bigint, 0) as tout
    from public.activity_log a, today
    where a.event in ('ai.extract', 'ai.report', 'ai.ask')
      and (a.at at time zone 'America/Toronto')::date > today.t - ai_days
  )
  select jsonb_build_object(
    'today', (select t from today),
    'retention', jsonb_build_object(
      'd1',  (select jsonb_build_object('eligible', count(*), 'retained', count(*) filter (where r1))  from ret, today where d0 + 1  <= today.t),
      'd7',  (select jsonb_build_object('eligible', count(*), 'retained', count(*) filter (where r7))  from ret, today where d0 + 7  <= today.t),
      'd30', (select jsonb_build_object('eligible', count(*), 'retained', count(*) filter (where r30)) from ret, today where d0 + 30 <= today.t)
    ),
    'cohorts', coalesce((
      select jsonb_agg(c order by c->>'week' desc)
      from (
        select jsonb_build_object(
          'week', date_trunc('week', d0)::date,
          'size', count(*),
          'd1',  jsonb_build_object('eligible', count(*) filter (where d0 + 1  <= (select t from today)), 'retained', count(*) filter (where r1)),
          'd7',  jsonb_build_object('eligible', count(*) filter (where d0 + 7  <= (select t from today)), 'retained', count(*) filter (where r7)),
          'd30', jsonb_build_object('eligible', count(*) filter (where d0 + 30 <= (select t from today)), 'retained', count(*) filter (where r30))
        ) as c
        from ret
        where d0 > (select t from today) - weeks * 7
        group by date_trunc('week', d0)
      ) x
    ), '[]'::jsonb),
    'frequency', jsonb_build_object(
      'active_7d', (select count(*) from freq),
      'avg_days',  (select coalesce(round(avg(days)::numeric, 2), 0) from freq),
      'four_plus', (select count(*) from freq where days >= 4),
      'histogram', (select jsonb_agg(jsonb_build_object('days', n, 'users', (select count(*) from freq where days = n)) order by n) from generate_series(1, 7) n)
    ),
    'ai', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'model', model, 'event', event, 'calls', calls, 'input_tokens', tin, 'output_tokens', tout) order by d)
      from (select d, model, event, count(*) as calls, sum(tin) as tin, sum(tout) as tout from ai group by d, model, event) g
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.admin_metrics(int, int) from public, anon, authenticated;
grant execute on function public.admin_metrics(int, int) to service_role;
