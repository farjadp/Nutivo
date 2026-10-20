#!/usr/bin/env node
// Validates seed/foods_fa.csv and seed/portion_units.csv. Exits 1 on any error.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseCsv, validateSeed } from './lib/validate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const foodsPath = resolve(root, 'seed/foods_fa.csv');
const unitsPath = resolve(root, 'seed/portion_units.csv');

let foods, units;
try {
  foods = parseCsv(readFileSync(foodsPath, 'utf8'));
  units = parseCsv(readFileSync(unitsPath, 'utf8'));
} catch (e) {
  console.error(`validate-seed: cannot read/parse CSV: ${e.message}`);
  process.exit(1);
}

const result = validateSeed(foods, units);
for (const w of result.warnings) console.warn(`warning: ${w}`);
for (const e of result.errors) console.error(`error: ${e}`);
console.log(`validate-seed: ${foods.records.length} foods, ${units.records.length} portion units, ${result.errors.length} errors, ${result.warnings.length} warnings`);
process.exit(result.ok ? 0 : 1);
