// clear.js

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

const TOKEN_RE = /\p{L}+/gu;
const NOISE_RE = /[\p{N}\p{P}\p{S}]/gu;
const REPEAT_RE = /(.)\1{2,}/gu;

/**
 * Clean input text and split into meaningful alphabetic tokens.
 * Removes numbers, emojis, symbols, and repeated spam-like text while
 * preserving words from any language.
 * @param {string} text - Raw input text
 * @returns {string[]} Lowercase clean tokens
 */
function tokenize(text) {
    if (!text || typeof text !== 'string') return [];

    let tokens = text.normalize('NFKC').replace(NOISE_RE, ' ').replace(/\s+/gu, ' ').trim().toLowerCase().match(TOKEN_RE) || [];
    if (tokens.length === 0) return [];

    let seen = Object.create(null);
    let filtered = [];

    for (let i = 0; i < tokens.length; i++) {
        let compact = tokens[i].replace(REPEAT_RE, '$1');
        if (compact.length < 2 || seen[compact]) continue;
        seen[compact] = 1;
        filtered.push(compact);
    }

    return filtered;
}

module.exports = { tokenize };
