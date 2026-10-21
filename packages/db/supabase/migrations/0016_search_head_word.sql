-- Search: the food's first word is its head. «سیب» should land on «سیب»/«سیب سبز» before «آب سیب»,
-- and a short query must not match on two shared letters («سیب» inside «سیاه» picked tea in production).
-- fa_word_score keeps word_similarity but damps a whole-word match that is not the head word,
-- and damps partial-word matches for short queries. Everything else matches 0011.
create or replace function public.fa_word_score(q text, t text)
returns real
language sql
immutable
set search_path = public, extensions
as $$
  select case
    when t = q then 1.0
    when t like q || ' %' then word_similarity(q, t)
    when ' ' || t || ' ' like '% ' || q || ' %' then word_similarity(q, t) * 0.75
    when char_length(q) <= 4 then word_similarity(q, t) * 0.6
    else word_similarity(q, t)
  end::real
$$;

create or replace function public.search_foods(q text, lim int default 5, exclude_sources text[] default '{}')
returns table (id text, score real)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with norm as (select lower(trim(regexp_replace(q, '[\s‌]+', ' ', 'g'))) as q),
  named as (
    select f.id, f.source, f.name_fa, f.name_en, f.aliases,
           lower(trim(regexp_replace(regexp_replace(f.name_fa, '\s*\([^)]*\)', '', 'g'), '[\s‌]+', ' ', 'g'))) as n
    from public.foods f
    where not (f.source = any (exclude_sources))
  ),
  scored as (
    select f.id, f.name_fa,
           greatest(
             case when f.n = norm.q then 1.0 else 0 end,
             case when exists (select 1 from unnest(f.aliases) a where lower(regexp_replace(a, '[\s‌]+', ' ', 'g')) = norm.q) then 1.0 else 0 end,
             coalesce((select max(greatest(
                 public.fa_word_score(norm.q, lower(regexp_replace(a, '[\s‌]+', ' ', 'g'))),
                 word_similarity(lower(regexp_replace(a, '[\s‌]+', ' ', 'g')), norm.q) * 0.7
               )) from unnest(f.aliases) a), 0) * 0.85,
             public.fa_word_score(norm.q, f.n) * 0.8,
             word_similarity(norm.q, lower(f.name_en)) * 0.7
           )
           + case when f.source = 'fa_manual' then 0.05 else 0 end as score,
           similarity(norm.q, f.n) as closeness
    from named f, norm
  )
  select s.id, least(s.score, 1.0)::real
  from scored s
  order by s.score desc, s.closeness desc, length(s.name_fa), s.id
  limit greatest(1, least(lim, 20));
$$;

grant execute on function public.fa_word_score(text, text) to anon, authenticated;
grant execute on function public.search_foods(text, int, text[]) to anon, authenticated;
