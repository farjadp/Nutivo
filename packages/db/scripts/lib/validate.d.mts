export interface CsvTable { header: string[]; records: Record<string, string>[] }
export interface ValidationResult { ok: boolean; errors: string[]; warnings: string[] }
export const FOOD_COLUMNS: string[];
export const UNIT_COLUMNS: string[];
export const SOURCES: string[];
export const STATES: string[];
export const CONFIDENCES: string[];
export function parseCsv(text: string): CsvTable;
export function validateSeed(foods: CsvTable, units: CsvTable, opts?: { kcalTolerance?: number }): ValidationResult;
