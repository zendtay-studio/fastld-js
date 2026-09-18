#!/usr/bin/env node
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
const {detect, getDatabaseInfo, supportedLanguages, languages, hasLanguage, code3, name} = require('./index');

const e = require('./package.json');

const n = process.argv.slice(2);

const s = (...e) => n.some(n => e.includes(n));

// Remove a flag (and its value) from args and return the value (or null
// when the flag was absent). Keeps flags out of the detected text.
function o(e) {
    const s = n.findIndex(n => e.includes(n));
    if (s === -1) return null;
    const o = n[s + 1] !== undefined ? n[s + 1] : null;
    n.splice(s, 2);
    return o;
}

if (s('-v', '--version')) {
    console.log(`fastld-js v${e.version}`);
    process.exit(0);
}

if (s('-t', '--test')) {
    console.log('🧪 Running language detection tests...\n');
    require('./test.js');
    process.exit(0);
}

if (s('-i', '--info', '--db-info')) {
    console.log(JSON.stringify(getDatabaseInfo(), null, 2));
    process.exit(0);
}

if (s('--languages', '-l')) {
    console.log(JSON.stringify(languages(), null, 2));
    process.exit(0);
}

if (s('--supported', '-s')) {
    console.log(JSON.stringify(supportedLanguages(), null, 2));
    process.exit(0);
}

const t = o([ '--has', '-a' ]);

if (t !== null) {
    console.log(hasLanguage(t));
    process.exit(0);
}

const l = o([ '--code3', '-c' ]);

if (l !== null) {
    console.log(code3(l));
    process.exit(0);
}

const a = o([ '--name', '-n' ]);

if (a !== null) {
    console.log(name(a));
    process.exit(0);
}

const i = o([ '--top' ]);

const c = n.join(' ').trim();

if (s('-h', '--help') || c === '') {
    console.log(`\n🔤 fastld-js v${e.version}\n\nUSAGE:\n  fastld-js [text] [options]\n\nOPTIONS:\n  -v, --version          Show version number\n  -i, --info, --db-info  Show database info (languages, ngrams, data version)\n  -t, --test             Run complete ISO 639-1 language detection tests\n  -h, --help             Show this help\n      --top <n>          Show top N languages (array output; N ≥ 0)\n  -l, --languages        List supported languages (code, code2, name)\n  -s, --supported        List supported ISO 639-1 codes\n  -a, --has <code>       Check whether a language code/name is supported\n  -c, --code3 <code>     Show the ISO 639-2/3 code for a language\n  -n, --name <code>      Show the English name (2/3-letter code or name)\n\nEXAMPLES:\n  fastld-js "Hello world"\n  fastld-js "Bonjour le monde" --top 3\n  fastld-js -a es\n  fastld-js -n spa\n  fastld-js --name es\n  fastld-js -l\n  fastld-js --supported\n  fastld-js -t\n`);
    process.exit(0);
}

const r = i !== null ? parseInt(i, 10) : null;

if (i !== null && (isNaN(r) || !Number.isInteger(r) || r < 0)) {
    console.error(`Invalid --top value: "${i}" (expected a non-negative integer)`);
    process.exit(1);
}

// array when --top was given, single object otherwise.
console.log(JSON.stringify(detect(c, r !== null ? r : {}), null, 2));