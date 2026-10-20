import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCsv, validateSeed } from './validate';

const root = resolve(__dirname, '..');
const foods = parseCsv(readFileSync(resolve(root, 'seed/foods_fa.csv'), 'utf8'));
const units = parseCsv(readFileSync(resolve(root, 'seed/portion_units.csv'), 'utf8'));

describe('seed CSVs', () => {
  it('pass validation', () => {
    const result = validateSeed(foods, units);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('contain at least 25 foods, all with a non-gram portion unit', () => {
    expect(foods.records.length).toBeGreaterThanOrEqual(25);
    const withUnit = new Set(units.records.map((u) => u.food_id));
    for (const f of foods.records) expect(withUnit.has(f.id), `${f.id} has no unit`).toBe(true);
  });

  it('include the required Iranian staples', () => {
    const ids = new Set(foods.records.map((f) => f.id));
    for (const id of [
      'fa:chelo', 'fa:berenj-kham', 'fa:nan-sangak', 'fa:nan-barbari', 'fa:nan-lavash', 'fa:morgh-grill-sineh',
      'fa:morgh-sorkhshodeh', 'fa:gusht-gusaleh-khoreshti', 'fa:ghormeh-sabzi', 'fa:gheymeh', 'fa:kabab-kubideh',
      'fa:jujeh-kabab', 'fa:salad-shirazi', 'fa:mast', 'fa:dugh', 'fa:panir-feta', 'fa:tokhm-morgh', 'fa:kareh',
      'fa:roghan-maye', 'fa:khiar', 'fa:gojeh', 'fa:adasi', 'fa:ash-reshteh', 'fa:khorma', 'fa:gerdu',
    ]) expect(ids.has(id), `missing ${id}`).toBe(true);
  });

  it('have no high-confidence rows before human review', () => {
    expect(foods.records.filter((f) => f.confidence === 'high')).toEqual([]);
  });
});

describe('validateSeed', () => {
  const okFoods = { header: foods.header, records: [{ ...foods.records[0], id: 'fa:x', notes: '' , kcal_100g: '100', protein_100g: '10', carbs_100g: '10', fat_100g: '2.2' }] };
  const okUnits = { header: units.header, records: [{ food_id: 'fa:x', unit_fa: 'کاسه', unit_en: 'bowl', grams_default: '100', grams_min: '50', grams_max: '150', notes: '' }] };

  it('accepts a minimal valid pair', () => {
    expect(validateSeed(okFoods, okUnits).ok).toBe(true);
  });
  it('rejects kcal far from 4p+4c+9f', () => {
    const bad = { ...okFoods, records: [{ ...okFoods.records[0], kcal_100g: '200' }] };
    expect(validateSeed(bad, okUnits).errors.some((e) => e.includes('deviates'))).toBe(true);
  });
  it('rejects a food without a unit', () => {
    expect(validateSeed(okFoods, { header: units.header, records: [] }).errors.some((e) => e.includes('no portion unit'))).toBe(true);
  });
  it('rejects min > default', () => {
    const bad = { ...okUnits, records: [{ ...okUnits.records[0], grams_min: '120' }] };
    expect(validateSeed(okFoods, bad).errors.some((e) => e.includes('grams_min <= grams_default'))).toBe(true);
  });
  it('rejects duplicate ids', () => {
    const dup = { ...okFoods, records: [okFoods.records[0], okFoods.records[0]] };
    expect(validateSeed(dup, okUnits).errors.some((e) => e.includes('duplicate id'))).toBe(true);
  });
});
