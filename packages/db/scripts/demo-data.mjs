#!/usr/bin/env node
// Fills the LOCAL Supabase stack with demo users, meals and log events.
// Refuses to run against anything that is not localhost. Re-runnable: removes previous demo users first.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { parseCsv } from './lib/validate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const status = JSON.parse(execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], { cwd: root, encoding: 'utf8' }));
const url = status.API_URL;
const serviceKey = status.SERVICE_ROLE_KEY;
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url)) {
  console.error(`demo-data: refusing to run against ${url} (local stack only)`);
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const DOMAIN = 'nutivo.test';
const NAMES = ['sara.k', 'reza.m', 'nazanin', 'amir.h', 'leila.r', 'babak', 'mina.t', 'kian', 'parisa', 'omid.s', 'shirin', 'arash', 'elham', 'pouya', 'neda', 'farhad', 'yasmin', 'hamed', 'golnaz', 'behrad', 'tara', 'navid', 'roya', 'sina', 'maryam.a', 'dariush', 'azadeh', 'kaveh', 'nasrin', 'shayan', 'mahsa', 'ehsan', 'ladan', 'peyman'];

const foods = Object.fromEntries(
  parseCsv(readFileSync(resolve(root, 'seed/foods_fa.csv'), 'utf8')).records.map((f) => [f.id, f]),
);
const mac = (id, g) => {
  const f = foods[id];
  const r = (x) => Math.round(Number(x) * g) / 100;
  return { kcal: Math.round(Number(f.kcal_100g) * g / 100), protein_g: r(f.protein_100g), carbs_g: r(f.carbs_100g), fat_g: r(f.fat_100g) };
};
const MENUS = {
  breakfast: [
    { raw: 'نان سنگک و پنیر و گردو', items: [['fa:nan-sangak', 1, 'برش', 60], ['fa:panir-feta', 30, 'گرم', 30], ['fa:gerdu', 3, 'عدد', 12]] },
    { raw: 'دو تا تخم مرغ با نان لواش', items: [['fa:tokhm-morgh', 2, 'عدد', 100], ['fa:nan-lavash', 2, 'عدد', 80]] },
    { raw: 'نیمرو و خیار و گوجه', items: [['fa:tokhm-morgh', 2, 'عدد', 100], ['fa:khiar', 1, 'عدد', 120], ['fa:gojeh', 1, 'عدد', 120]] },
  ],
  lunch: [
    { raw: 'دو کفگیر برنج و جوجه کباب', items: [['fa:chelo', 2, 'کفگیر', 200], ['fa:jujeh-kabab', 1, 'سیخ', 120]] },
    { raw: 'قورمه سبزی با چلو', items: [['fa:chelo', 2, 'کفگیر', 200], ['fa:ghormeh-sabzi', 1, 'کاسه', 250]] },
    { raw: 'چلو کباب کوبیده با سالاد شیرازی', items: [['fa:chelo', 2, 'کفگیر', 200], ['fa:kabab-kubideh', 2, 'سیخ', 160], ['fa:salad-shirazi', 1, 'کاسه', 150]] },
  ],
  snack: [
    { raw: 'ماست و خیار', items: [['fa:mast', 1, 'کاسه', 150], ['fa:khiar', 1, 'عدد', 120]] },
    { raw: 'دو تا خرما و چند تا گردو', items: [['fa:khorma', 2, 'عدد', 48], ['fa:gerdu', 4, 'عدد', 16]] },
  ],
  dinner: [
    { raw: 'عدسی', items: [['fa:adasi', 1, 'کاسه', 250], ['fa:nan-sangak', 1, 'برش', 60]] },
    { raw: 'قیمه با یک کفگیر برنج', items: [['fa:gheymeh', 1, 'کاسه', 250], ['fa:chelo', 1, 'کفگیر', 100]] },
    { raw: 'سینه مرغ گریل و سالاد', items: [['fa:morgh-grill-sineh', 1, 'تکه', 150], ['fa:salad-shirazi', 1, 'کاسه', 150]] },
  ],
};
const pick = (arr, n) => arr[n % arr.length];

async function removeOldDemoUsers() {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const demo = data.users.filter((u) => u.email?.endsWith(`@${DOMAIN}`));
    for (const u of demo) {
      const { error: dErr } = await db.auth.admin.deleteUser(u.id);
      if (dErr) throw new Error(`could not remove old demo user ${u.email}: ${dErr.message}`);
    }
    if (data.users.length < 200) break;
  }
}

async function main() {
  await removeOldDemoUsers();
  // Logs from previous demo runs outlive their users (by design); clear them so stats stay honest.
  await db.from('activity_log').delete().like('actor_email', `%@${DOMAIN}`);
  const now = Date.now();
  let meals = 0;
  for (let i = 0; i < NAMES.length; i++) {
    const email = `${NAMES[i]}@${DOMAIN}`;
    const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { demo: true } });
    if (error) throw new Error(`${email}: ${error.message}`);
    const uid = data.user.id;

    const sex = i % 2 ? 'female' : 'male';
    const kcal = 1500 + ((i * 113) % 900);
    if (i % 6 !== 5) {
      await db.from('profiles').insert({
        id: uid, sex, age: 24 + (i * 7) % 30, height_cm: sex === 'male' ? 172 + (i % 12) : 158 + (i % 10), weight_kg: 58 + (i * 5) % 40,
        activity: ['sedentary', 'light', 'moderate', 'active'][i % 4], goal: ['lose', 'lose', 'maintain', 'gain'][i % 4],
        goal_kcal: kcal, goal_protein_g: Math.round(kcal * 0.07), goal_carbs_g: Math.round(kcal * 0.11), goal_fat_g: Math.round(kcal * 0.032),
        status: i === 6 ? 'blocked' : 'active',
      });
    }
    if (i === 0) await db.from('admin_users').insert({ user_id: uid });
    if (i === 6) await db.auth.admin.updateUserById(uid, { ban_duration: '876000h' });

    // Engagement falls off with i, so lists and stats look like a real cohort.
    const activeDays = Math.max(0, 14 - Math.floor(i / 2.5));
    for (let d = 0; d < activeDays; d++) {
      if ((i + d) % 7 === 3) continue; // a missed day here and there
      for (const [mt, hour] of [['breakfast', 8], ['lunch', 13], ['snack', 16], ['dinner', 20]]) {
        if (mt === 'snack' && (i + d) % 2) continue;
        if (mt === 'dinner' && (i + d) % 5 === 0) continue;
        const menu = pick(MENUS[mt], i + d);
        const at = new Date(now - d * 86400000);
        at.setUTCHours(hour + 4, (i * 7) % 60, 0, 0); // Toronto time
        if (at.getTime() > now) continue;
        const photo = (i + d + hour) % 3 === 0;
        const { data: entry, error: eErr } = await db.from('meal_entries').insert({
          user_id: uid, eaten_at: at.toISOString(), meal_type: mt, raw_input: menu.raw,
          input_channel: photo ? 'web_photo' : 'web_text', status: 'confirmed',
        }).select('id').single();
        if (eErr) throw eErr;
        await db.from('entry_items').insert(menu.items.map(([fid, qty, unit, g], position) => ({
          entry_id: entry.id, food_id: fid, name_raw: foods[fid].name_fa, qty, unit, grams: g, ...mac(fid, g),
          is_estimated: photo, confidence: photo ? 'medium' : 'high', position,
        })));
        meals++;
        if (d < 2) {
          await db.from('activity_log').insert({
            at: new Date(at.getTime() - 60000).toISOString(), kind: 'system', event: 'ai.extract', actor_id: uid, actor_email: email,
            message: `${photo ? 'photo' : 'text'} → ${menu.items.length} items`,
            meta: { model: 'claude-sonnet-5-5', ms: photo ? 3200 + i * 40 : 1500 + i * 25, input_tokens: photo ? 2400 : 1150, output_tokens: 160 + menu.items.length * 20, input: photo ? 'photo' : 'text', items: menu.items.length, demo: true },
          });
        }
      }
    }
  }
  await db.from('activity_log').insert([
    { kind: 'system', level: 'warn', event: 'ai.extract_failed', actor_email: `kian@${DOMAIN}`, message: 'غذایی پیدا نکردم. مثلاً بنویس «دو کفگیر برنج و یک تکه مرغ».', meta: { input: 'text', demo: true } },
    { kind: 'system', level: 'error', event: 'ai.extract_failed', actor_email: `parisa@${DOMAIN}`, message: 'ارتباط با سرویس هوش مصنوعی برقرار نشد.', meta: { input: 'photo', cause: '529 overloaded (demo)', demo: true } },
  ]);
  console.log(`demo-data: ${NAMES.length} users (@${DOMAIN}), ${meals} meals, admin = ${NAMES[0]}@${DOMAIN}, blocked = ${NAMES[6]}@${DOMAIN}`);
}

main().catch((e) => {
  console.error('demo-data failed:', e.message ?? e);
  process.exit(1);
});
