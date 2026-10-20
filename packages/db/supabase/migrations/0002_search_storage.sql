-- Nutivo — food aliases + search, and private meal photo storage.

-- ---------------------------------------------------------------------------
-- Aliases: everyday words people type («برنج», «مرغ») mapped to the default
-- as-eaten food. Raw ingredients keep their explicit names only.
-- ---------------------------------------------------------------------------
alter table public.foods add column if not exists aliases text[] not null default '{}';
create index if not exists foods_aliases_idx on public.foods using gin (aliases);

update public.foods set aliases = v.aliases
from (values
  ('fa:chelo',                     array['چلو','برنج','برنج پخته','برنج سفید','پلو','rice','cooked rice']),
  ('fa:berenj-kham',               array['برنج خام','raw rice']),
  ('fa:nan-sangak',                array['سنگک','نان سنگک','sangak']),
  ('fa:nan-barbari',               array['بربری','نان بربری','barbari']),
  ('fa:nan-lavash',                array['لواش','نان لواش','نان','lavash','bread']),
  ('fa:morgh-grill-sineh',         array['مرغ','سینه مرغ','مرغ گریل','مرغ آب‌پز','مرغ اب پز','مرغ کبابی','chicken','chicken breast']),
  ('fa:morgh-sorkhshodeh',         array['مرغ سرخ‌شده','مرغ سرخ شده','مرغ سوخاری','fried chicken']),
  ('fa:gusht-gusaleh-khoreshti',   array['گوشت','گوشت گوساله','گوشت خورشتی','beef','stew beef']),
  ('fa:ghormeh-sabzi',             array['قورمه','قورمه سبزی','قورمه‌سبزی','ghormeh sabzi']),
  ('fa:gheymeh',                   array['قیمه','خورش قیمه','gheymeh']),
  ('fa:kabab-kubideh',             array['کوبیده','کباب کوبیده','کباب','kabab','koobideh']),
  ('fa:jujeh-kabab',               array['جوجه','جوجه کباب','جوجه‌کباب','joojeh']),
  ('fa:salad-shirazi',             array['سالاد شیرازی','شیرازی','سالاد','salad']),
  ('fa:mast',                      array['ماست','yogurt','yoghurt']),
  ('fa:dugh',                      array['دوغ','doogh']),
  ('fa:panir-feta',                array['پنیر','پنیر لیقوان','پنیر فتا','فتا','feta','cheese']),
  ('fa:tokhm-morgh',               array['تخم مرغ','تخم‌مرغ','تخم مرغ آب پز','نیمرو','egg','eggs']),
  ('fa:kareh',                     array['کره','butter']),
  ('fa:roghan-maye',               array['روغن','روغن مایع','روغن کانولا','oil','canola oil']),
  ('fa:khiar',                     array['خیار','cucumber']),
  ('fa:gojeh',                     array['گوجه','گوجه فرنگی','گوجه‌فرنگی','tomato']),
  ('fa:adasi',                     array['عدسی','عدس','lentil soup']),
  ('fa:ash-reshteh',               array['آش','آش رشته','ash','ash reshteh']),
  ('fa:khorma',                    array['خرما','date','dates']),
  ('fa:gerdu',                     array['گردو','walnut','walnuts'])
) as v(id, aliases)
where public.foods.id = v.id;

-- ---------------------------------------------------------------------------
-- search_foods: exact alias > alias/name word similarity. Input is normalised
-- by the app (ي→ی، ك→ک، ZWNJ kept). Runs with the caller's rights (RLS applies).
-- ---------------------------------------------------------------------------
create or replace function public.search_foods(q text, lim int default 5)
returns table (id text, score real)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with norm as (select lower(trim(regexp_replace(q, '[\s‌]+', ' ', 'g'))) as q)
  select f.id,
         greatest(
           case when exists (select 1 from unnest(f.aliases) a where lower(regexp_replace(a, '[\s‌]+', ' ', 'g')) = norm.q) then 1.0 else 0 end,
           coalesce((select max(word_similarity(lower(regexp_replace(a, '[\s‌]+', ' ', 'g')), norm.q)) from unnest(f.aliases) a), 0) * 0.9,
           word_similarity(norm.q, lower(f.name_fa)) * 0.8,
           word_similarity(norm.q, lower(f.name_en)) * 0.7
         )::real as score
  from public.foods f, norm
  order by score desc, f.id
  limit greatest(1, least(lim, 20));
$$;

grant execute on function public.search_foods(text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Private bucket for meal photos: objects live under <user_id>/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 8388608, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

drop policy if exists meal_photos_insert_own on storage.objects;
create policy meal_photos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists meal_photos_select_own on storage.objects;
create policy meal_photos_select_own on storage.objects for select to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists meal_photos_delete_own on storage.objects;
create policy meal_photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
