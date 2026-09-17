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
const zlib = require('zlib');
const { tokenize, fold } = require('./clear');

// Script -> ISO 639-1 codes that commonly use that script.
const SC = {
    'Latin': [
        'en', 'es', 'fr', 'pt', 'it', 'ro', 'de', 'nl', 'sv', 'da', 'no', 'is', 'pl', 'cs', 'sk',
        'hr', 'sl', 'lt', 'lv', 'et', 'fi', 'hu', 'ga', 'cy', 'sq', 'af', 'ca', 'gl', 'eu', 'ms',
        'id', 'tl', 'vi', 'sw', 'zu', 'xh', 'yo', 'mt', 'la', 'fo', 'fy', 'gd', 'oc', 'wa', 'io',
        'ia', 'ie', 'ee', 'fj', 'ng', 'nv', 'so', 'om', 'ig', 'ha',
        // Latin-alphabet Turkic and other languages that were missing
        'tr', 'az', 'tt', 'tk', 'uz', 'ba', 'crh', 'gag', 'mi', 'to', 'ty', 'sm', 'ga', 'ln',
        'kg', 'bi', 'ho', 'ny', 'rn', 'rw', 'sg', 'sn', 'ss', 'st', 'tn', 'ts', 've', 'za', 'hm',
        // Small/under-resourced Latin-script languages in this dataset
        'ay', 'br', 'bs', 'ch', 'co', 'eo', 'gn', 'jv', 'kr', 'ku', 'lg', 'mh', 'nb', 'nn', 'wo'
    ],
    'Cyrillic': ['ru', 'uk', 'be', 'bg', 'mk', 'sr', 'kk', 'ky', 'mn', 'tg', 'tt', 'ab', 'av', 'os', 'ce', 'cv', 'ba', 'bs'],
    'Greek': ['el'],
    'Armenian': ['hy'],
    'Georgian': ['ka'],
    'Hebrew': ['he'],
    'Arabic': ['ar', 'fa', 'ur', 'ps', 'sd', 'ug', 'ku'],
    'Devanagari': ['hi', 'mr', 'ne', 'sa', 'bh'],
    'Bengali': ['bn', 'as'],
    'Gurmukhi': ['pa'],
    'Gujarati': ['gu'],
    'Oriya': ['or'],
    'Tamil': ['ta'],
    'Telugu': ['te'],
    'Kannada': ['kn'],
    'Malayalam': ['ml'],
    'Sinhala': ['si'],
    'Thai': ['th'],
    'Lao': ['lo'],
    'Tibetan': ['bo', 'dz'],
    'Myanmar': ['my'],
    'Khmer': ['km'],
    'Han': ['zh', 'ja'],
    'Hiragana': ['ja'],
    'Katakana': ['ja'],
    'Hangul': ['ko'],
    'HangulSyll': ['ko'],
    'Ethiopic': ['am', 'ti'],
    'Syllabics': ['cr', 'iu']
};

const CFG = {
    MAX_WORDS_PER_LANG: 300000,
    NGRAM_SIZES: [3, 4, 5],
    MIN_WORD_LENGTH: 3,
    TOP_NGRAMS_PER_LANG: 10000,
    INCLUDE_FULL_WORD: true,
    TF_SCALE: 200,     // scaling factor inside the idf*tf term (tunable sharpness)
    WEIGHT_SCALE: 64   // final weight multiplier before integer packing (see postings layout)
};

// Dataset version. Bumped on every successful build so the runtime cache key
// is derived from a monotonically increasing number, never from the compressed
// file size (a regenerated model at the same byte length otherwise serves the
// stale cache). The manifest also lets load() resolve the version without
// decompressing the whole snapshot.
const VER_FILE = path.join(__dirname, 'model-version.json');

function readDataVersion() {
    // 1. Prefer the manifest written by the previous build.
    try {
        const v = JSON.parse(fs.readFileSync(VER_FILE, 'utf8'));
        if (Number.isInteger(v.dataVersion) && v.dataVersion > 0) return v.dataVersion;
    } catch { }
    // 2. Fall back to the version embedded in an existing model's META.
    try {
        const gz = path.join(__dirname, 'model.flt.gz');
        if (!fs.existsSync(gz)) return 0;
        const buf = zlib.brotliDecompressSync(fs.readFileSync(gz));
        if (buf.length < 80 || buf.toString('latin1', 0, 8) !== MAGIC) return 0;
        const toc = new Uint32Array(buf.buffer, buf.byteOffset + 16, 16);
        const off = toc[0], len = toc[1];
        if (!len) return 0;
        const m = JSON.parse(buf.toString('utf8', off, off + len));
        const v = (m && m.m && m.m.dataVersion) || (m && m.dataVersion);
        return Number.isInteger(v) && v > 0 ? v : 0;
    } catch { }
    return 0;
}

// Keep package.json's "modelVersion" in sync with the manifest so consumers
// can read the dataset version without decompressing the model.
const PKG_FILE = path.join(__dirname, 'package.json');
function syncPackageModelVersion(dataVersion) {
    try {
        const pkg = JSON.parse(fs.readFileSync(PKG_FILE, 'utf8'));
        if (pkg.modelVersion === dataVersion) return;
        pkg.modelVersion = dataVersion;
        fs.writeFileSync(PKG_FILE, JSON.stringify(pkg, null, 2) + '\n');
    } catch { }
}

const RE_DIR = /^[a-z]{2}$/i;
const RE_FREQ = /^(\S+)\s+(\d+)\s*$/;

function cntDirs(p) {
    try {
        return fs.readdirSync(p, { withFileTypes: true }).filter(e => e.isDirectory() && RE_DIR.test(e.name)).length;
    } catch (e) {
        return 0;
    }
}
const DIR = cntDirs(path.join(__dirname, 'languages')) >= cntDirs(path.join(__dirname, '../languages'))
    ? path.join(__dirname, 'languages')
    : path.join(__dirname, '../languages');

function getTxt(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true })
        .filter(e => e.isFile() && e.name.endsWith('.txt'))
        .map(e => e.name);
    // Process wiki/udhr (language-native text) before generic frequency lists,
    // so they are not skipped by MAX_WORDS_PER_LANG.
    const rank = n => {
        n = n.toLowerCase();
        if (n.includes('wiki')) return 0;
        if (n.includes('udhr')) return 1;
        if (n.includes('_50k') || n.includes('_top50k') || n.includes('_full')) return 3;
        return 2;
    };
    files.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    return files.map(n => path.join(dir, n));
}

// Parse a corpus file -> Map(word -> count). Frequency lists ("word count"
// lines) get real counts; other files are tokenized as plain text.
function cntFile(fp) {
    const src = fs.readFileSync(fp, 'utf8');
    const o = new Map();
    // Heuristic: >=60% of non-empty first lines looking like "word count" -> freq list.
    const hd = src.slice(0, 4096).split('\n');
    const nl = hd.filter(l => l.trim()).length;
    let fl = 0;
    for (let i = 0; i < hd.length; i++) if (hd[i] && RE_FREQ.test(hd[i])) fl++;
    if (nl > 0 && fl / nl >= 0.6) {
        const bd = src.split('\n');
        for (let i = 0; i < bd.length; i++) {
            const m = RE_FREQ.exec(bd[i]);
            if (!m) continue;
            const w = fold(m[1].toLowerCase());
            const c = parseInt(m[2], 10);
            if (/^[\p{L}\p{M}\u0F0B]+$/u.test(w)) o.set(w, (o.get(w) || 0) + c);
        }
    } else {
        const t = tokenize(src);
        for (let i = 0; i < t.length; i++) o.set(t[i], (o.get(t[i]) || 0) + 1);
    }
    return o;
}

function procLang(iso, langId) {
    const d = path.join(DIR, iso);
    if (!fs.existsSync(d)) return null;
    const fls = getTxt(d);
    if (fls.length === 0) return null;

    // Relative frequency ratio makes gram frequencies comparable across corpora
    // of very different sizes (FrequencyWords vs small UDHR text).
    const wc = new Map();
    let tw = 0;
    for (const fp of fls) {
        for (const [w, c] of cntFile(fp)) {
            const pv = wc.get(w) || 0;
            wc.set(w, pv + c);
            tw += c;
        }
        if (tw >= CFG.MAX_WORDS_PER_LANG) break;
    }
    if (tw === 0) return null;

    const uw = [...wc.entries()].sort((a, b) => b[1] - a[1]).slice(0, CFG.MAX_WORDS_PER_LANG);

    const fm = new Map();
    for (const [w, c] of uw) {
        if (w.length < CFG.MIN_WORD_LENGTH) continue;
        if (CFG.INCLUDE_FULL_WORD) {
            const fg = `#${w}`;
            fm.set(fg, (fm.get(fg) || 0) + c);
        }
        for (const n of CFG.NGRAM_SIZES) {
            const mi = w.length - n;
            if (mi < 0) continue;
            for (let j = 0; j <= mi; j++) {
                const g = w.substring(j, j + n);
                fm.set(g, (fm.get(g) || 0) + c);
            }
        }
    }
    if (fm.size === 0) return null;

    const top = [...fm]
        .map(([g, c]) => [g, c / Math.max(1, tw)])
        .sort((a, b) => b[1] - a[1])
        .slice(0, CFG.TOP_NGRAMS_PER_LANG);
    console.log(`   ✅ ${iso} (${langId}): ${top.length} n-grams (${tw.toLocaleString()} words)`);

    return { iso, grams: new Map(top) };
}

function scrMap(langCodes) {
    const scripts = {};
    for (const s of Object.keys(SC)) {
        const ids = [];
        for (const l of SC[s]) {
            const id = langCodes.indexOf(l);
            if (id !== -1) ids.push(id);
        }
        if (ids.length > 0) scripts[s] = ids;
    }
    return scripts;
}

async function setup() {
    console.log('🚀 Building with weighted IDF scoring');

    if (!fs.existsSync(DIR)) {
        console.error('❌ Languages folder "languages/" does not exist');
        console.error('   First download corpora by running the steps in BUILD.md');
        process.exit(1);
    }

    const targets = fs.readdirSync(DIR, { withFileTypes: true })
        .filter(e => e.isDirectory() && RE_DIR.test(e.name))
        .map(e => e.name)
        .sort();

    if (targets.length === 0) {
        console.error('❌ No valid 2-letter language folders found under languages/');
        process.exit(1);
    }
    if (targets.length < 50) {
        console.error(`❌ Only ${targets.length} languages found — expected ~115. Aborting to avoid a corrupt model.`);
        process.exit(1);
    }

    console.log(`📁 Processing ${targets.length} languages from local folder...\n`);

    const processed = [];
    for (let i = 0; i < targets.length; i++) {
        const r = procLang(targets[i], i);
        if (r) processed.push(r);
    }

    // Language ids are the sorted ISO codes that have data.
    const langCodes = processed.map(p => p.iso).sort();

    console.log('\n🔗 Building inverted index (gram -> langId -> freq)...');
    const perGram = new Map(); // gram -> Map(langId -> count)
    for (const item of processed) {
        const langId = langCodes.indexOf(item.iso);
        for (const [g, c] of item.grams) {
            let m = perGram.get(g);
            if (!m) { m = new Map(); perGram.set(g, m); }
            m.set(langId, c);
        }
    }

    console.log('⚖️  Computing IDF weights...');
    const N = langCodes.length;
    const data = Object.create(null);
    let totalPostings = 0;

    // Pass 1: assign each (gram -> language) pair a free-form raw weight
    // (IDF x log(freq) + floor, x3 for full-word grams) and accumulate each
    // language's total raw weight, to be used for normalization in Pass 2.
    const langTotalW = new Float64Array(N);
    const raw = new Map(); // gram -> flat array of alternating [langId, rawWeight]

    for (const [g, langFreqs] of perGram) {
        const df = langFreqs.size;
        // IDF down-weights near-universal grams so common words don't drown
        // out language-distinctive ones.
        const idf = Math.log(N / df);
        const arr = [];
        for (const [langId, relFreq] of langFreqs) {
            const tf = Math.log(1 + relFreq * CFG.TF_SCALE);
            let w = idf * tf + 0.0005; // tiny floor so every posting counts
            if (g[0] === '#') {
                // Full words are the most discriminative signal for function words:
                // give them a strong multiplicative boost *before* per-lang normalization.
                w *= 3;
            }
            arr.push(langId, w);
            langTotalW[langId] += w;
        }
        raw.set(g, arr);
    }

    // Pass 2: divide each weight by the square root of its language's total raw
    // weight. This is a softer normalization than L1: it tames large-corpus
    // languages while still letting distinctive high-IDF grams stand out.
    for (const [g, entries] of raw) {
        const arr = [];
        for (let i = 0; i < entries.length; i += 2) {
            const langId = entries[i];
            const wN = entries[i + 1] / Math.max(1e-9, Math.sqrt(langTotalW[langId]));
            const wI = Math.max(1, Math.min(4095, Math.round(wN * CFG.WEIGHT_SCALE)));
            // Pack (weight << 7) | langId into one int: low 7 bits = language id
            // (< 128 langs), remaining upper bits = quantized weight (<= 4095).
            arr.push((wI << 7) | langId);
        }
        data[g] = arr;
        totalPostings += entries.length / 2;
    }
    raw.clear();

    const totalNgrams = Object.keys(data).length;
    const scripts = scrMap(langCodes);
    const dataVersion = readDataVersion() + 1;
    const __meta = {
        type: 'WEIGHTED_IDF',
        dataVersion,
        generated: Date.now(),
        languages: langCodes.length,
        ngramCount: totalNgrams,
        avgLanguagesPerGram: parseFloat((totalPostings / totalNgrams).toFixed(2)),
        config: CFG,
        source: { type: 'local', generatedAt: new Date().toISOString() }
    };

    console.log('📦 Packing snapshot for fast load...');
    const keys = Object.keys(data).sort();
    const nG = keys.length;
    const lens = new Uint16Array(nG);
    const plens = new Uint8Array(nG);
    const postings = new Uint32Array(totalPostings);
    let ppos = 0;
    for (let i = 0; i < nG; i++) {
        const gram = keys[i];
        lens[i] = gram.length;
        const arr = data[gram];
        plens[i] = arr.length;
        postings.set(arr, ppos);
        ppos += arr.length;
    }
    // Raw flat binary container (no v8 serialization): see packFlat() below.
    // starts/offsets/hash are NOT shipped; the runtime rebuilds starts/offsets
    // (prefix sums) and the hash table once, and persists them in the tmp cache.
    const grams = keys.join('');
    const pack = packFlat({
        __meta, langs: langCodes, scripts, grams, lens, plens, postings
    });
    const outPath = path.join(__dirname, 'model.flt.gz');
    // brotli level 10 keeps the tarball small; decompression is a single C++
    // pass and warm loads read the already-decompressed cache instead.
    fs.writeFileSync(outPath, zlib.brotliCompressSync(pack, {
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 }
    }));
    fs.writeFileSync(VER_FILE, JSON.stringify({
        dataVersion,
        format: 1,
        rawSize: fs.statSync(outPath).size,
        generatedAt: new Date().toISOString()
    }, null, 2));
    syncPackageModelVersion(dataVersion);

    console.log(`\n🔥 Database generated!`);
    console.log(`   🏷️  Data version: ${dataVersion}`);
    console.log(`   📊 N-grams: ${totalNgrams.toLocaleString()}`);
    console.log(`   🌐 Languages: ${langCodes.length}`);
    console.log(`   💾 File: ${outPath}`);
    console.log(`   📦 Flat binary: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB (brotli q11)`);
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
const MAGIC = 'F4STLDF1';

function packFlat(d, extras) {
    const sections = [];
    if (d.__meta !== undefined) sections.push(Buffer.from(JSON.stringify({ m: d.__meta, l: d.langs, s: d.scripts }), 'utf8'));
    else sections.push(Buffer.alloc(0));
    const gb = Buffer.from(d.grams, 'utf16le');
    sections.push(Buffer.concat([Buffer.from([0, 0]), gb])); // 1×u16 0x0000 pad (BOM guard)
    sections.push(bufOf(d.lens), bufOf(d.plens), bufOf(d.postings));
    sections.push(d.hash ? bufOf(d.hash) : Buffer.alloc(0));
    sections.push(extras && d.starts ? bufOf(d.starts) : Buffer.alloc(0));
    sections.push(extras && d.offsets ? bufOf(d.offsets) : Buffer.alloc(0));
    const toc = Buffer.alloc(64);
    const chunks = [];
    let cur = 16 + 64;
    for (let i = 0; i < 8; i++) {
        const p = (cur + 3) & ~3;                 // 4-byte alignment
        if (p !== cur) chunks.push(Buffer.alloc(p - cur));
        toc.writeUInt32LE(p, i * 8);
        toc.writeUInt32LE(sections[i].length, i * 8 + 4);
        chunks.push(sections[i]);
        cur = p + sections[i].length;
    }
    const head = Buffer.alloc(16);
    head.write(MAGIC, 0, 'latin1');
    head.writeUInt32LE(1, 8);
    head.writeUInt32LE(0xFEED0001, 12);
    return Buffer.concat([head, toc, ...chunks]);
}

function bufOf(ta) {
    return Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength);
}

setup().catch(err => {
    console.error('❌ Error:', err.stack);
    process.exit(1);
});
