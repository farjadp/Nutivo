-- Everyday words mapped to foods. Runs after seed.sql (migration 0002 runs before the seed on a fresh reset).
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
