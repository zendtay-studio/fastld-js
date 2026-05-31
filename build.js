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
// ==================================

/**
 * Process a language: read all .txt files from its folder and build n-grams
 */
function processLanguage(iso) {
    const isoDir = path.join(DIR, iso);
    if (!fs.existsSync(isoDir)) return null;

    // Read all .txt files inside the folder
    const files = fs.readdirSync(isoDir).filter(f => f.endsWith('.txt'));
    if (files.length === 0) return null;

    const freqMap = new Map();
    let totalWordsProcessed = 0;

    for (const file of files) {
        const filePath = path.join(isoDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) continue;
            const tokens = tokenize(parts[0]);
            if (tokens.length === 0) continue;
            const word = tokens[0];
            if (word.length < CONFIG.MIN_WORD_LENGTH) continue;

            totalWordsProcessed++;
            
            // Full word as special n-gram
            if (CONFIG.INCLUDE_FULL_WORD) {
                const fullGram = `#${word}`;
                freqMap.set(fullGram, (freqMap.get(fullGram) || 0) + 1);
            }
            
            // Normal n-grams
            for (const n of CONFIG.NGRAM_SIZES) {
                for (let i = 0; i <= word.length - n; i++) {
                    const gram = word.substring(i, i + n);
                    freqMap.set(gram, (freqMap.get(gram) || 0) + 1);
                }
            }

            if (totalWordsProcessed >= CONFIG.MAX_WORDS_PER_LANG) break;
        }
        if (totalWordsProcessed >= CONFIG.MAX_WORDS_PER_LANG) break;
    }

    if (totalWordsProcessed === 0) return null;

    // Sort and take top N
    const sorted = [...freqMap.entries()].sort((a, b) => b[1] - a[1]);
    const topGrams = sorted.slice(0, CONFIG.TOP_NGRAMS_PER_LANG).map(([gram]) => gram);
    console.log(`   ✅ ${iso}: ${topGrams.length} n-grams (${totalWordsProcessed} words)`);
    return { iso, topGrams };
}

async function setup() {
    console.log('🚀 Build using existing local files');
    
    // Check if languages folder exists
    if (!fs.existsSync(DIR)) {
        console.error('❌ Languages folder "languages/" does not exist');
        console.error('   First download corpora by running: node build.js --download');
        process.exit(1);
    }

    // Get all languages (subfolders containing .txt files)
    const targets = fs.readdirSync(DIR).filter(f => {
        const fullPath = path.join(DIR, f);
        if (!fs.statSync(fullPath).isDirectory()) return false;
        const txtFiles = fs.readdirSync(fullPath).filter(file => file.endsWith('.txt'));
        return txtFiles.length > 0;
    });

    if (targets.length === 0) {
        console.error('❌ No .txt files found in any subfolder of languages/');
        console.error('   First download corpora by running: node build.js --download');
        process.exit(1);
    }

    console.log(`📁 Processing ${targets.length} languages from local folder...\n`);

    // Process languages
    const processed = [];
    for (const iso of targets) {
        const result = processLanguage(iso);
        if (result) processed.push(result);
    }

    // Build inverted index
    console.log('\n🔗 Building inverted index...');
    const index = Object.create(null);
    
    for (const item of processed) {
        const { iso, topGrams } = item;
        for (const gram of topGrams) {
            if (!index[gram]) index[gram] = [];
            index[gram].push(iso);
        }
    }

    // Remove duplicates
    for (const gram in index) {
        if (index[gram].length > 1) {
            index[gram] = [...new Set(index[gram])];
        }
    }

    // Statistics
    const totalNgrams = Object.keys(index).length;
    const avgLanguagesPerGram = (Object.values(index).reduce((sum, langs) => sum + langs.length, 0) / totalNgrams).toFixed(2);

    // Save database
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
                path: DIR,
                generatedAt: new Date().toISOString()
            }
        },
        data: index
    };

    const outputPath = path.join(__dirname, 'data.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`\n🔥 Database generated!`);
    console.log(`   📊 N-grams: ${totalNgrams.toLocaleString()}`);
    console.log(`   🌐 Languages: ${processed.length}`);
    console.log(`   💾 File: ${outputPath}`);
    console.log(`   📦 Size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
}

// Run
setup().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
