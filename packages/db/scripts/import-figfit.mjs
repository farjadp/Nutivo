#!/usr/bin/env node
// Imports the FigFit food database into the LOCAL Supabase stack.
//
// Licence: CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/), published by Fig Fit
// (https://figfit.ir) on Kaggle: amirparsadd/figfit-food-database. Non-commercial use only. Nutivo uses it for
// the founder's personal, local testing; rows are tagged source='figfit' and excluded from search unless
// NUTIVO_FIGFIT=on in development. Remove with: pnpm db:figfit --remove
//
// Expects seed/external/figfit/{foods.csv,food_units.csv} (git-ignored). Values are per 100 g;
// a unit's weight is multiplier × 100 g (the «گرم» unit has multiplier 0.01).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { parseCsv } from './lib/validate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(root, 'seed/external/figfit');
const REMOVE = process.argv.includes('--remove');

const status = JSON.parse(execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], { cwd: root, encoding: 'utf8' }));
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(status.API_URL)) {
  console.error(`import-figfit: refusing to run against ${status.API_URL} (local stack only: non-commercial licence)`);
  process.exit(1);
}
const db = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function removeAll() {
  const { error, count } = await db.from('foods').delete({ count: 'exact' }).eq('source', 'figfit');
  if (error) throw error;
  console.log(`import-figfit: removed ${count ?? 0} FigFit foods (their units cascade)`);
}

const fa = (s) => s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ').trim();
const num = (s) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const unitKey = (u) => u.replace(/[\s‌]/g, '');

function load() {
  if (!existsSync(resolve(dir, 'foods.csv'))) {
    console.error(`import-figfit: put foods.csv and food_units.csv in ${dir}`);
    process.exit(1);
  }
  const rows = (name) => {
    const { records } = parseCsv(readFileSync(resolve(dir, name), 'utf8'));
    return records;
  };
  return { foods: rows('foods.csv'), units: rows('food_units.csv') };
}

/** Quality gate: complete macros, plausible per-100 g totals, energy within 35% of 4p+4c+9f. */
function qualify(r) {
  const kcal = num(r.calories), p = num(r.protein), c = num(r.carbs), f = num(r.fat);
  if ([kcal, p, c, f].some((x) => x === null)) return { ok: false, why: 'missing' };
  if (kcal <= 0 || kcal > 902) return { ok: false, why: 'kcal out of range' };
  if (p < 0 || c < 0 || f < 0 || p + c + f > 101) return { ok: false, why: 'macros out of range' };
  const atwater = 4 * p + 4 * c + 9 * f;
  if (atwater === 0) return { ok: false, why: 'all macros 0' };
  const dev = Math.abs(kcal - atwater) / kcal;
  if (dev > 0.35) return { ok: false, why: 'energy mismatch' };
  return { ok: true, kcal, p, c, f, dev };
}

async function main() {
  if (REMOVE) return removeAll();
  const { foods, units } = load();
  const rejected = {};
  const keep = new Map();
  for (const r of foods) {
    const q = qualify(r);
    if (!q.ok) {
      rejected[q.why] = (rejected[q.why] ?? 0) + 1;
      continue;
    }
    const id = `figfit:${String(r.id).trim()}`;
    keep.set(String(r.id).trim(), {
      id,
      name_fa: fa(r.name),
      name_en: '',
      source: 'figfit',
      kcal_100g: round(q.kcal, 1),
      protein_100g: round(q.p),
      carbs_100g: round(q.c),
      fat_100g: round(q.f),
      cooked_factor: 1,
      state: 'as_served',
      confidence: q.dev <= 0.1 ? 'medium' : 'low',
      tags: ['figfit'],
      source_ref: `FigFit food database (CC BY-NC-SA 4.0), Kaggle amirparsadd/figfit-food-database, id ${String(r.id).trim()}`,
      notes: null,
    });
  }

  const unitRows = [];
  const seen = new Set();
  for (const u of units) {
    const food = keep.get(String(u.food_id).trim());
    if (!food) continue;
    let name = fa(u.name).replace(/^(یک|یه)\s+/, '');
    if (!name || name === 'گرم' || /^\d+\s*گرم$/.test(name)) continue;
    const grams = round(Number(u.multiplier) * 100, 1);
    if (!(grams > 0 && grams <= 3000)) continue;
    const key = `${food.id}|${unitKey(name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unitRows.push({
      food_id: food.id,
      unit_fa: name,
      unit_en: 'figfit unit',
      grams_default: grams,
      grams_min: round(grams * 0.8, 1),
      grams_max: round(grams * 1.25, 1),
      notes: 'FigFit (CC BY-NC-SA 4.0)',
    });
  }

  await removeAll();
  const list = [...keep.values()];
  for (let i = 0; i < list.length; i += 500) {
    const { error } = await db.from('foods').insert(list.slice(i, i + 500));
    if (error) throw new Error(`foods batch ${i}: ${error.message}`);
  }
  for (let i = 0; i < unitRows.length; i += 1000) {
    const { error } = await db.from('portion_units').insert(unitRows.slice(i, i + 1000));
    if (error) throw new Error(`units batch ${i}: ${error.message}`);
  }
  const medium = list.filter((f) => f.confidence === 'medium').length;
  console.log(`import-figfit: ${list.length} of ${foods.length} foods (${medium} medium, ${list.length - medium} low confidence), ${unitRows.length} units`);
  console.log(`import-figfit: rejected ${JSON.stringify(rejected)}`);
  console.log('import-figfit: licence CC BY-NC-SA 4.0 — local, non-commercial use only. Attribution: Fig Fit (figfit.ir).');
}

main().catch((e) => {
  console.error('import-figfit failed:', e.message ?? e);
  process.exit(1);
});
