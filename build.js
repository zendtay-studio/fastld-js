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
const t = require('fs');

const n = require('path');

const e = require('zlib');

const {tokenize: o, fold: s} = require('./clear');

// Script -> ISO 639-1 codes that commonly use that script.
const r = {
    Latin: [ 'en', 'es', 'fr', 'pt', 'it', 'ro', 'de', 'nl', 'sv', 'da', 'no', 'is', 'pl', 'cs', 'sk', 'hr', 'sl', 'lt', 'lv', 'et', 'fi', 'hu', 'ga', 'cy', 'sq', 'af', 'ca', 'gl', 'eu', 'ms', 'id', 'tl', 'vi', 'sw', 'zu', 'xh', 'yo', 'mt', 'la', 'fo', 'fy', 'gd', 'oc', 'wa', 'io', 'ia', 'ie', 'ee', 'fj', 'ng', 'nv', 'so', 'om', 'ig', 'ha', 
    // Latin-alphabet Turkic and other languages that were missing
    'tr', 'az', 'tt', 'tk', 'uz', 'ba', 'crh', 'gag', 'mi', 'to', 'ty', 'sm', 'ga', 'ln', 'kg', 'bi', 'ho', 'ny', 'rn', 'rw', 'sg', 'sn', 'ss', 'st', 'tn', 'ts', 've', 'za', 'hm', 
    // Small/under-resourced Latin-script languages in this dataset
    'ay', 'br', 'bs', 'ch', 'co', 'eo', 'gn', 'jv', 'kr', 'ku', 'lg', 'mh', 'nb', 'nn', 'wo' ],
    Cyrillic: [ 'ru', 'uk', 'be', 'bg', 'mk', 'sr', 'kk', 'ky', 'mn', 'tg', 'tt', 'ab', 'av', 'os', 'ce', 'cv', 'ba', 'bs' ],
    Greek: [ 'el' ],
    Armenian: [ 'hy' ],
    Georgian: [ 'ka' ],
    Hebrew: [ 'he' ],
    Arabic: [ 'ar', 'fa', 'ur', 'ps', 'sd', 'ug', 'ku' ],
    Devanagari: [ 'hi', 'mr', 'ne', 'sa', 'bh' ],
    Bengali: [ 'bn', 'as' ],
    Gurmukhi: [ 'pa' ],
    Gujarati: [ 'gu' ],
    Oriya: [ 'or' ],
    Tamil: [ 'ta' ],
    Telugu: [ 'te' ],
    Kannada: [ 'kn' ],
    Malayalam: [ 'ml' ],
    Sinhala: [ 'si' ],
    Thai: [ 'th' ],
    Lao: [ 'lo' ],
    Tibetan: [ 'bo', 'dz' ],
    Myanmar: [ 'my' ],
    Khmer: [ 'km' ],
    Han: [ 'zh', 'ja' ],
    Hiragana: [ 'ja' ],
    Katakana: [ 'ja' ],
    Hangul: [ 'ko' ],
    HangulSyll: [ 'ko' ],
    Ethiopic: [ 'am', 'ti' ],
    Syllabics: [ 'cr', 'iu' ]
};

const a = {
    MAX_WORDS_PER_LANG: 3e5,
    NGRAM_SIZES: [ 3, 4, 5 ],
    MIN_WORD_LENGTH: 3,
    TOP_NGRAMS_PER_LANG: 1e4,
    INCLUDE_FULL_WORD: true,
    TF_SCALE: 200,
    // scaling factor inside the idf*tf term (tunable sharpness)
    WEIGHT_SCALE: 64
};

// Dataset version. Bumped on every successful build so the runtime cache key
// is derived from a monotonically increasing number, never from the compressed
// file size (a regenerated model at the same byte length otherwise serves the
// stale cache). The authoritative version is the `dataVersion` embedded in the
// model's META tag; package.json's "modelVersion" mirrors it so the runtime can
// detect an updated model without decompressing the snapshot.
function i() {
    try {
        const o = n.join(__dirname, 'model.flt.gz');
        if (!t.existsSync(o)) return 0;
        const s = e.brotliDecompressSync(t.readFileSync(o));
        if (s.length < 80 || s.toString('latin1', 0, 8) !== S) return 0;
        const r = new Uint32Array(s.buffer, s.byteOffset + 16, 16);
        const a = r[0], i = r[1];
        if (!i) return 0;
        const l = JSON.parse(s.toString('utf8', a, a + i));
        const c = l && l.m && l.m.dataVersion || l && l.dataVersion;
        return Number.isInteger(c) && c > 0 ? c : 0;
    } catch {}
    return 0;
}

// Keep package.json's "modelVersion" in sync with the model's META so the
// runtime can read the dataset version without decompressing the model.
const l = n.join(__dirname, 'package.json');

function c(n) {
    try {
        const e = JSON.parse(t.readFileSync(l, 'utf8'));
        if (e.modelVersion === n) return;
        e.modelVersion = n;
        t.writeFileSync(l, JSON.stringify(e, null, 2) + '\n');
    } catch {}
}

const f = /^[a-z]{2}$/i;

const g = /^(\S+)\s+(\d+)\s*$/;

function u(n) {
    try {
        return t.readdirSync(n, {
            withFileTypes: true
        }).filter(t => t.isDirectory() && f.test(t.name)).length;
    } catch (t) {
        return 0;
    }
}

const h = u(n.join(__dirname, 'languages')) >= u(n.join(__dirname, '../languages')) ? n.join(__dirname, 'languages') : n.join(__dirname, '../languages');

function m(e) {
    const o = t.readdirSync(e, {
        withFileTypes: true
    }).filter(t => t.isFile() && t.name.endsWith('.txt')).map(t => t.name);
    // Process wiki/udhr (language-native text) before generic frequency lists,
    // so they are not skipped by MAX_WORDS_PER_LANG.
        const s = t => {
        t = t.toLowerCase();
        if (t.includes('wiki')) return 0;
        if (t.includes('udhr')) return 1;
        if (t.includes('_50k') || t.includes('_top50k') || t.includes('_full')) return 3;
        return 2;
    };
    o.sort((t, n) => s(t) - s(n) || t.localeCompare(n));
    return o.map(t => n.join(e, t));
}

// Parse a corpus file -> Map(word -> count). Frequency lists ("word count"
// lines) get real counts; other files are tokenized as plain text.
function d(n) {
    const e = t.readFileSync(n, 'utf8');
    const r = new Map;
    // Heuristic: >=60% of non-empty first lines looking like "word count" -> freq list.
        const a = e.slice(0, 4096).split('\n');
    const i = a.filter(t => t.trim()).length;
    let l = 0;
    for (let t = 0; t < a.length; t++) if (a[t] && g.test(a[t])) l++;
    if (i > 0 && l / i >= .6) {
        const t = e.split('\n');
        for (let n = 0; n < t.length; n++) {
            const e = g.exec(t[n]);
            if (!e) continue;
            const o = s(e[1].toLowerCase());
            const a = parseInt(e[2], 10);
            if (/^[\p{L}\p{M}\u0F0B]+$/u.test(o)) r.set(o, (r.get(o) || 0) + a);
        }
    } else {
        const t = o(e);
        for (let n = 0; n < t.length; n++) r.set(t[n], (r.get(t[n]) || 0) + 1);
    }
    return r;
}

function p(e, o) {
    const s = n.join(h, e);
    if (!t.existsSync(s)) return null;
    const r = m(s);
    if (r.length === 0) return null;
    // Relative frequency ratio makes gram frequencies comparable across corpora
    // of very different sizes (FrequencyWords vs small UDHR text).
        const i = new Map;
    let l = 0;
    for (const t of r) {
        for (const [n, e] of d(t)) {
            const t = i.get(n) || 0;
            i.set(n, t + e);
            l += e;
        }
        if (l >= a.MAX_WORDS_PER_LANG) break;
    }
    if (l === 0) return null;
    const c = [ ...i.entries() ].sort((t, n) => n[1] - t[1]).slice(0, a.MAX_WORDS_PER_LANG);
    const f = new Map;
    for (const [t, n] of c) {
        if (t.length < a.MIN_WORD_LENGTH) continue;
        if (a.INCLUDE_FULL_WORD) {
            const e = `#${t}`;
            f.set(e, (f.get(e) || 0) + n);
        }
        for (const e of a.NGRAM_SIZES) {
            const o = t.length - e;
            if (o < 0) continue;
            for (let s = 0; s <= o; s++) {
                const o = t.substring(s, s + e);
                f.set(o, (f.get(o) || 0) + n);
            }
        }
    }
    if (f.size === 0) return null;
    const g = [ ...f ].map(([t, n]) => [ t, n / Math.max(1, l) ]).sort((t, n) => n[1] - t[1]).slice(0, a.TOP_NGRAMS_PER_LANG);
    console.log(`   ✅ ${e} (${o}): ${g.length} n-grams (${l.toLocaleString()} words)`);
    return {
        iso: e,
        grams: new Map(g)
    };
}

function y(t) {
    const n = {};
    for (const e of Object.keys(r)) {
        const o = [];
        for (const n of r[e]) {
            const e = t.indexOf(n);
            if (e !== -1) o.push(e);
        }
        if (o.length > 0) n[e] = o;
    }
    return n;
}

async function _() {
    console.log('🚀 Building with weighted IDF scoring');
    if (!t.existsSync(h)) {
        console.error('❌ Languages folder "languages/" does not exist');
        console.error('   First download corpora by running the steps in BUILD.md');
        process.exit(1);
    }
    const o = t.readdirSync(h, {
        withFileTypes: true
    }).filter(t => t.isDirectory() && f.test(t.name)).map(t => t.name).sort();
    if (o.length === 0) {
        console.error('❌ No valid 2-letter language folders found under languages/');
        process.exit(1);
    }
    if (o.length < 50) {
        console.error(`❌ Only ${o.length} languages found — expected ~115. Aborting to avoid a corrupt model.`);
        process.exit(1);
    }
    console.log(`📁 Processing ${o.length} languages from local folder...\n`);
    const s = [];
    for (let t = 0; t < o.length; t++) {
        const n = p(o[t], t);
        if (n) s.push(n);
    }
    // Language ids are the sorted ISO codes that have data.
        const r = s.map(t => t.iso).sort();
    console.log('\n🔗 Building inverted index (gram -> langId -> freq)...');
    const l = new Map;
    // gram -> Map(langId -> count)
        for (const t of s) {
        const n = r.indexOf(t.iso);
        for (const [e, o] of t.grams) {
            let t = l.get(e);
            if (!t) {
                t = new Map;
                l.set(e, t);
            }
            t.set(n, o);
        }
    }
    console.log('⚖️  Computing IDF weights...');
    const g = r.length;
    const u = Object.create(null);
    let m = 0;
    // Pass 1: assign each (gram -> language) pair a free-form raw weight
    // (IDF x log(freq) + floor, x3 for full-word grams) and accumulate each
    // language's total raw weight, to be used for normalization in Pass 2.
        const d = new Float64Array(g);
    const _ = new Map;
    // gram -> flat array of alternating [langId, rawWeight]
        for (const [t, n] of l) {
        const e = n.size;
        // IDF down-weights near-universal grams so common words don't drown
        // out language-distinctive ones.
                const o = Math.log(g / e);
        const s = [];
        for (const [e, r] of n) {
            const n = Math.log(1 + r * a.TF_SCALE);
            let i = o * n + 5e-4;
            // tiny floor so every posting counts
                        if (t[0] === '#') {
                // Full words are the most discriminative signal for function words:
                // give them a strong multiplicative boost *before* per-lang normalization.
                i *= 3;
            }
            s.push(e, i);
            d[e] += i;
        }
        _.set(t, s);
    }
    // Pass 2: divide each weight by the square root of its language's total raw
    // weight. This is a softer normalization than L1: it tames large-corpus
    // languages while still letting distinctive high-IDF grams stand out.
        for (const [t, n] of _) {
        const e = [];
        for (let t = 0; t < n.length; t += 2) {
            const o = n[t];
            const s = n[t + 1] / Math.max(1e-9, Math.sqrt(d[o]));
            const r = Math.max(1, Math.min(4095, Math.round(s * a.WEIGHT_SCALE)));
            // Pack (weight << 7) | langId into one int: low 7 bits = language id
            // (< 128 langs), remaining upper bits = quantized weight (<= 4095).
                        e.push(r << 7 | o);
        }
        u[t] = e;
        m += n.length / 2;
    }
    _.clear();
    const S = Object.keys(u).length;
    const w = y(r);
    const L = i() + 1;
    const k = {
        type: 'WEIGHTED_IDF',
        dataVersion: L,
        generated: Date.now(),
        languages: r.length,
        ngramCount: S,
        avgLanguagesPerGram: parseFloat((m / S).toFixed(2)),
        config: a,
        source: {
            type: 'local',
            generatedAt: (new Date).toISOString()
        }
    };
    console.log('📦 Packing snapshot for fast load...');
    const M = Object.keys(u).sort();
    const A = M.length;
    const F = new Uint16Array(A);
    const E = new Uint8Array(A);
    const O = new Uint32Array(m);
    let D = 0;
    for (let t = 0; t < A; t++) {
        const n = M[t];
        F[t] = n.length;
        const e = u[n];
        E[t] = e.length;
        O.set(e, D);
        D += e.length;
    }
    // Raw flat binary container (no v8 serialization): see packFlat() below.
    // starts/offsets/hash are NOT shipped; the runtime rebuilds starts/offsets
    // (prefix sums) and the hash table once, and persists them in the tmp cache.
        const I = M.join('');
    const N = b({
        __meta: k,
        langs: r,
        scripts: w,
        grams: I,
        lens: F,
        plens: E,
        postings: O
    });
    const j = n.join(__dirname, 'model.flt.gz');
    // brotli level 10 keeps the tarball small; decompression is a single C++
    // pass and warm loads read the already-decompressed cache instead.
        t.writeFileSync(j, e.brotliCompressSync(N, {
        params: {
            [e.constants.BROTLI_PARAM_QUALITY]: 11
        }
    }));
    c(L);
    console.log(`\n🔥 Database generated!`);
    console.log(`   🏷️  Data version: ${L}`);
    console.log(`   📊 N-grams: ${S.toLocaleString()}`);
    console.log(`   🌐 Languages: ${r.length}`);
    console.log(`   💾 File: ${j}`);
    console.log(`   📦 Flat binary: ${(t.statSync(j).size / 1024 / 1024).toFixed(2)} MB (brotli q11)`);
}

// ────────────────────────────────────────────────────────────────────────────
// Flat binary container ("F4STLDF1"). Layout:
//   header 16 B : magic(8) + version u32 + endianness canary u32
//   TOC     64 B : 8 × {u32 offset, u32 byteLength}  (absolute offsets)
//   sections   : 0 META(utf8 JSON) 1 GRAMS(utf16le, 2-byte 0 pad first)
//                2 LENS(u16) 3 PLENS(u8) 4 POSTINGS(u32)
//                5 HASH(u32) 6 STARTS(u32) 7 OFFSETS(u32)   (cache only)
//   Each section starts 4-byte aligned so the loader can create zero-copy
//   TypedArray views over the same Buffer (no v8.deserialize).
const S = 'F4STLDF1';

function b(t, n) {
    const e = [];
    if (t.__meta !== undefined) e.push(Buffer.from(JSON.stringify({
        m: t.__meta,
        l: t.langs,
        s: t.scripts
    }), 'utf8')); else e.push(Buffer.alloc(0));
    const o = Buffer.from(t.grams, 'utf16le');
    e.push(Buffer.concat([ Buffer.from([ 0, 0 ]), o ]));
    // 1×u16 0x0000 pad (BOM guard)
        e.push(w(t.lens), w(t.plens), w(t.postings));
    e.push(t.hash ? w(t.hash) : Buffer.alloc(0));
    e.push(n && t.starts ? w(t.starts) : Buffer.alloc(0));
    e.push(n && t.offsets ? w(t.offsets) : Buffer.alloc(0));
    const s = Buffer.alloc(64);
    const r = [];
    let a = 16 + 64;
    for (let t = 0; t < 8; t++) {
        const n = a + 3 & ~3;
        // 4-byte alignment
                if (n !== a) r.push(Buffer.alloc(n - a));
        s.writeUInt32LE(n, t * 8);
        s.writeUInt32LE(e[t].length, t * 8 + 4);
        r.push(e[t]);
        a = n + e[t].length;
    }
    const i = Buffer.alloc(16);
    i.write(S, 0, 'latin1');
    i.writeUInt32LE(1, 8);
    i.writeUInt32LE(4276944897, 12);
    return Buffer.concat([ i, s, ...r ]);
}

function w(t) {
    return Buffer.from(t.buffer, t.byteOffset, t.byteLength);
}

_().catch(t => {
    console.error('❌ Error:', t.stack);
    process.exit(1);
});
