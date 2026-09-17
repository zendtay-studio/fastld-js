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

const { detect, getDatabaseInfo } = require('./index');
const pkg = require('./package.json');

const a = process.argv.slice(2);
const t = a.join(' ');

if (a.includes('-v') || a.includes('--version')) {
    console.log(`fastld-js v${pkg.version}`);
    process.exit(0);
}

if (a.includes('-t') || a.includes('--test')) {
    console.log('🧪 Running language detection tests...\n');
    require('./test.js');
    process.exit(0);
}

if (a.includes('-i') || a.includes('--info') || a.includes('--db-info')) {
    console.log(JSON.stringify(getDatabaseInfo(), null, 2));
    process.exit(0);
}

if (a.includes('-h') || a.includes('--help') || t === '') {
    console.log(`
🔤 fastld-js v${pkg.version}

OPTIONS:
  -v, --version     Show version number
  -i, --info        Show database info (languages, ngrams, data version)
  -h, --help        Show this help
  -t, --test        Run complete ISO 639-1 language detection tests
  --top <n>         Show top N languages

EXAMPLES:
  fastld-js "Hello world is god"
  fastld-js "Bonjour le monde" --top 3
  fastld-js --test
`);
    process.exit(0);
}

const ti = a.indexOf('--top');
const n = ti !== -1 && a[ti + 1] ? parseInt(a[ti + 1], 10) : null;

// array when --top was given, single object otherwise.
console.log(JSON.stringify(detect(t, n || {}), null, 2));