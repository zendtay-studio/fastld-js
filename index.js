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

const path = require('path');
const { tokenize } = require('./clear');
const ISO_MAP = require('./lang-name');

// Flat BMP script lookup: Uint8Array(0x10000). Value = script index (1..32),
// 0 = Latin (counted separately), 255 = no known script. O(1) per char.
const SCRI = [                       // script name indexed by table value
    '', 'Devanagari', 'Bengali', 'Gurmukhi', 'Gujarati', 'Oriya',
    'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Sinhala', 'Thai',
    'Lao', 'Tibetan', 'Myanmar', 'Georgian', 'Hangul', 'Cherokee',
    'Syllabics', 'Khmer', 'Cyrillic', 'LatinExt', 'Greek', 'Armenian',
    'Hebrew', 'Arabic', 'Hiragana', 'Katakana', 'HangulSyll', 'Han',
    'HanCompat', 'Ethiopic'
];
const SCT = new Uint8Array(0x10000);  // BMP: codepoint → script id
const SCRID = {};                     // name → table value (Latin is implicit 0)
for (let i = 0; i < SCRI.length; i++) SCRID[SCRI[i]] = i;
SCT.fill(255);
for (const [s, e, name] of [
    [0x0041, 0x024F, 'Latin'],
    [0x0900, 0x097F, 'Devanagari'], [0x0980, 0x09FF, 'Bengali'],
    [0x0A00, 0x0A7F, 'Gurmukhi'], [0x0A80, 0x0AFF, 'Gujarati'],
    [0x0B00, 0x0B7F, 'Oriya'], [0x0B80, 0x0BFF, 'Tamil'],
    [0x0C00, 0x0C7F, 'Telugu'], [0x0C80, 0x0CFF, 'Kannada'],
    [0x0D00, 0x0D7F, 'Malayalam'], [0x0D80, 0x0DFF, 'Sinhala'],
    [0x0E00, 0x0E7F, 'Thai'], [0x0E80, 0x0EFF, 'Lao'],
    [0x0F00, 0x0FFF, 'Tibetan'], [0x1000, 0x109F, 'Myanmar'],
    [0x10A0, 0x10FF, 'Georgian'], [0x1100, 0x11FF, 'Hangul'],
    [0x1200, 0x137F, 'Ethiopic'], [0x13A0, 0x13FF, 'Cherokee'],
    [0x1400, 0x167F, 'Syllabics'], [0x1780, 0x17FF, 'Khmer'],
    [0x0400, 0x04FF, 'Cyrillic'], [0x0530, 0x058F, 'Armenian'],
    [0x0590, 0x05FF, 'Hebrew'], [0x0600, 0x06FF, 'Arabic'],
    [0x1E00, 0x1EFF, 'LatinExt'], [0x0370, 0x03FF, 'Greek'],
    [0x3040, 0x309F, 'Hiragana'], [0x30A0, 0x30FF, 'Katakana'],
    [0x4E00, 0x9FFF, 'Han'], [0xAC00, 0xD7AF, 'HangulSyll'],
    [0xF900, 0xFAFF, 'HanCompat']
]) {
    const id = SCRID[name];           // Latin → 0, others → 1..31
    for (let c = s; c <= e; c++) SCT[c] = id;
}

function scr(text) {
    if (!text || typeof text !== 'string') return {};
    const c = Object.create(null);
    let lk = 0;
    for (let i = 0; i < text.length; i++) {
        const cc = text.charCodeAt(i);
        if (cc < 0x10000) {
            const v = SCT[cc];
            if (v === 0) { lk++; continue; }
            if (v < 255) { const n = SCRI[v]; c[n] = (c[n] || 0) + 1; }
        } else if (cc >= 0x20000 && cc <= 0x2A6DF) {
            c['HanExtB'] = (c['HanExtB'] || 0) + 1;
        }
    }
    if (lk > 0) c['Latin'] = lk;
    return c;
}

// ────────────────────────────────────────────────────────────────────────────
// Flat binary container ("F4STLDF1"), same layout as build.js packFlat().
// header magic(8) + version u32 + canary u32; TOC 64 B = 8 × {u32 off, u32 len}
//  0 META(utf8 JSON) 1 GRAMS(utf16le, 2-byte 0 pad) 2 LENS(u16) 3 PLENS(u8)
//  4 POSTINGS(u32) 5 HASH(u32) 6 STARTS(u32) 7 OFFSETS(u32)   (5-7: cache only)
const FMAG = 'F4STLDF1';
const FFVERSION = 1;                // container format version (header u32 @8)
const FCANARY = 0xFEED0001;         // endianness canary (header u32 @12)
// The dataset version comes from build.js, which bumps it on every build and
// persists it in model-version.json. Using it (instead of the compressed file
// size) as the cache key means a regenerated model never reuses a stale cache,
// even when Brotli happens to produce the same byte length.
const VER_FILE = path.join(__dirname, 'model-version.json');
const CPFX = 'fastld-js-d';         // version-keyed cache files
const SPFX = 'fastld-js-s';         // size-keyed fallback cache files
const RE_CACHE = /^fastld-js(?:-v\d+)?-[ds]\d+\.flt$/;

function load() {
    const fs = require('fs');
    const os = require('os');
    const zlib = require('zlib');
    const gz = path.join(__dirname, 'model.flt.gz');
    const rawSize = fs.statSync(gz).size;
    let dataVersion = null;
    try {
        const v = JSON.parse(fs.readFileSync(VER_FILE, 'utf8'));
        if (Number.isInteger(v.dataVersion) && v.dataVersion > 0 &&
            (v.rawSize == null || v.rawSize === rawSize)) dataVersion = v.dataVersion;
    } catch { }
    const cache = path.join(os.tmpdir(), dataVersion != null
        ? `${CPFX}${dataVersion}.flt`
        : `${SPFX}${rawSize}.flt`);
    let d = null;
    try {
        d = fromFlat(fs.readFileSync(cache));
        // The cache must match the model on disk; a version mismatch (stale
        // cache keyed by size, or a model replaced without a rebuilt manifest)
        // must fall through to a full rebuild.
        if (dataVersion != null && (!d.__meta || d.__meta.dataVersion !== dataVersion)) d = null;
    } catch { }
    if (!d) {
        d = fromFlat(zlib.brotliDecompressSync(fs.readFileSync(gz)));
        if (!d.starts) addPrefixes(d);
        if (!d.hash) d.hash = hashOf(d);
        try {
            fs.writeFileSync(cache, toFlat(d));
            sweepCache(cache);
        } catch { }
    } else {
        sweepCache(cache);
    }
    return d;
}

// Remove stale fastld-js caches (old data versions / size-keyed names) from the
// shared tmp dir. Failures are ignored: the cache is a best-effort optimization.
function sweepCache(cur) {
    const fs = require('fs');
    const dir = path.dirname(cur);
    const base = path.basename(cur);
    let names;
    try { names = fs.readdirSync(dir); } catch { return; }
    for (const n of names) {
        if (n === base || !RE_CACHE.test(n)) continue;
        try { fs.unlinkSync(path.join(dir, n)); } catch { }
    }
}

// Instantiate the model from a flat buffer via zero-copy typed-array views;
// throws on anything that is not a valid F4STLDF1 container (cache miss/stale).
function fromFlat(buf) {
    if (!buf || buf.length < 80 || buf.toString('latin1', 0, 8) !== FMAG) throw new Error('bad container');
    if (buf.readUInt32LE(8) !== FFVERSION || buf.readUInt32LE(12) !== FCANARY) throw new Error('bad container version');
    const toc = new Uint32Array(buf.buffer, buf.byteOffset + 16, 16);
    const off = [], len = [];
    for (let i = 0; i < 8; i++) { off[i] = toc[i * 2]; len[i] = toc[i * 2 + 1]; }
    const meta = JSON.parse(buf.toString('utf8', off[0], off[0] + len[0]));
    const d = {
        __meta: meta.m, langs: meta.l, scripts: meta.s,
        // Zero-copy Uint16Array view == UTF-16LE string code units; no decode.
        grams: new Uint16Array(buf.buffer, buf.byteOffset + off[1] + 2, (len[1] - 2) / 2),
        lens: new Uint16Array(buf.buffer, buf.byteOffset + off[2], len[2] / 2),
        plens: new Uint8Array(buf.buffer, buf.byteOffset + off[3], len[3]),
        postings: new Uint32Array(buf.buffer, buf.byteOffset + off[4], len[4] / 4),
        _buf: buf                          // keep the backing ArrayBuffer alive
    };
    if (len[5]) d.hash = new Uint32Array(buf.buffer, buf.byteOffset + off[5], len[5] / 4);
    if (len[6]) d.starts = new Uint32Array(buf.buffer, buf.byteOffset + off[6], len[6] / 4);
    if (len[7]) d.offsets = new Uint32Array(buf.buffer, buf.byteOffset + off[7], len[7] / 4);
    return d;
}

// Re-pack a loaded model (hash + starts + offsets included) for the tmp cache.
function toFlat(d) {
    const sections = [
        Buffer.from(JSON.stringify({ m: d.__meta, l: d.langs, s: d.scripts }), 'utf8'),
        Buffer.concat([Buffer.from([0, 0]), bufOf(d.grams)]),
        bufOf(d.lens), bufOf(d.plens), bufOf(d.postings),
        d.hash ? bufOf(d.hash) : Buffer.alloc(0),
        d.starts ? bufOf(d.starts) : Buffer.alloc(0),
        d.offsets ? bufOf(d.offsets) : Buffer.alloc(0)
    ];
    const toc = Buffer.alloc(64);
    const chunks = [];
    let cur = 16 + 64;
    for (let i = 0; i < 8; i++) {
        const p = (cur + 3) & ~3;
        if (p !== cur) chunks.push(Buffer.alloc(p - cur));
        toc.writeUInt32LE(p, i * 8);
        toc.writeUInt32LE(sections[i].length, i * 8 + 4);
        chunks.push(sections[i]);
        cur = p + sections[i].length;
    }
    const head = Buffer.alloc(16);
    head.write(FMAG, 0, 'latin1');
    head.writeUInt32LE(1, 8);
    head.writeUInt32LE(0xFEED0001, 12);
    return Buffer.concat([head, toc, ...chunks]);
}

function bufOf(ta) {
    return Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength);
}

// Rebuild cumulative start offsets (into grams) and posting offsets (into
// postings) from lens/plens. This is what build.js used to ship precomputed.
function addPrefixes(d) {
    if (d.starts && d.offsets) return;
    const LN = d.lens, PL = d.plens, n = LN.length;
    const ST = new Uint32Array(n), OF = new Uint32Array(n);
    let sp = 0, op = 0;
    for (let i = 0; i < n; i++) {
        ST[i] = sp; sp += LN[i];
        OF[i] = op; op += PL[i];
    }
    d.starts = ST;
    d.offsets = OF;
}

// Open-addressing FNV-1a hash table: gram -> index in the packed arrays.
// Capacity = next power of two that keeps the load factor ~<=0.5, capped at
// 16M slots so the serialized cache stays bounded for very large gram counts.
const HMAX = 1 << 24;
function hashOf(d) {
    const G = d.grams, ST = d.starts, LN = d.lens;
    const NG = ST.length;
    let cap = 1 << 14;
    while (cap < NG * 2 && cap < HMAX) cap <<= 1;
    const HM = cap - 1;
    const table = new Uint32Array(cap);
    table.fill(HE);
    for (let i = 0; i < NG; i++) {
        let s = fnv16(G, ST[i], LN[i]) & HM;
        while (table[s] !== HE) s = (s + 1) & HM;
        table[s] = i;
    }
    return table;
}

const HE = 0xFFFFFFFF;       // sentinel for unoccupied hash slots
let d = null, M = null, CFG = null, LC = null, N = 0, LI = null, SL = null;
let G = null, ST = null, LN = null, PL = null, OF = null, PO = null, NG = 0;
let HT = null, HM = 0;
let SC = null, HI = null;    // scratch score/hit arrays, sized after model load
let READY = false;

// Deferred model load: require() is ~instant; the 17 MB snapshot is only
// materialized on the first detect/detectAll/getDatabaseInfo call.
function init() {
    if (READY) return;
    d = load();
    M = d.__meta;
    CFG = M.config;
    LC = d.langs;            // sorted ISO codes = language ids
    N = LC.length;
    LI = Object.create(null);
    SL = d.scripts || {};
    for (let i = 0; i < N; i++) LI[LC[i]] = i;
    SC = new Float64Array(N);
    HI = new Int32Array(N);
    G = d.grams;
    ST = d.starts;
    LN = d.lens;
    PL = d.plens;
    OF = d.offsets;
    PO = d.postings;
    NG = ST.length;
    if (d.hash) {
        HT = d.hash;
    } else {
        HT = hashOf(d);
        d.hash = HT;
    }
    HM = HT.length - 1;
    READY = true;
}

// FNV-1a hash over str[s .. s+l); string path defaults to the whole string.
function fnv(str, s = 0, l = str.length) {
    let h = 0x811c9dc5;
    for (let k = 0; k < l; k++) h = (h ^ str.charCodeAt(s + k)) * 16777619 >>> 0;
    return h;
}

// FNV-1a over a Uint16Array (packed-grams) range; array index reads beat
// charCodeAt on the equivalent string (~1.7-2.8x faster in microbench).
function fnv16(arr, s, l) {
    let h = 0x811c9dc5;
    for (let k = 0; k < l; k++) h = (h ^ arr[s + k]) * 16777619 >>> 0;
    return h;
}

// True if the range (str[s..s+l)) equals gram-table entry i (compared against
// the packed grams via direct code-unit reads — no substring allocation).
function eq(i, str, s, l) {
    const L = LN[i];
    if (L !== l) return false;
    const B = ST[i];
    for (let k = 0; k < l; k++) if (G[B + k] !== str.charCodeAt(s + k)) return false;
    return true;
}

const RC = new Map();        // small LRU result cache
const MX = 250;
const MG = 300;              // max grams extracted per text
// Neutral "could not decide" result. Returned for blank input and whenever
// minLen is set but the text is shorter than the requested threshold.
const UNDECIDED = Object.freeze({ code: '', code2: 'und', name: 'Undecided', accuracy: 0, matches: 0, total: 0 });
const ER = Object.freeze({ code: '', code2: '', name: '', accuracy: 0, matches: 0, total: 0, undecided: UNDECIDED });

function keyOf(text, o = {}) {
    if (!o || (!o.allow && !o.exclude && o.minLen == null && o.minLength == null)) return text;
    return `${text}::${JSON.stringify({
        allow: Array.isArray(o.allow) ? o.allow.map(l => String(l).toLowerCase()) : undefined,
        exclude: Array.isArray(o.exclude) ? o.exclude.map(l => String(l).toLowerCase()) : undefined,
        minLen: o.minLen != null ? o.minLen : (o.minLength != null ? o.minLength : undefined)
    })}`;
}

function got(k) {
    const z = RC.get(k);
    if (!z) return null;
    RC.delete(k);
    RC.set(k, z);
    return z;
}

function put(k, v) {
    if (RC.size >= MX) RC.delete(RC.keys().next().value);
    RC.set(k, v);
}

// Candidate language ids: script prefilter + allow/exclude. null means all.
function cands(text, o = {}) {
    let av = null;
    const sc = scr(text);
    if (sc) {
        const bs = new Set();
        for (const s in sc) {
            const l = SL[s];
            if (l) for (const id of l) bs.add(id);
        }
        if (bs.size > 0) av = bs;
    }
    if (o.allow) {
        const al = new Set(o.allow.map(l => String(l).toLowerCase()));
        const ids = new Set();
        for (const lg of al) if (LI[lg] !== undefined) ids.add(LI[lg]);
        if (ids.size > 0) av = av ? new Set([...av].filter(x => ids.has(x))) : ids;
    }
    if (o.exclude) {
        const ex = new Set(o.exclude.map(l => String(l).toLowerCase()));
        const xd = new Set();
        for (const lg of ex) if (LI[lg] !== undefined) xd.add(LI[lg]);
        if (av) {
            av = new Set([...av].filter(x => !xd.has(x)));
        } else {
            av = new Set();
            for (let i = 0; i < N; i++) if (!xd.has(i)) av.add(i);
        }
    }
    return av;
}

// Locate a gram range [str, s, l) in the hash table; -1 if absent.
function find(str, s, l) {
    let h = fnv(str, s, l) & HM;
    while (true) {
        const i = HT[h];
        if (i === HE) return -1;
        if (eq(i, str, s, l)) return i;
        h = (h + 1) & HM;
    }
}

// Weighted-IDF voting against the inverted index. Each postings int packs
// (weight << 7) | langId: low 7 bits = lang id (< 128), rest = weight.
// gs holds a flat gram list: [str, start, len, str, start, len, ...].
function fast(gs, av) {
    const sc = SC, hi = HI;
    for (let i = 0; i < N; i++) { sc[i] = 0; hi[i] = 0; }
    for (let i = 0; i < gs.length; i += 3) {
        const k = find(gs[i], gs[i + 1], gs[i + 2]);
        if (k < 0) continue;
        const a = OF[k], b = PL[k];
        for (let j = a; j < a + b; j++) {
            const q = PO[j];
            const id = q & 127;
            if (!av || av.has(id)) { sc[id] += q >>> 7; hi[id]++; }
        }
    }
    return sc;
}

// Best single language; near-ties (e.g. Tibetan vs Dzongkha) resolved by
// preferring more matched grams when within 10% of the best score.
function best(sc, hi, nt) {
    let bi = -1, bs = -1;
    for (let i = 0; i < N; i++) if (sc[i] > bs) { bs = sc[i]; bi = i; }
    if (bi === -1) return ER.undecided;
    if (bs > 0) {
        let ti = bi, th = hi[bi];
        const t = bs * 0.90;
        for (let i = 0; i < N; i++) {
            if (i === bi) continue;
            if (sc[i] >= t && hi[i] > th) { ti = i; th = hi[i]; }
        }
        bi = ti;
        bs = sc[ti];
    }
    const lg = LC[bi];
    const im = ISO_MAP[lg] || { code2: 'unk', name: 'Unknown' };
    const h = hi[bi];
    return { code: lg, code2: im.code2, name: im.name, accuracy: nt > 0 ? Number((h / nt).toFixed(4)) : 0, matches: h, total: nt };
}

function rank(sc, hi, nt, lim) {
    const r = [];
    for (let i = 0; i < N; i++) if (sc[i] > 0) r.push({ l: LC[i], m: sc[i], g: hi[i] });
    r.sort((a, b) => b.m - a.m);
    const n = lim == null ? r.length : Math.min(lim, r.length);
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
        const it = r[i];
        const im = ISO_MAP[it.l] || { code2: 'unk', name: 'Unknown' };
        out[i] = { code: it.l, code2: im.code2, name: im.name, accuracy: nt > 0 ? Number((it.g / nt).toFixed(4)) : 0, matches: it.g, total: nt };
    }
    return out;
}

// Extract n-gram ranges from folded tokens. No substring is ever materialized:
// each gram is pushed flat as [str, start, len]. Dedupe by FNV-32 + content check
// using a flat array hash set (avoids Map polymorphism for faster JIT).
function grams(t) {
    const w = tokenize(t);
    if (w.length === 0) return [];
    const ng = [];
    const sizes = CFG.NGRAM_SIZES, minL = CFG.MIN_WORD_LENGTH, full = CFG.INCLUDE_FULL_WORD;
    let cnt = 0;
    // Flat hash set: [h, strRef, s, l, ...] stride 4. Powers of 2.
    const HS = 1024, HM = HS - 1;
    const seenH = new Int32Array(HS);     // hash values (0 = empty)
    const seenS = new Array(HS);          // source string refs
    const seenO = new Int32Array(HS);     // offsets
    const seenL = new Uint16Array(HS);    // lengths
    const add = (str, s, l) => {
        const h = fnv(str, s, l) | 0;
        let idx = (h & 0x7FFFFFFF) & HM;
        // Probe
        while (seenH[idx] !== 0) {
            if (seenH[idx] === h && seenL[idx] === l) {
                const a = seenS[idx], s1 = seenO[idx];
                let k = 0;
                while (k < l && a.charCodeAt(s1 + k) === str.charCodeAt(s + k)) k++;
                if (k === l) return cnt >= MG;
            }
            idx = (idx + 1) & HM;
        }
        // Insert at first empty slot (never replace — first hash owner wins)
        seenH[idx] = h; seenS[idx] = str; seenO[idx] = s; seenL[idx] = l;
        ng.push(str, s, l);
        return ++cnt >= MG;
    };
    if (w.length > 1 && !/\s/.test(t)) {
        const ct = w.join('');
        for (const n of sizes) {
            for (let i = 0; i <= ct.length - n; i++) if (add(ct, i, n)) return ng;
        }
        return ng;
    }
    for (const wd of w) {
        if (wd.length < minL) continue;
        if (full && add('#' + wd, 0, wd.length + 1)) return ng;
        for (const n of sizes) {
            for (let i = 0; i <= wd.length - n; i++) if (add(wd, i, n)) return ng;
        }
    }
    return ng;
}

function detectAll(t, o = {}) {
    if (!t || typeof t !== 'string') return [];
    init();
    const min = o.minLen != null ? o.minLen : (o.minLength != null ? o.minLength : 0);
    if (min > 0 && t.trim().length < min) return [];
    const k = keyOf(t, o);
    const z = got(k);
    if (z) return z;
    const g = grams(t);
    if (g.length === 0) return [];
    const nt = g.length / 3;
    const r = rank(fast(g, cands(t, o)), HI, nt);
    put(k, r);
    return r;
}

function detect(t, o = {}) {
    let lim = null, cfg = {};
    if (typeof o === 'number') lim = o;
    else if (typeof o === 'object') cfg = o;
    if (!t || typeof t !== 'string') return lim !== null ? [] : ER.undecided;
    init();
    const min = cfg.minLen != null ? cfg.minLen : (cfg.minLength != null ? cfg.minLength : 0);
    if (min > 0 && t.trim().length < min) return lim !== null ? [] : ER.undecided;
    const k = keyOf(t, cfg);
    const z = got(k);
    if (z) return lim !== null ? z.slice(0, lim) : z[0] || ER.undecided;
    const g = grams(t);
    if (g.length === 0) { put(k, []); return lim !== null ? [] : ER.undecided; }
    const nt = g.length / 3;
    const av = cands(t, cfg);
    const sc = fast(g, av);
    const r = best(sc, HI, nt);
    if (lim !== null) {
        const rk = lim <= 1 ? (r ? [r] : []) : rank(sc, HI, nt, lim);
        put(k, rk);
        return rk;
    }
    put(k, r ? [r] : []);
    return r || ER.undecided;
}

function getDatabaseInfo() {
    init();
    return { type: M.type, dataVersion: M.dataVersion || 0, languages: M.languages, ngrams: M.ngramCount, config: CFG, source: M.source, generated: new Date(M.generated).toISOString() };
}

// Public metadata helpers (require the model for the language list).
function langMeta(l) {
    return ISO_MAP[l] || null;
}

function supportedLanguages() {
    init();
    return LC.slice();
}

function languages() {
    init();
    return LC.map(l => {
        const im = langMeta(l) || { code2: 'unk', name: 'Unknown' };
        return { code: l, code2: im.code2, name: im.name };
    });
}

function hasLanguage(code) {
    if (typeof code !== 'string' || !code) return false;
    init();
    const c = code.toLowerCase();
    if (LC.indexOf(c) !== -1) return true;
    if (ISO_MAP[c]) return true;
    for (const l of LC) {
        const im = ISO_MAP[l];
        if (im && im.code2 === c) return true;
    }
    for (const l of LC) {
        const im = ISO_MAP[l];
        if (im && im.name && im.name.toLowerCase() === c) return true;
    }
    return false;
}

function code3(code) {
    if (typeof code !== 'string' || !code) return null;
    init();
    const l = LC.indexOf(code.toLowerCase());
    if (l === -1) return null;
    const im = ISO_MAP[LC[l]];
    return im ? im.code2 : null;
}

function name(code) {
    if (typeof code !== 'string' || !code) return null;
    init();
    const im = ISO_MAP[code.toLowerCase()];
    return im ? im.name : null;
}

module.exports = { detect, detectAll, getDatabaseInfo, supportedLanguages, languages, hasLanguage, code3, name, ER };