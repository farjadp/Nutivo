-- Search: a short alias found inside a longer query («پلو» in «باقالی پلو») no longer scores as a near match.
-- Alias similarity now looks for the query inside the alias first; the reverse direction is damped,
-- so compound dishes rank above generic ones. Everything else matches 0008.
create or replace function public.search_foods(q text, lim int default 5, exclude_sources text[] default '{}')
returns table (id text, score real)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with norm as (select lower(trim(regexp_replace(q, '[\s‌]+', ' ', 'g'))) as q),
  scored as (
    select f.id, f.source, f.name_fa,
           greatest(
             case when lower(regexp_replace(regexp_replace(f.name_fa, '\s*\([^)]*\)', '', 'g'), '[\s‌]+', ' ', 'g')) = norm.q then 1.0 else 0 end,
             case when exists (select 1 from unnest(f.aliases) a where lower(regexp_replace(a, '[\s‌]+', ' ', 'g')) = norm.q) then 1.0 else 0 end,
             coalesce((select max(greatest(
                 word_similarity(norm.q, lower(regexp_replace(a, '[\s‌]+', ' ', 'g'))),
                 word_similarity(lower(regexp_replace(a, '[\s‌]+', ' ', 'g')), norm.q) * 0.7
               )) from unnest(f.aliases) a), 0) * 0.85,
             word_similarity(norm.q, lower(regexp_replace(regexp_replace(f.name_fa, '\s*\([^)]*\)', '', 'g'), '[\s‌]+', ' ', 'g'))) * 0.8,
             word_similarity(norm.q, lower(f.name_en)) * 0.7
           )
           + case when f.source = 'fa_manual' then 0.05 else 0 end as score,
           similarity(norm.q, lower(regexp_replace(regexp_replace(f.name_fa, '\s*\([^)]*\)', '', 'g'), '[\s‌]+', ' ', 'g'))) as closeness
    from public.foods f, norm
    where not (f.source = any (exclude_sources))
  )
  select s.id, least(s.score, 1.0)::real
  from scored s
  order by s.score desc, s.closeness desc, length(s.name_fa), s.id
  limit greatest(1, least(lim, 20));
$$;

grant execute on function public.search_foods(text, int, text[]) to anon, authenticated;
