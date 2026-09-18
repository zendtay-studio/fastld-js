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
 * fastld-js ESM entry point.
 * Re-exports the CommonJS API with named exports so ESM consumers get both
 * `import fastld from 'fastld-js'` and `import { detect } from 'fastld-js'`.
 */
import e from './index.js';

export const detect = e.detect;

export const detectAll = e.detectAll;

export const getDatabaseInfo = e.getDatabaseInfo;

export const supportedLanguages = e.supportedLanguages;

export const languages = e.languages;

export const hasLanguage = e.hasLanguage;

export const code3 = e.code3;

export const name = e.name;

export default e;