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
const n = require('path');

const {tokenize: t} = require('./clear');

const e = require('./lang-name');

// Flat BMP script lookup: Uint8Array(0x10000). Value = script index (1..32),
// 0 = Latin (counted separately), 255 = no known script. O(1) per char.
const r = [ // script name indexed by table value
'', 'Devanagari', 'Bengali', 'Gurmukhi', 'Gujarati', 'Oriya', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Sinhala', 'Thai', 'Lao', 'Tibetan', 'Myanmar', 'Georgian', 'Hangul', 'Cherokee', 'Syllabics', 'Khmer', 'Cyrillic', 'LatinExt', 'Greek', 'Armenian', 'Hebrew', 'Arabic', 'Hiragana', 'Katakana', 'HangulSyll', 'Han', 'HanCompat', 'Ethiopic' ];

const o = new Uint8Array(65536);

// BMP: codepoint → script id
const l = {};

// name → table value (Latin is implicit 0)
for (let n = 0; n < r.length; n++) l[r[n]] = n;

o.fill(255);

for (const [n, t, name] of [ [ 65, 591, 'Latin' ], [ 2304, 2431, 'Devanagari' ], [ 2432, 2559, 'Bengali' ], [ 2560, 2687, 'Gurmukhi' ], [ 2688, 2815, 'Gujarati' ], [ 2816, 2943, 'Oriya' ], [ 2944, 3071, 'Tamil' ], [ 3072, 3199, 'Telugu' ], [ 3200, 3327, 'Kannada' ], [ 3328, 3455, 'Malayalam' ], [ 3456, 3583, 'Sinhala' ], [ 3584, 3711, 'Thai' ], [ 3712, 3839, 'Lao' ], [ 3840, 4095, 'Tibetan' ], [ 4096, 4255, 'Myanmar' ], [ 4256, 4351, 'Georgian' ], [ 4352, 4607, 'Hangul' ], [ 4608, 4991, 'Ethiopic' ], [ 5024, 5119, 'Cherokee' ], [ 5120, 5759, 'Syllabics' ], [ 6016, 6143, 'Khmer' ], [ 1024, 1279, 'Cyrillic' ], [ 1328, 1423, 'Armenian' ], [ 1424, 1535, 'Hebrew' ], [ 1536, 1791, 'Arabic' ], [ 7680, 7935, 'LatinExt' ], [ 880, 1023, 'Greek' ], [ 12352, 12447, 'Hiragana' ], [ 12448, 12543, 'Katakana' ], [ 19968, 40959, 'Han' ], [ 44032, 55215, 'HangulSyll' ], [ 63744, 64255, 'HanCompat' ] ]) {
    const e = l[name];
    // Latin → 0, others → 1..31
        for (let r = n; r <= t; r++) o[r] = e;
}

function s(n) {
    if (!n || typeof n !== 'string') return {};
    const t = Object.create(null);
    let e = 0;
    for (let l = 0; l < n.length; l++) {
        const s = n.charCodeAt(l);
        if (s < 65536) {
            const n = o[s];
            if (n === 0) {
                e++;
                continue;
            }
            if (n < 255) {
                const e = r[n];
                t[e] = (t[e] || 0) + 1;
            }
        } else if (s >= 131072 && s <= 173791) {
            t['HanExtB'] = (t['HanExtB'] || 0) + 1;
        }
    }
    if (e > 0) t['Latin'] = e;
    return t;
}

// ────────────────────────────────────────────────────────────────────────────
// Flat binary container ("F4STLDF1"), same layout as build.js packFlat().
// header magic(8) + version u32 + canary u32; TOC 64 B = 8 × {u32 off, u32 len}
//  0 META(utf8 JSON) 1 GRAMS(utf16le, 2-byte 0 pad) 2 LENS(u16) 3 PLENS(u8)
//  4 POSTINGS(u32) 5 HASH(u32) 6 STARTS(u32) 7 OFFSETS(u32)   (5-7: cache only)
const a = 'F4STLDF1';

const c = 1;

// container format version (header u32 @8)
const i = 4276944897;

// endianness canary (header u32 @12)
// There is deliberately NO sidecar version manifest. The build version is the
// authoritative `dataVersion` embedded in the model's META tag. At startup the
// library reads package.json's "modelVersion" (bumped by build.js on every
// build) and compares it with the version stored in the cached decompressed
// model: equal ⇒ the cache matches the current build and is reused without
// decompressing model.flt.gz; different ⇒ the model was updated, so the new
// model.flt.gz is decompressed into a single version-keyed tmp cache file.
const f = 'fastld-js-d';

// version-keyed decompressed cache files
const u = /^fastld-js(?:-v\d+)?-[ds]\d+\.flt$/;

function d() {
    const t = require('fs');
    const e = require('os');
    const r = require('zlib');
    const o = n.join(__dirname, 'model.flt.gz');
    const l = e.tmpdir();
    let s = null;
    try {
        const e = JSON.parse(t.readFileSync(n.join(__dirname, 'package.json'), 'utf8'));
        if (Number.isInteger(e.modelVersion) && e.modelVersion > 0) s = e.modelVersion;
    } catch {}
    const a = s != null ? n.join(l, `${f}${s}.flt`) : null;
    let c = null;
    if (a != null) {
        try {
            const n = m(t.readFileSync(a));
            if (n.__meta && n.__meta.dataVersion === s) c = n;
        } catch {}
    }
    if (c) {
        g(a);
        return c;
    }
    // Cache missing, stale, or no version available ⇒ decompress the model.
        try {
        c = m(r.brotliDecompressSync(t.readFileSync(o)));
    } catch (n) {
        throw new Error(`fastld-js: failed to load the language model (${o}): ${n.message}`);
    }
    if (!c.starts) w(c);
    if (!c.hash) c.hash = S(c);
    // The META tag's dataVersion is authoritative for naming; package.json is
    // only a pre-check so an updated model never reuses an old cache file.
        const i = c.__meta && c.__meta.dataVersion;
    const u = Number.isInteger(i) && i > 0 ? i : s;
    try {
        const e = n.join(l, `${f}${u}.flt`);
        t.writeFileSync(e, h(c));
        g(e);
    } catch {}
    return c;
}

// Remove stale fastld-js caches (old data versions / size-keyed names) from the
// shared tmp dir. Failures are ignored: the cache is a best-effort optimization.
function g(t) {
    const e = require('fs');
    const r = n.dirname(t);
    const o = n.basename(t);
    let l;
    try {
        l = e.readdirSync(r);
    } catch {
        return;
    }
    for (const t of l) {
        if (t === o || !u.test(t)) continue;
        try {
            e.unlinkSync(n.join(r, t));
        } catch {}
    }
}

// Instantiate the model from a flat buffer via zero-copy typed-array views;
// throws on anything that is not a valid F4STLDF1 container (cache miss/stale).
function m(n) {
    if (!n || n.length < 80 || n.toString('latin1', 0, 8) !== a) throw new Error('bad container');
    if (n.readUInt32LE(8) !== c || n.readUInt32LE(12) !== i) throw new Error('bad container version');
    const t = new Uint32Array(n.buffer, n.byteOffset + 16, 16);
    const e = [], r = [];
    for (let n = 0; n < 8; n++) {
        e[n] = t[n * 2];
        r[n] = t[n * 2 + 1];
    }
    const o = JSON.parse(n.toString('utf8', e[0], e[0] + r[0]));
    const l = {
        __meta: o.m,
        langs: o.l,
        scripts: o.s,
        // Zero-copy Uint16Array view == UTF-16LE string code units; no decode.
        grams: new Uint16Array(n.buffer, n.byteOffset + e[1] + 2, (r[1] - 2) / 2),
        lens: new Uint16Array(n.buffer, n.byteOffset + e[2], r[2] / 2),
        plens: new Uint8Array(n.buffer, n.byteOffset + e[3], r[3]),
        postings: new Uint32Array(n.buffer, n.byteOffset + e[4], r[4] / 4),
        _buf: n
    };
    if (r[5]) l.hash = new Uint32Array(n.buffer, n.byteOffset + e[5], r[5] / 4);
    if (r[6]) l.starts = new Uint32Array(n.buffer, n.byteOffset + e[6], r[6] / 4);
    if (r[7]) l.offsets = new Uint32Array(n.buffer, n.byteOffset + e[7], r[7] / 4);
    return l;
}

// Re-pack a loaded model (hash + starts + offsets included) for the tmp cache.
function h(n) {
    const t = [ Buffer.from(JSON.stringify({
        m: n.__meta,
        l: n.langs,
        s: n.scripts
    }), 'utf8'), Buffer.concat([ Buffer.from([ 0, 0 ]), y(n.grams) ]), y(n.lens), y(n.plens), y(n.postings), n.hash ? y(n.hash) : Buffer.alloc(0), n.starts ? y(n.starts) : Buffer.alloc(0), n.offsets ? y(n.offsets) : Buffer.alloc(0) ];
    const e = Buffer.alloc(64);
    const r = [];
    let o = 16 + 64;
    for (let n = 0; n < 8; n++) {
        const l = o + 3 & ~3;
        if (l !== o) r.push(Buffer.alloc(l - o));
        e.writeUInt32LE(l, n * 8);
        e.writeUInt32LE(t[n].length, n * 8 + 4);
        r.push(t[n]);
        o = l + t[n].length;
    }
    const l = Buffer.alloc(16);
    l.write(a, 0, 'latin1');
    l.writeUInt32LE(1, 8);
    l.writeUInt32LE(4276944897, 12);
    return Buffer.concat([ l, e, ...r ]);
}

function y(n) {
    return Buffer.from(n.buffer, n.byteOffset, n.byteLength);
}

// Rebuild cumulative start offsets (into grams) and posting offsets (into
// postings) from lens/plens. This is what build.js used to ship precomputed.
function w(n) {
    if (n.starts && n.offsets) return;
    const t = n.lens, e = n.plens, r = t.length;
    const o = new Uint32Array(r), l = new Uint32Array(r);
    let s = 0, a = 0;
    for (let n = 0; n < r; n++) {
        o[n] = s;
        s += t[n];
        l[n] = a;
        a += e[n];
    }
    n.starts = o;
    n.offsets = l;
}

// Open-addressing FNV-1a hash table: gram -> index in the packed arrays.
// Capacity = next power of two keeping the load factor <= ~0.65 (vs the old
// ~0.31 which wasted ~50% RAM on a sparse table); still O(1) lookups with a
// couple of probes on average, capped at 16M slots so the serialized cache
// stays bounded for very large gram counts.
const b = 1 << 24;

const L = .65;

function p(n, t, e) {
    const r = t.length;
    let o = 1 << 14;
    while (o < r / L && o < b) o <<= 1;
    if (r >= o) throw new Error(`fastld-js: model hash table too small (${r} grams, ${o} slots)`);
    const l = o - 1;
    const s = new Uint32Array(o);
    s.fill(A);
    for (let o = 0; o < r; o++) {
        let r = K(n, t[o], e[o]) & l;
        while (s[r] !== A) r = r + 1 & l;
        s[r] = o;
    }
    return s;
}

function S(n) {
    return p(n.grams, n.starts, n.lens);
}

const A = 4294967295;

// sentinel for unoccupied hash slots
let U = null, _ = null, C = null, O = null, E = 0, j = null, k = null;

let I = null, x = null, B = null, H = null, N = null, $ = null, F = 0;

let G = null, T = 0;

let D = null, M = null;

// scratch score/hit arrays, sized after model load
let q = false;

// Deferred model load: require() is ~instant; the 17 MB snapshot is only
// materialized on the first detect/detectAll/getDatabaseInfo call. The model
// is a single flat index containing all n-grams (3/4/5-grams) together; no
// size subsetting is performed at runtime.
function z() {
    if (q) return;
    if (U == null) U = d();
    _ = U.__meta;
    C = _.config;
    O = U.langs;
    // sorted ISO codes = language ids
        E = O.length;
    j = Object.create(null);
    k = U.scripts || {};
    for (let n = 0; n < E; n++) j[O[n]] = n;
    D = new Float64Array(E);
    M = new Int32Array(E);
    I = U.grams;
    x = U.starts;
    B = U.lens;
    H = U.plens;
    N = U.offsets;
    $ = U.postings;
    F = x.length;
    if (U.hash) {
        G = U.hash;
    } else {
        G = S(U);
        U.hash = G;
    }
    T = G.length - 1;
    q = true;
}

// FNV-1a hash over str[s .. s+l); string path defaults to the whole string.
function V(n, t = 0, e = n.length) {
    let r = 2166136261;
    for (let o = 0; o < e; o++) r = (r ^ n.charCodeAt(t + o)) * 16777619 >>> 0;
    return r;
}

// FNV-1a over a Uint16Array (packed-grams) range; array index reads beat
// charCodeAt on the equivalent string (~1.7-2.8x faster in microbench).
function K(n, t, e) {
    let r = 2166136261;
    for (let o = 0; o < e; o++) r = (r ^ n[t + o]) * 16777619 >>> 0;
    return r;
}

// True if the range (str[s..s+l)) equals gram-table entry i (compared against
// the packed grams via direct code-unit reads — no substring allocation).
function v(n, t, e, r) {
    const o = B[n];
    if (o !== r) return false;
    const l = x[n];
    for (let n = 0; n < r; n++) if (I[l + n] !== t.charCodeAt(e + n)) return false;
    return true;
}

const J = new Map;

// small LRU result cache
const R = 250;

const W = 300;

// max grams extracted per text
// Neutral "could not decide" result. Returned for blank input and whenever
// minLen is set but the text is shorter than the requested threshold.
const Z = Object.freeze({
    code: '',
    code2: 'und',
    name: 'Undecided',
    accuracy: 0,
    matches: 0,
    total: 0,
    detect: false
});

function P(n, t = {}, e = '') {
    if (!t || !t.allow && !t.exclude && t.minLen == null && t.minLength == null && t.count == null) return `${e}::${n}`;
    return `${e}::${n}::${JSON.stringify({
        allow: Array.isArray(t.allow) ? t.allow.map(n => String(n).toLowerCase()) : undefined,
        exclude: Array.isArray(t.exclude) ? t.exclude.map(n => String(n).toLowerCase()) : undefined,
        minLen: t.minLen != null ? t.minLen : t.minLength != null ? t.minLength : undefined,
        count: t.count != null ? t.count : undefined
    })}`;
}

function Q(n) {
    const t = J.get(n);
    if (!t) return null;
    J.delete(n);
    J.set(n, t);
    return t;
}

function X(n, t) {
    if (J.size >= R) J.delete(J.keys().next().value);
    J.set(n, t);
}

// Fresh copies on cache reads so callers never share (and could corrupt) the
// cached arrays/objects. The frozen undecided result is deliberately returned
// by reference, so it is never copied.
function Y(n) {
    return n ? {
        code: n.code,
        code2: n.code2,
        name: n.name,
        accuracy: n.accuracy,
        matches: n.matches,
        total: n.total,
        detect: n.detect
    } : n;
}

function nn(n) {
    const t = new Array(n.length);
    for (let e = 0; e < n.length; e++) t[e] = Y(n[e]);
    return t;
}

// Candidate language ids: script prefilter + allow/exclude. null means all.
function tn(n, t = {}) {
    let e = null;
    const r = s(n);
    if (r) {
        const n = new Set;
        for (const t in r) {
            const e = k[t];
            if (e) for (const t of e) n.add(t);
        }
        if (n.size > 0) e = n;
    }
    if (t.allow) {
        const n = new Set(t.allow.map(n => String(n).toLowerCase()));
        const r = new Set;
        for (const t of n) if (j[t] !== undefined) r.add(j[t]);
        if (r.size > 0) e = e ? new Set([ ...e ].filter(n => r.has(n))) : r;
    }
    if (t.exclude) {
        const n = new Set(t.exclude.map(n => String(n).toLowerCase()));
        const r = new Set;
        for (const t of n) if (j[t] !== undefined) r.add(j[t]);
        if (e) {
            e = new Set([ ...e ].filter(n => !r.has(n)));
        } else {
            e = new Set;
            for (let n = 0; n < E; n++) if (!r.has(n)) e.add(n);
        }
    }
    return e;
}

// Locate a gram range [str, s, l) in the hash table; -1 if absent. Probing is
// bounded to the table size so a full/corrupt table throws instead of looping.
function en(n, t, e) {
    let r = V(n, t, e) & T;
    const o = G.length;
    for (let l = 0; l < o; l++) {
        const o = G[r];
        if (o === A) return -1;
        if (v(o, n, t, e)) return o;
        r = r + 1 & T;
    }
    throw new Error('fastld-js: hash table exhausted — model index is full or corrupt');
}

// Weighted-IDF voting against the inverted index. Each postings int packs
// (weight << 7) | langId: low 7 bits = lang id (< 128), rest = weight.
// gs holds a flat gram list: [str, start, len, str, start, len, ...].
function rn(n, t) {
    const e = D, r = M;
    for (let n = 0; n < E; n++) {
        e[n] = 0;
        r[n] = 0;
    }
    for (let o = 0; o < n.length; o += 3) {
        const l = en(n[o], n[o + 1], n[o + 2]);
        if (l < 0) continue;
        const s = N[l], a = H[l];
        for (let n = s; n < s + a; n++) {
            const o = $[n];
            const l = o & 127;
            if (!t || t.has(l)) {
                e[l] += o >>> 7;
                r[l]++;
            }
        }
    }
    return e;
}

// Best single language; near-ties (e.g. Tibetan vs Dzongkha) resolved by
// preferring more matched grams when within 10% of the best score.
function on(n, t, r) {
    let o = -1, l = -1;
    for (let t = 0; t < E; t++) if (n[t] > l) {
        l = n[t];
        o = t;
    }
    if (o === -1 || l <= 0) return Z;
    let s = o, a = t[o];
    const c = l * .9;
    for (let e = 0; e < E; e++) {
        if (e === o) continue;
        if (n[e] >= c && t[e] > a) {
            s = e;
            a = t[e];
        }
    }
    o = s;
    l = n[s];
    const i = O[o];
    const f = e[i] || {
        code2: 'unk',
        name: 'Unknown'
    };
    const u = t[o];
    return {
        code: i,
        code2: f.code2,
        name: f.name,
        accuracy: r > 0 ? Number((u / r).toFixed(4)) : 0,
        matches: u,
        total: r,
        detect: true
    };
}

function ln(n, t, r, o) {
    const l = [];
    for (let e = 0; e < E; e++) if (n[e] > 0) l.push({
        l: O[e],
        m: n[e],
        g: t[e]
    });
    l.sort((n, t) => t.m - n.m);
    const s = o == null ? l.length : Math.min(o, l.length);
    const a = new Array(s);
    for (let n = 0; n < s; n++) {
        const t = l[n];
        const o = e[t.l] || {
            code2: 'unk',
            name: 'Unknown'
        };
        a[n] = {
            code: t.l,
            code2: o.code2,
            name: o.name,
            accuracy: r > 0 ? Number((t.g / r).toFixed(4)) : 0,
            matches: t.g,
            total: r,
            detect: true
        };
    }
    return a;
}

// Extract n-gram ranges from folded tokens. No substring is ever materialized:
// each gram is pushed flat as [str, start, len]. Dedupe by FNV-32 + content check
// using a flat array hash set (avoids Map polymorphism for faster JIT).
function sn(n) {
    const e = t(n);
    if (e.length === 0) return [];
    const r = [];
    const o = C.NGRAM_SIZES, l = C.MIN_WORD_LENGTH, s = C.INCLUDE_FULL_WORD;
    let a = 0;
    // Flat hash set: [h, strRef, s, l, ...] stride 4. Powers of 2.
        const c = 1024, i = c - 1;
    const f = new Int32Array(c);
    // hash values (0 = empty)
        const u = new Array(c);
    // source string refs
        const d = new Int32Array(c);
    // offsets
        const g = new Uint16Array(c);
    // lengths
        const m = (n, t, e) => {
        const o = V(n, t, e) | 0;
        let l = o & 2147483647 & i;
        // Probe
                while (f[l] !== 0) {
            if (f[l] === o && g[l] === e) {
                const r = u[l], o = d[l];
                let s = 0;
                while (s < e && r.charCodeAt(o + s) === n.charCodeAt(t + s)) s++;
                if (s === e) return a >= W;
            }
            l = l + 1 & i;
        }
        // Insert at first empty slot (never replace — first hash owner wins)
                f[l] = o;
        u[l] = n;
        d[l] = t;
        g[l] = e;
        r.push(n, t, e);
        return ++a >= W;
    };
    if (e.length > 1 && !/\s/.test(n)) {
        const n = e.join('');
        for (const t of o) {
            for (let e = 0; e <= n.length - t; e++) if (m(n, e, t)) return r;
        }
        return r;
    }
    for (const n of e) {
        if (n.length < l) continue;
        if (s && m('#' + n, 0, n.length + 1)) return r;
        for (const t of o) {
            for (let e = 0; e <= n.length - t; e++) if (m(n, e, t)) return r;
        }
    }
    return r;
}

function detectAll(n, t = {}) {
    if (t == null) t = {};
    if (!n || typeof n !== 'string') return [];
    z();
    const e = t.minLen != null ? t.minLen : t.minLength != null ? t.minLength : 0;
    if (e > 0 && n.trim().length < e) return [];
    const r = P(n, t, 'a');
    const o = Q(r);
    if (o) return nn(o);
    const l = sn(n);
    if (l.length === 0) return [];
    const s = l.length / 3;
    const a = ln(rn(l, tn(n, t)), M, s);
    X(r, a);
    return nn(a);
}

function detect(n, t = {}) {
    if (t == null) t = {};
    let e = null, r = {};
    if (typeof t === 'number') {
        // Only non-negative integers are valid limits; anything else is
        // ignored (single result), like an invalid options { count }.
        if (Number.isInteger(t) && t >= 0) e = t;
    } else if (typeof t === 'object') {
        r = t;
        // Options object can also request a ranked array via { count: n },
        // same as the numeric form detect(text, n).
                if (Number.isInteger(t.count) && t.count >= 0) e = t.count;
    }
    if (!n || typeof n !== 'string') return e !== null ? [] : Z;
    z();
    const o = r.minLen != null ? r.minLen : r.minLength != null ? r.minLength : 0;
    if (o > 0 && n.trim().length < o) return e !== null ? [] : Z;
    const l = P(n, e !== null ? {
        ...r,
        count: e
    } : r, 'd');
    const s = Q(l);
    if (s) return e !== null ? nn(s.slice(0, e)) : Y(s[0]) || Z;
    const a = sn(n);
    if (a.length === 0) {
        X(l, []);
        return e !== null ? [] : Z;
    }
    const c = a.length / 3;
    const i = tn(n, r);
    const f = rn(a, i);
    const u = on(f, M, c);
    if (e !== null) {
        const n = e === 0 ? [] : e === 1 ? u !== Z ? [ u ] : [] : ln(f, M, c, e);
        X(l, n);
        return nn(n);
    }
    X(l, u !== Z ? [ u ] : []);
    return u === Z ? u : Y(u);
}

function getDatabaseInfo() {
    z();
    return {
        type: _.type,
        dataVersion: _.dataVersion || 0,
        languages: _.languages,
        ngrams: F,
        modelNgrams: _.ngramCount,
        config: C,
        source: _.source,
        generated: new Date(_.generated).toISOString()
    };
}

// Public metadata helpers (require the model for the language list).
function an(n) {
    return e[n] || null;
}

function supportedLanguages() {
    z();
    return O.slice();
}

function languages() {
    z();
    return O.map(n => {
        const t = an(n) || {
            code2: 'unk',
            name: 'Unknown'
        };
        return {
            code: n,
            code2: t.code2,
            name: t.name
        };
    });
}

function hasLanguage(n) {
    if (typeof n !== 'string' || !n) return false;
    z();
    const t = n.toLowerCase();
    if (O.indexOf(t) !== -1) return true;
    for (const n of O) {
        const r = e[n];
        if (r && r.code2 === t) return true;
    }
    for (const n of O) {
        const r = e[n];
        if (r && r.name && r.name.toLowerCase() === t) return true;
    }
    return false;
}

function code3(n) {
    if (typeof n !== 'string' || !n) return null;
    z();
    const t = n.toLowerCase();
    for (const n of O) {
        const r = e[n];
        if (r && (n === t || r.code2 === t || r.name.toLowerCase() === t)) return r.code2;
    }
    return null;
}

function name(n) {
    if (typeof n !== 'string' || !n) return null;
    z();
    const t = n.toLowerCase();
    for (const n of O) {
        const r = e[n];
        if (r && (n === t || r.code2 === t || r.name.toLowerCase() === t)) return r.name;
    }
    return null;
}

module.exports = {
    detect: (n, t) => detect(n, t),
    detectAll: (n, t) => detectAll(n, t),
    getDatabaseInfo: () => getDatabaseInfo(),
    supportedLanguages: () => supportedLanguages(),
    languages: () => languages(),
    hasLanguage: n => hasLanguage(n),
    code3: n => code3(n),
    name: n => name(n)
};