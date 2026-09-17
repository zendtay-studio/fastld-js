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
  ngrams: number;
  config: Record<string, unknown>;
  source: Record<string, unknown>;
  generated: string;
}

export interface ErrorResult extends Omit<DetectResult, 'code2' | 'name'> {
  code: '';
  code2: '';
  name: '';
  /** Neutral "could not decide" result object. */
  undecided: DetectResult & { code: ''; code2: 'und'; name: 'Undecided' };
}

/**
 * Neutral result returned by `detect` when the input is blank, too short
 * (`minLen`), or otherwise undecidable. `ER.undecided` is that same object.
 */
export declare const ER: ErrorResult;

/** Detect the language of `text`; returns a single result object. */
export function detect(text: string): DetectResult;
/** Detect and return the top `count` candidates as an array. */
export function detect(text: string, count: number): DetectResult[];
/** Detect with options; returns a single result object. */
export function detect(text: string, options: DetectOptions): DetectResult;
/** Detect with options and return the top `count` candidates as an array. */
export function detect(text: string, options: DetectOptions & { count: number }): DetectResult[];

/** Detect and return all ranked candidates as an array. */
export function detectAll(text: string, options?: DetectOptions): DetectResult[];

/** Model metadata (languages, ngram count, config, generation time). */
export function getDatabaseInfo(): DatabaseInfo;

/** Sorted array of all supported ISO 639-1 language codes. */
export function supportedLanguages(): string[];

/** Array of supported languages with code, three-letter code and name. */
export function languages(): LanguageInfo[];

/**
 * True if `code` is supported. Matching is case-insensitive and accepts an
 * ISO 639-1 code, an ISO 639-2/3 three-letter code, or a language name.
 */
export function hasLanguage(code: string): boolean;

/** ISO 639-2/3 three-letter code for an ISO 639-1 code, or null. */
export function code3(code: string): string | null;

/** English language name for an ISO 639-1 code, or null. */
export function name(code: string): string | null;