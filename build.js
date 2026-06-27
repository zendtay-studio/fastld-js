// build.js – Uses ONLY local files if they already exist

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

// ========== CONFIGURATION ==========
const CONFIG = {
    MAX_WORDS_PER_LANG: 9000,
    NGRAM_SIZES: [2, 3, 4],
    MIN_WORD_LENGTH: 2,
    TOP_NGRAMS_PER_LANG: 9000,
    INCLUDE_FULL_WORD: true
};

const DIR = path.join(__dirname, 'languages');
const ISO_DIR_RE = /^[a-z]{2}$/i;
// ==================================

function isValidLanguageDir(name) {
    return ISO_DIR_RE.test(name);
}

function getTextFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith('.txt'))
        .map(entry => path.join(dir, entry.name));
}

/**
 * Process a language: read all .txt files from its folder, clean them with clear.js,
 * and build n-grams from the resulting tokens.
 */
function processLanguage(iso) {
    const isoDir = path.join(DIR, iso);
    if (!fs.existsSync(isoDir)) return null;

    const files = getTextFiles(isoDir);
    if (files.length === 0) return null;

    const freqMap = Object.create(null);
    let totalWordsProcessed = 0;

    for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf8');
        const tokens = tokenize(content);

        for (let i = 0; i < tokens.length; i++) {
            const word = tokens[i];
            if (word.length < CONFIG.MIN_WORD_LENGTH) continue;

            totalWordsProcessed++;

            if (CONFIG.INCLUDE_FULL_WORD) {
                const fullGram = `#${word}`;
                freqMap[fullGram] = (freqMap[fullGram] || 0) + 1;
            }

            for (const n of CONFIG.NGRAM_SIZES) {
                const maxIndex = word.length - n;
                if (maxIndex < 0) continue;
                for (let j = 0; j <= maxIndex; j++) {
                    const gram = word.substring(j, j + n);
                    freqMap[gram] = (freqMap[gram] || 0) + 1;
                }
            }

            if (totalWordsProcessed >= CONFIG.MAX_WORDS_PER_LANG) break;
        }

        if (totalWordsProcessed >= CONFIG.MAX_WORDS_PER_LANG) break;
    }

    if (totalWordsProcessed === 0) return null;

    const sorted = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
    const topGrams = sorted.slice(0, CONFIG.TOP_NGRAMS_PER_LANG).map(([gram]) => gram);
    console.log(`   ✅ ${iso}: ${topGrams.length} n-grams (${totalWordsProcessed} words)`);
    return { iso, topGrams };
}

async function setup() {
    console.log('🚀 Build using existing local files');

    if (!fs.existsSync(DIR)) {
        console.error('❌ Languages folder "languages/" does not exist');
        console.error('   First download corpora by running: node build.js --download');
        process.exit(1);
    }

    const targets = fs.readdirSync(DIR, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && isValidLanguageDir(entry.name))
        .map(entry => entry.name);

    if (targets.length === 0) {
        console.error('❌ No valid 2-letter language folders found under languages/');
        console.error('   First download corpora by running: node build.js --download');
        process.exit(1);
    }

    console.log(`📁 Processing ${targets.length} languages from local folder...\n`);

    const processed = [];
    for (const iso of targets) {
        const result = processLanguage(iso);
        if (result) processed.push(result);
    }

    console.log('\n🔗 Building inverted index...');
    const index = Object.create(null);

    for (const item of processed) {
        const { iso, topGrams } = item;
        for (const gram of topGrams) {
            if (!index[gram]) index[gram] = [];
            index[gram].push(iso);
        }
    }

    for (const gram in index) {
        if (index[gram].length > 1) {
            index[gram] = [...new Set(index[gram])];
        }
    }

    const totalNgrams = Object.keys(index).length;
    const avgLanguagesPerGram = (Object.values(index).reduce((sum, langs) => sum + langs.length, 0) / totalNgrams).toFixed(2);

    const output = {
        __meta: {
            type: 'PURE_MATCH_ARRAY',
            generated: Date.now(),
            languages: processed.length,
            ngramCount: totalNgrams,
            avgLanguagesPerGram: parseFloat(avgLanguagesPerGram),
            config: CONFIG,
            source: {
                type: 'local',
                generatedAt: new Date().toISOString()
            }
        },
        data: index
    };

    const outputPath = path.join(__dirname, 'data.json');
    fs.writeFileSync(outputPath, JSON.stringify(output));

    console.log(`\n🔥 Database generated!`);
    console.log(`   📊 N-grams: ${totalNgrams.toLocaleString()}`);
    console.log(`   🌐 Languages: ${processed.length}`);
    console.log(`   💾 File: ${outputPath}`);
    console.log(`   📦 Size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
}

setup().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
