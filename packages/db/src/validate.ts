// Typed re-export of the dependency-free validator used by scripts/validate-seed.mjs.
export { parseCsv, validateSeed, FOOD_COLUMNS, UNIT_COLUMNS, SOURCES, STATES, CONFIDENCES } from '../scripts/lib/validate.mjs';
export type { CsvTable, ValidationResult } from '../scripts/lib/validate.mjs';
