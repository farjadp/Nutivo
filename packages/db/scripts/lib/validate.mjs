// Seed validation — plain ESM, no dependencies. Shared by scripts/ and src/.

export const FOOD_COLUMNS = [
  'id', 'name_fa', 'name_en', 'source', 'kcal_100g', 'protein_100g', 'carbs_100g', 'fat_100g',
  'cooked_factor', 'state', 'confidence', 'tags', 'source_ref', 'notes',
];
export const UNIT_COLUMNS = ['food_id', 'unit_fa', 'unit_en', 'grams_default', 'grams_min', 'grams_max', 'notes'];

export const SOURCES = ['fa_manual', 'usda', 'off'];
export const STATES = ['raw', 'cooked', 'as_served'];
export const CONFIDENCES = ['high', 'medium', 'low'];

/** RFC 4180-ish CSV parser: quoted fields, doubled quotes, CRLF/LF. Returns array of row objects. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = text.startsWith('﻿') ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  if (inQuotes) throw new Error('CSV: unterminated quoted field');
  const nonEmpty = rows.filter((r) => !(r.length === 1 && r[0] === ''));
  if (nonEmpty.length === 0) return { header: [], records: [] };
  const header = nonEmpty[0].map((h) => h.trim());
  const records = nonEmpty.slice(1).map((r, idx) => {
    if (r.length !== header.length) {
      throw new Error(`CSV: line ${idx + 2} has ${r.length} fields, expected ${header.length}`);
    }
    const obj = {};
    header.forEach((h, i) => { obj[h] = r[i]; });
    return obj;
  });
  return { header, records };
}

function num(v) {
  if (v === undefined || v === null || String(v).trim() === '') return NaN;
  return Number(String(v).trim());
}

const NOTES_EXEMPT_RE = /fiber|fibre|فیبر|alcohol|الکل/i;

/**
 * Validate parsed foods + units. Returns { ok, errors, warnings }.
 * @param {{header:string[], records:Record<string,string>[]}} foods
 * @param {{header:string[], records:Record<string,string>[]}} units
 */
export function validateSeed(foods, units, opts = {}) {
  const kcalTolerance = opts.kcalTolerance ?? 0.15;
  const errors = [];
  const warnings = [];

  for (const col of FOOD_COLUMNS) {
    if (!foods.header.includes(col)) errors.push(`foods: missing column "${col}"`);
  }
  for (const col of UNIT_COLUMNS) {
    if (!units.header.includes(col)) errors.push(`units: missing column "${col}"`);
  }
  if (errors.length) return { ok: false, errors, warnings };

  const ids = new Set();
  foods.records.forEach((f, i) => {
    const where = `foods row ${i + 2} (${f.id || '?'})`;
    if (!f.id) errors.push(`${where}: empty id`);
    else if (ids.has(f.id)) errors.push(`${where}: duplicate id`);
    else ids.add(f.id);
    if (!/^[a-z]+:[a-z0-9-]+$/.test(f.id)) errors.push(`${where}: id must look like "fa:slug"`);
    if (!f.name_fa) errors.push(`${where}: empty name_fa`);
    if (!f.name_en) errors.push(`${where}: empty name_en`);
    if (!SOURCES.includes(f.source)) errors.push(`${where}: source "${f.source}" not in ${SOURCES.join('|')}`);
    if (!STATES.includes(f.state)) errors.push(`${where}: state "${f.state}" not in ${STATES.join('|')}`);
    if (!CONFIDENCES.includes(f.confidence)) errors.push(`${where}: confidence "${f.confidence}" not in ${CONFIDENCES.join('|')}`);

    const kcal = num(f.kcal_100g), p = num(f.protein_100g), c = num(f.carbs_100g), fat = num(f.fat_100g);
    const cf = f.cooked_factor === '' ? 1 : num(f.cooked_factor);
    for (const [name, v, lo, hi] of [
      ['kcal_100g', kcal, 0, 900], ['protein_100g', p, 0, 100], ['carbs_100g', c, 0, 100], ['fat_100g', fat, 0, 100], ['cooked_factor', cf, 0.1, 10],
    ]) {
      if (!Number.isFinite(v)) errors.push(`${where}: ${name} is not a number`);
      else if (v < lo || v > hi) errors.push(`${where}: ${name}=${v} outside [${lo}, ${hi}]`);
    }
    if ([p, c, fat].every(Number.isFinite) && p + c + fat > 100.5) {
      errors.push(`${where}: protein+carbs+fat = ${(p + c + fat).toFixed(1)} g > 100 g`);
    }
    if ([kcal, p, c, fat].every(Number.isFinite)) {
      const atwater = 4 * p + 4 * c + 9 * fat;
      const exempt = NOTES_EXEMPT_RE.test(f.notes || '');
      if (atwater === 0 && kcal > 0) {
        errors.push(`${where}: kcal=${kcal} but macros are all zero`);
      } else if (atwater > 0) {
        const dev = Math.abs(kcal - atwater) / atwater;
        if (dev > kcalTolerance && !exempt) {
          errors.push(`${where}: kcal=${kcal} deviates ${(dev * 100).toFixed(1)}% from 4p+4c+9f=${atwater.toFixed(1)} (notes do not mention fiber/alcohol)`);
        } else if (dev > kcalTolerance) {
          warnings.push(`${where}: kcal deviates ${(dev * 100).toFixed(1)}% from Atwater; allowed because notes mention fiber/alcohol`);
        }
      }
    }
    if (f.confidence === 'high') {
      warnings.push(`${where}: confidence=high — make sure a human reviewer signed off (see seed/README.md)`);
    }
  });

  const unitsByFood = new Map();
  const unitKeys = new Set();
  units.records.forEach((u, i) => {
    const where = `units row ${i + 2} (${u.food_id || '?'} / ${u.unit_fa || '?'})`;
    if (!u.food_id) errors.push(`${where}: empty food_id`);
    else if (!ids.has(u.food_id)) errors.push(`${where}: food_id not found in foods`);
    if (!u.unit_fa) errors.push(`${where}: empty unit_fa`);
    if (!u.unit_en) errors.push(`${where}: empty unit_en`);
    const key = `${u.food_id}\u0000${u.unit_fa}`;
    if (unitKeys.has(key)) errors.push(`${where}: duplicate (food_id, unit_fa)`);
    unitKeys.add(key);
    const d = num(u.grams_default), lo = num(u.grams_min), hi = num(u.grams_max);
    for (const [name, v] of [['grams_default', d], ['grams_min', lo], ['grams_max', hi]]) {
      if (!Number.isFinite(v) || v <= 0) errors.push(`${where}: ${name} must be a positive number`);
    }
    if ([d, lo, hi].every(Number.isFinite) && !(lo <= d && d <= hi)) {
      errors.push(`${where}: expected grams_min <= grams_default <= grams_max (${lo} <= ${d} <= ${hi})`);
    }
    if (u.food_id) unitsByFood.set(u.food_id, (unitsByFood.get(u.food_id) || 0) + 1);
  });

  for (const id of ids) {
    if (!unitsByFood.get(id)) errors.push(`foods ${id}: has no portion unit (every food needs at least one unit besides grams)`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
