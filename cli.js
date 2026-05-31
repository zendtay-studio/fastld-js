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

const { detect } = require('./index');
const packageJson = require('./package.json');

const args = process.argv.slice(2);
const text = args.join(' ');

// Show version
if (args.includes('-v') || args.includes('--version')) {
    console.log(`fastld-js v${packageJson.version}`);
    process.exit(0);
}

// Run tests
if (args.includes('-t') || args.includes('--test')) {
    console.log('🧪 Running language detection tests...\n');
    require('./test.js');
    process.exit(0);
}

// Show help
if (args.includes('-h') || args.includes('--help') || text === '') {
    console.log(`
🔤 fastld-js v${packageJson.version}

USAGE:
  fastld-js "text to detect"
  fastld-js "text" --top <n>
  fastld-js -t | --test

OPTIONS:
  -v, --version     Show version number
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

// Detect top N
let limit = null;
const topIndex = args.indexOf('--top');
if (topIndex !== -1 && args[topIndex + 1]) {
    limit = parseInt(args[topIndex + 1], 10);
}

const result = detect(text, limit || {});

if (limit && Array.isArray(result)) {
    // For top N, show formatted array
    console.log(JSON.stringify(result, null, 2));
} else {
    // For single result, show formatted object
    console.log(JSON.stringify(result, null, 2));
}
