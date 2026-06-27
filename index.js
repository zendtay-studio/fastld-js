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
const LANG_CODES = Object.keys(ISO_MAP);
const LANG_INDEX = Object.create(null);
const INDEX_IDS = Object.create(null);
const RESULT_CACHE = new Map();
const MAX_CACHE_SIZE = 250;
const EMPTY_RESULT = Object.freeze({ code: '', code2: '', name: '', accuracy: 0, matches: 0, total: 0 });

for (let i = 0; i < LANG_CODES.length; i++) {
    LANG_INDEX[LANG_CODES[i]] = i;
}

for (const gram of Object.keys(INDEX)) {
    const langs = INDEX[gram];
    const ids = new Array(langs.length);
    for (let i = 0; i < langs.length; i++) {
        ids[i] = LANG_INDEX[langs[i]];
    }
    INDEX_IDS[gram] = ids;
}

function getCacheKey(text, options = {}) {
    if (!options || (!options.allow && !options.exclude)) return text;

    return `${text}::${JSON.stringify({
        allow: Array.isArray(options.allow) ? options.allow.map(lang => String(lang).toLowerCase()) : undefined,
        exclude: Array.isArray(options.exclude) ? options.exclude.map(lang => String(lang).toLowerCase()) : undefined
    })}`;
}

function getCachedResult(key) {
    const cached = RESULT_CACHE.get(key);
    if (!cached) return null;

    RESULT_CACHE.delete(key);
    RESULT_CACHE.set(key, cached);
    return cached;
}

function setCachedResult(key, value) {
    if (RESULT_CACHE.size >= MAX_CACHE_SIZE) {
        RESULT_CACHE.delete(RESULT_CACHE.keys().next().value);
    }
    RESULT_CACHE.set(key, value);
}

function getActiveLanguages(options = {}) {
    if (!options || (!options.allow && !options.exclude)) {
        return { activeLangs: LANG_CODES, activeSet: null };
    }

    let activeLangs = LANG_CODES;

    if (options.allow) {
        const allow = new Set(options.allow.map(lang => String(lang).toLowerCase()));
        activeLangs = activeLangs.filter(lang => allow.has(lang));
    }

    if (options.exclude) {
        const exclude = new Set(options.exclude.map(lang => String(lang).toLowerCase()));
        activeLangs = activeLangs.filter(lang => !exclude.has(lang));
    }

    const activeSet = new Set();
    for (let i = 0; i < activeLangs.length; i++) {
        activeSet.add(LANG_INDEX[activeLangs[i]]);
    }

    return { activeLangs, activeSet };
}

function getFastScore(grams, activeSet) {
    const scores = new Array(LANG_CODES.length).fill(0);
    const index = INDEX_IDS;

    for (let i = 0; i < grams.length; i++) {
        const gramLanguages = index[grams[i]];
        if (!gramLanguages) continue;

        if (!activeSet) {
            for (let j = 0; j < gramLanguages.length; j++) {
                scores[gramLanguages[j]]++;
            }
            continue;
        }

        for (let j = 0; j < gramLanguages.length; j++) {
            const langId = gramLanguages[j];
            if (activeSet.has(langId)) {
                scores[langId]++;
            }
        }
    }
    return scores;
}

function findBestLanguage(scores, totalGrams) {
    let bestIndex = -1;
    let bestMatches = -1;

    for (let i = 0; i < scores.length; i++) {
        let matches = scores[i];
        if (matches > bestMatches) {
            bestMatches = matches;
            bestIndex = i;
        }
    }

    if (bestIndex === -1) return EMPTY_RESULT;

    let lang = LANG_CODES[bestIndex];
    let isoData = ISO_MAP[lang] || { code2: 'unk', name: 'Unknown' };
    return {
        code: lang,
        code2: isoData.code2,
        name: isoData.name,
        accuracy: Number((bestMatches / totalGrams).toFixed(4)),
        matches: bestMatches,
        total: totalGrams
    };
}

function buildResults(scores, activeLangs, totalGrams, limit) {
    let ranked = [];
    for (let i = 0; i < activeLangs.length; i++) {
        let lang = activeLangs[i];
        let matches = scores[LANG_INDEX[lang]];
        if (matches > 0) ranked.push({ lang, matches, total: totalGrams });
    }

    ranked.sort((a, b) => b.matches - a.matches);

    let count = limit == null ? ranked.length : Math.min(limit, ranked.length);
    let result = new Array(count);
    for (let i = 0; i < count; i++) {
        let item = ranked[i];
        let isoData = ISO_MAP[item.lang] || { code2: 'unk', name: 'Unknown' };
        result[i] = {
            code: item.lang,
            code2: isoData.code2,
            name: isoData.name,
            accuracy: Number((item.matches / totalGrams).toFixed(4)),
            matches: item.matches,
            total: item.total
        };
    }
    return result;
}

/**
 * Extract n-grams from text
 */
function extractNGrams(text) {
    const words = tokenize(text);
    if (words.length === 0) return [];

    const ngrams = [];
    const seen = Object.create(null);
    const ngramSizes = CONFIG.NGRAM_SIZES;
    const minWordLength = CONFIG.MIN_WORD_LENGTH;
    const includeFullWord = CONFIG.INCLUDE_FULL_WORD;

    const hasSpaces = /\s/.test(text);
    if (!hasSpaces && words.length > 1) {
        const cleanText = words.join('');
        for (const n of ngramSizes) {
            for (let i = 0; i <= cleanText.length - n; i++) {
                const gram = cleanText.substring(i, i + n);
                if (!seen[gram]) {
                    seen[gram] = 1;
                    ngrams.push(gram);
                }
            }
        }
        return ngrams;
    }

    for (const word of words) {
        if (word.length < minWordLength) continue;

        if (includeFullWord) {
            const fullGram = '#' + word;
            if (!seen[fullGram]) {
                seen[fullGram] = 1;
                ngrams.push(fullGram);
            }
        }

        for (const n of ngramSizes) {
            for (let i = 0; i <= word.length - n; i++) {
                const gram = word.substring(i, i + n);
                if (!seen[gram]) {
                    seen[gram] = 1;
                    ngrams.push(gram);
                }
            }
        }
    }
    return ngrams;
}

function detectAll(text, options = {}) {
    if (!text || typeof text !== 'string') return [];

    let cacheKey = getCacheKey(text, options);
    let cached = getCachedResult(cacheKey);
    if (cached) return cached;

    let ngrams = extractNGrams(text);
    if (ngrams.length === 0) return [];

    let { activeLangs, activeSet } = getActiveLanguages(options);
    let scores = getFastScore(ngrams, activeSet);
    let result = buildResults(scores, activeLangs, ngrams.length);

    setCachedResult(cacheKey, result);
    return result;
}

function detect(text, options = {}) {
    let limit = null;
    let config = {};
    if (typeof options === 'number') {
        limit = options;
    } else if (typeof options === 'object') {
        config = options;
    }

    if (!text || typeof text !== 'string') return limit !== null ? [] : EMPTY_RESULT;

    let cacheKey = getCacheKey(text, config);
    let cached = getCachedResult(cacheKey);
    if (cached) return limit !== null ? cached.slice(0, limit) : cached[0] || EMPTY_RESULT;

    let ngrams = extractNGrams(text);
    if (ngrams.length === 0) {
        setCachedResult(cacheKey, []);
        return limit !== null ? [] : EMPTY_RESULT;
    }

    let { activeLangs, activeSet } = getActiveLanguages(config);
    let scores = getFastScore(ngrams, activeSet);
    let result = findBestLanguage(scores, ngrams.length);

    if (limit !== null) {
        let ranked = limit <= 1 ? (result ? [result] : []) : buildResults(scores, activeLangs, ngrams.length, limit);
        setCachedResult(cacheKey, ranked);
        return ranked;
    }

    setCachedResult(cacheKey, result ? [result] : []);
    return result || EMPTY_RESULT;
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
