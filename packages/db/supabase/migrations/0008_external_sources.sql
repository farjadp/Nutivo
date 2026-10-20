-- External food sources (e.g. FigFit, CC BY-NC-SA 4.0 — local, non-commercial use only).
-- Reviewed Persian foods (fa_manual) always outrank external rows; callers can exclude sources.
-- Text in parentheses (e.g. «(بدون برنج)») is ignored when matching names.

alter table public.foods drop constraint if exists foods_source_check;
alter table public.foods add constraint foods_source_check check (source in ('fa_manual','usda','off','figfit'));

drop function if exists public.search_foods(text, int);

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
             -- exact dish name (any source) is the strongest signal
             case when lower(regexp_replace(regexp_replace(f.name_fa, '\s*\([^)]*\)', '', 'g'), '[\s\u200c]+', ' ', 'g')) = norm.q then 1.0 else 0 end,
             case when exists (select 1 from unnest(f.aliases) a where lower(regexp_replace(a, '[\s‌]+', ' ', 'g')) = norm.q) then 1.0 else 0 end,
             coalesce((select max(word_similarity(lower(regexp_replace(a, '[\s‌]+', ' ', 'g')), norm.q)) from unnest(f.aliases) a), 0) * 0.85,
             word_similarity(norm.q, lower(regexp_replace(regexp_replace(f.name_fa, '\s*\([^)]*\)', '', 'g'), '[\s‌]+', ' ', 'g'))) * 0.8,
             word_similarity(norm.q, lower(f.name_en)) * 0.7
           )
           -- reviewed foods win ties and near-ties
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
