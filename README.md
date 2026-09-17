# fastld-js

fastld-js is a lightweight, offline language detection library for Node.js. It uses weighted n-gram matching over a compact prebuilt index and does not depend on external services or packages.

The library is designed for speed and simplicity. It is suitable for real-time classification, batch processing, content moderation, and other text analysis workflows.

Repository: https://github.com/zendtay-studio/fastld-js

> **Are you viewing this from GitHub?** Clone the repository, enter the `fastld-js` folder and run `npm i . -g` to install the library (and its CLI) globally:
>
> ```bash
> git clone https://github.com/zendtay-studio/fastld-js.git
> cd fastld-js
> npm i . -g
> ```
>
> **Are you viewing this from npm?** Ignore the block above — `npm install fastld-js` is all you need.

## Features

- **115 languages** (ISO 639-1 codes)
- **~16.5 MB** in-memory model
- **~90 ms** cold start (CLI spawn → result) · **~0.7 ms** per detection (measured on the real 115-language test corpus)
- **Weighted IDF scoring** with script-based prefiltering
- Pure JavaScript, zero dependencies
- Fully offline
- Compatible with CommonJS
- Includes a CLI for quick testing and detection

## Quick Start

```bash
npm install fastld-js
```

```javascript
const { detect } = require('fastld-js');

const result = detect('La vida es hermosa');
console.log(result.name); // "Spanish"
console.log(result.code); // "es"
```

## Installation

```bash
npm install fastld-js
```

## API

The main entry point exports three functions:

- detect(text, limitOrOptions?)
- detectAll(text, options?)
- getDatabaseInfo()

### detect(text, limitOrOptions?)

Returns the most likely language for the provided text.

The second argument is optional and can be **either** a number **or** an options object (never both):

- `detect(text)` → a single result object
- `detect(text, 3)` → an array with the top 3 results
- `detect(text, { allow: [...] })` → a single result, restricted to the allowed languages

```javascript
const { detect } = require('fastld-js');

const result = detect('La vida es hermosa');
console.log(result);
```

Example output:

```json
{
  "code": "es",
  "code2": "spa",
  "name": "Spanish",
  "accuracy": 0.8543,
  "matches": 120,
  "total": 140
}
```

Result fields:

- `code`: ISO 639-1 two-letter code
- `code2`: ISO 639-2 three-letter code
- `name`: human-readable language name
- `accuracy`: confidence score from 0 to 1 (matched n-gram ratio)
- `matches`: number of n-grams that matched the model
- `total`: total n-grams extracted from the text

Pass a number as the second argument to request the top N results as an array:

```javascript
const top3 = detect(text, 3);
console.log(top3);
```

Pass an options object (see [Options](#options)) to filter the candidates, returning a single result:

```javascript
const { detect } = require('fastld-js');

const only = detect('Bonjour le monde', {
  allow: ['fr', 'en', 'es']
});

console.log(only); // { code: 'fr', ... }
```

### detectAll(text, options?)

Returns a ranked array of all matching languages.

```javascript
const { detectAll } = require('fastld-js');

const results = detectAll('Bonjour le monde');
console.log(results[0]);
// → { code: 'fr', code2: 'fra', name: 'French', accuracy: 1, matches: 20, total: 20 }
```

### getDatabaseInfo()

Returns metadata about the loaded model.

```javascript
const { getDatabaseInfo } = require('fastld-js');

const info = getDatabaseInfo();
console.log(info);
```

```json
{
  "type": "WEIGHTED_IDF",
  "dataVersion": 7,
  "languages": 115,
  "ngrams": 473818,
  "config": {
    "MAX_WORDS_PER_LANG": 80000,
    "NGRAM_SIZES": [3, 4, 5],
    "MIN_WORD_LENGTH": 3,
    "TOP_NGRAMS_PER_LANG": 10000,
    "INCLUDE_FULL_WORD": true,
    "TF_SCALE": 200,
    "WEIGHT_SCALE": 64
  },
  "source": { "type": "local" },
  "generated": "2026-09-11T16:06:31.187Z"
}
```

### Options

Both `detect` and `detectAll` accept an options object as the last argument:

- `allow`: array of language codes to restrict the result set
- `exclude`: array of language codes to remove from the result set

Example:

```javascript
const { detectAll } = require('fastld-js');

const results = detectAll('Bonjour le monde', {
  allow: ['fr', 'en', 'es']
});

console.log(results);
```

## CLI

The package includes a command-line interface.

```bash
npx fastld-js "Bonjour le monde"
```

Useful commands:

```bash
npx fastld-js --top 3 "Bonjour le monde"
npx fastld-js --info
npx fastld-js --test
npx fastld-js --help
npx fastld-js --version
```

`--info` (also `-i`) prints the model metadata returned by `getDatabaseInfo()` — data version, language count, n-gram count and configuration. Use it to confirm which model build is loaded.

## Limitations

The detector performs well even on short texts, but for the most reliable results it is recommended to provide a sentence or longer passage — the more n-gram evidence, the higher the confidence.

## License

Apache 2.0

Copyright 2026 ZendTay Studio