// index.js

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

const fs = require('fs');
const path = require('path');
const { tokenize } = require('./clear');
const ISO_MAP = require('./iso');

const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));
const INDEX = db.data;
const META = db.__meta;
const CONFIG = META.config;

/**
 * Extract n-grams from text
 */
function extractNGrams(text) {
    const words = tokenize(text);
    const ngrams = new Set();
    
    const hasSpaces = /\\s/.test(text);
    if (!hasSpaces && words.length > 1) {
        const cleanText = text.toLowerCase().match(/\p{L}+/gu)?.join('') || '';
        for (const n of CONFIG.NGRAM_SIZES) {
            for (let i = 0; i <= cleanText.length - n; i++) {
                ngrams.add(cleanText.substring(i, i + n));
            }
        }
        return ngrams;
    }
    
    for (const word of words) {
        if (word.length < CONFIG.MIN_WORD_LENGTH) continue;
        
        if (CONFIG.INCLUDE_FULL_WORD) {
            ngrams.add('#' + word);
        }
        
        for (const n of CONFIG.NGRAM_SIZES) {
            for (let i = 0; i <= word.length - n; i++) {
                ngrams.add(word.substring(i, i + n));
            }
        }
    }
    return ngrams;
}

function detectAll(text, options = {}) {
    if (!text || typeof text !== 'string') return [];

    const ngrams = extractNGrams(text);
    if (ngrams.size === 0) return [];

    const matches = Object.create(null);
    let langs = Object.keys(ISO_MAP);

    for (const lang of langs) {
        matches[lang] = 0;
    }

    for (const gram of ngrams) {
        if (INDEX[gram]) {
            for (const lang of INDEX[gram]) {
                if (matches[lang] !== undefined) {
                    matches[lang]++;
                }
            }
        }
    }

    if (options.allow) {
        const allow = new Set(options.allow.map(l => l.toLowerCase()));
        langs = langs.filter(l => allow.has(l));
    }
    if (options.exclude) {
        const exclude = new Set(options.exclude.map(l => l.toLowerCase()));
        langs = langs.filter(l => !exclude.has(l));
    }

    const totalGrams = ngrams.size;
    const ranked = langs
        .map(lang => ({
            lang,
            matches: matches[lang],
            total: totalGrams
        }))
        .sort((a, b) => b.matches - a.matches);

    return ranked.map(item => {
        const isoData = ISO_MAP[item.lang] || { code2: "unk", name: "Unknown" };
        return {
            code: item.lang,
            code2: isoData.code2,
            name: isoData.name,
            accuracy: Number((item.matches / totalGrams).toFixed(4)),
            matches: item.matches,
            total: item.total
        };
    });
}

function detect(text, options = {}) {
    let limit = null;
    let config = {};
    if (typeof options === 'number') {
        limit = options;
    } else if (typeof options === 'object') {
        config = options;
    }
    const results = detectAll(text, config);
    if (results.length === 0) {
        return limit !== null ? [] : { code: "", code2: "", name: "", accuracy: 0, matches: 0, total: 0 };
    }
    if (limit !== null) return results.slice(0, limit);
    return results[0];
}

function getDatabaseInfo() {
    return {
        type: META.type,
        languages: META.languages,
        ngrams: META.ngramCount,
        config: CONFIG,
        source: META.source,
        generated: new Date(META.generated).toISOString()
    };
}

module.exports = { detect, detectAll, getDatabaseInfo };
