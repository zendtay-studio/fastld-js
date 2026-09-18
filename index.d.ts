/*
 * Copyright 2026 ZendTay Studio
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Type definitions for fastld-js.
 *
 * Pure-JS, zero-dependency language detection using 3/4/5-gram matching.
 *
 * @throws Any API call may throw an `Error` if the bundled language model
 * fails to load (missing/corrupt `model.flt.gz`) or the internal hash index
 * is found to be full or corrupt. Public inputs never throw — invalid text
 * and options return the neutral result instead.
 */

export interface DetectOptions {
  /** Restrict detection to these language codes (ISO 639-1). */
  allow?: string[];
  /** Never consider these language codes (ISO 639-1). */
  exclude?: string[];
  /**
   * Minimum length of the trimmed input text (in characters). Shorter input
   * returns the undecided result instead of guessing. Alias: `minLength`.
   */
  minLen?: number;
  /** Alias for `minLen`. */
  minLength?: number;
  /**
   * `detect` only: return the top `count` results as an array. Only a
   * non-negative integer is honored; negative, fractional or `NaN` values
   * are ignored and a single result is returned.
   */
  count?: number;
}

export interface DetectResult {
  /** ISO 639-1 two-letter code, or '' when undecided. */
  code: string;
  /** ISO 639-2/3 three-letter code, or 'und' when undecided. */
  code2: string;
  /** English language name, or 'Undecided'. */
  name: string;
  /** Fraction of extracted grams that matched this language. */
  accuracy: number;
  /** Number of grams that matched this language. */
  matches: number;
  /** Total number of grams extracted from the text. */
  total: number;
  /** True when a language was detected; false for the undecided result. */
  detect: boolean;
}

export interface LanguageInfo {
  /** ISO 639-1 two-letter code. */
  code: string;
  /** ISO 639-2/3 three-letter code. */
  code2: string;
  /** English language name. */
  name: string;
}

export interface DatabaseInfo {
  type: string;
  /** Monotonic dataset version, bumped on every `npm run build`. */
  dataVersion: number;
  languages: number;
  /** Total number of n-grams in the model (3/4/5-grams, all together). */
  ngrams: number;
  /** Total number of grams in the model (equals `ngrams`). */
  modelNgrams: number;
  config: Record<string, unknown>;
  source: Record<string, unknown>;
  generated: string;
}

/**
 * Detect the language of `text`; returns a single result object. Undecidable
 * input (blank, too short, `null`/non-string) yields the neutral result
 * `{ code: '', code2: 'und', name: 'Undecided', accuracy: 0, matches: 0, total: 0 }`.
 *
 * @throws If the bundled model is missing or corrupt (first call lazy-loads it).
 */
export function detect(text: string): DetectResult;
/** Detect and return the top `count` candidates as an array. Only a non-negative
 * integer is honored; negative, fractional or `NaN` counts are ignored and a
 * single result object is returned. */
export function detect(text: string, count: number): DetectResult[];
/** Detect with options and return the top `count` candidates as an array
 * (same validation as the numeric form: non-negative integer only). */
export function detect(text: string, options: DetectOptions & { count: number }): DetectResult[];
/** Detect with options; returns a single result object. */
export function detect(text: string, options: DetectOptions): DetectResult;

/** Detect and return all ranked candidates as an array.
 * @throws If the bundled model is missing or corrupt (first call lazy-loads it). */
export function detectAll(text: string, options?: DetectOptions): DetectResult[];

/** Model metadata (languages, ngram count, config, generation time).
 * @throws If the bundled model is missing or corrupt (first call lazy-loads it). */
export function getDatabaseInfo(): DatabaseInfo;

/** Sorted array of all supported ISO 639-1 language codes.
 * @throws If the bundled model is missing or corrupt (first call lazy-loads it). */
export function supportedLanguages(): string[];

/** Array of supported languages with code, three-letter code and name.
 * @throws If the bundled model is missing or corrupt (first call lazy-loads it). */
export function languages(): LanguageInfo[];

/**
 * True if `code` is supported. Matching is case-insensitive and accepts an
 * ISO 639-1 code, an ISO 639-2/3 three-letter code, or a language name.
 *
 * @throws If the bundled model is missing or corrupt (first call lazy-loads it).
 */
export function hasLanguage(code: string): boolean;

/**
 * ISO 639-2/3 three-letter code for a language. Accepts an ISO 639-1
 * (2-letter) code, an ISO 639-2/3 (3-letter) code, or an English name as
 * input, case-insensitively. Returns null when unknown.
 *
 * @throws If the bundled model is missing or corrupt (first call lazy-loads it).
 */
export function code3(code: string): string | null;

/**
 * English language name for a language. Accepts an ISO 639-1 (2-letter)
 * code, an ISO 639-2/3 (3-letter) code, or an English name as input,
 * case-insensitively. Returns null when unknown.
 *
 * @throws If the bundled model is missing or corrupt (first call lazy-loads it).
 */
export function name(code: string): string | null;

declare const fastld: {
  detect: typeof detect;
  detectAll: typeof detectAll;
  getDatabaseInfo: typeof getDatabaseInfo;
  supportedLanguages: typeof supportedLanguages;
  languages: typeof languages;
  hasLanguage: typeof hasLanguage;
  code3: typeof code3;
  name: typeof name;
};

/** Default export (ESM only) — the full module surface. */
export default fastld;