# fastld-js

Offline language detection for Node.js — **115 languages**, zero dependencies, ~0.7 ms per detection.

[![npm version](https://img.shields.io/npm/v/fastld-js.svg)](https://www.npmjs.com/package/fastld-js)
[![npm downloads](https://img.shields.io/npm/dm/fastld-js.svg)](https://www.npmjs.com/package/fastld-js)
[![License: Apache-2.0](https://img.shields.io/npm/l/fastld-js.svg)](https://www.apache.org/licenses/LICENSE-2.0)
![Zero dependencies](https://img.shields.io/badge/zero%20dependencies-0%20deps-brightgreen)

```text
┌─────────────────┐        ┌──────────────────────────┐
│    input text   │ ──────►│    tokenize + normalize   │
│  (string/blank) │        │   (fold → words → grams)  │
└─────────────────┘        └───────────┬───────────────┘
                                       │ n-grams (3/4/5)
                                       ▼
             ┌────────────────────────────────────┐
             │      script prefilter (O(1))       │
             │   writing system ──► candidate set │
             └───────────┬────────────────────────┘
                         │ candidate languages
                         ▼
             ┌────────────────────────────────────┐
             │     weighted n-gram voting (3/4/5)  │
             │     FNV-1a hash → inverted index    │
             └───────────┬────────────────────────┘
                         │ scores per language
                         ▼
             ┌────────────────────────────────────┐
             │          ranked candidates          │
             └───────────┬────────────────────────┘
                         │
                         ▼
             ┌────────────────────────────────────┐
             │     best match + accuracy           │
             │   code, code2, name, matches,       │
             │    total, accuracy, detect          │
             └────────────────────────────────────┘
```

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
  - [CommonJS](#commonjs)
  - [ESM](#esm)
  - [Result object](#result-object)
- [API reference](#api-reference)
  - [detect](#detecttext-limitoroptions)
  - [detectAll](#detectalltext-options)
  - [Options](#options)
  - [getDatabaseInfo](#getdatabaseinfo)
  - [supportedLanguages](#supportedlanguages)
  - [languages](#languages)
  - [hasLanguage](#haslanguagecode) · [code3](#code3code) · [name](#namecode)
- [CLI](#cli)
- [License](#license)

## Features

- **115 languages** (ISO 639-1 codes) with English names and ISO 639-2/3 codes
- **~0.7 ms average per detection** (115-language test suite)
- **Zero dependencies**, pure JavaScript, fully offline (model bundled, no network)
- **CommonJS + ESM + TypeScript types** out of the box
- **CLI binary** for scripts and quick testing

> **Tip:** Because the model ships in the package, `detect` works on air-gapped
> systems after the first require.

## Requirements

| Component | Requirement |
| --- | --- |
| Node.js | `>= 12` (CommonJS and ESM) |
| Network | Only needed for `npm install` — never at runtime |

## Installation

Choose whichever source suits you: the **npm registry** (releases) or the **GitHub repository** (source). A local install exposes the CLI in your project's `node_modules/.bin`.

**Option 1 — npm registry:**

```bash
npm install fastld-js
```

**Option 2 — GitHub repository:**

```bash
git clone https://github.com/zendtay-studio/fastld-js.git && cd fastld-js && npm i -g .
```

> **Note:** You can get the package from either source — npm or GitHub. The
> GitHub route installs the current source globally and requires `git` installed.

## Usage

### CommonJS

```javascript
const { detect } = require('fastld-js');

detect('La vida es hermosa');
```

```json
{
  "code": "es",
  "code2": "spa",
  "name": "Spanish",
  "accuracy": 1,
  "matches": 17,
  "total": 17,
  "detect": true
}
```

### ESM

```javascript
import fastld, { detect, detectAll } from 'fastld-js';

detect('La vida es hermosa');
```

> **Note:** The ESM entry re-exports the CommonJS surface plus a `default`
> export, so both `import fastld from 'fastld-js'` and named imports work.

### Result object

Every detection function returns a `DetectResult`:

| Field | Type | Meaning |
| --- | --- | --- |
| `code` | `string` | ISO 639-1 two-letter code; `''` when undecided |
| `code2` | `string` | ISO 639-2/3 three-letter code; `'und'` when undecided |
| `name` | `string` | English language name; `'Undecided'` when undecided |
| `accuracy` | `number` | `matches / total` (0–1), rounded to 4 decimals |
| `matches` | `number` | N-grams from the input that matched this language |
| `total` | `number` | Total N-grams extracted from the input |
| `detect` | `boolean` | `true` = language detected; `false` = undecided (equals `code !== ''`) |

## API reference

| Function | Description |
| --- | --- |
| [`detect(text[, limitOrOptions])`](#detecttext-limitoroptions) | Best-guess result, or top-n array |
| [`detectAll(text[, options])`](#detectalltext-options) | Ranked list of every matching language |
| [`getDatabaseInfo()`](#getdatabaseinfo) | Model metadata (languages, n-grams, version) |
| [`supportedLanguages()`](#supportedlanguages) | All 115 ISO 639-1 codes |
| [`languages()`](#languages) | All 115 `{ code, code2, name }` |
| [`hasLanguage(code)`](#haslanguagecode) | Is a code/name supported? |
| [`code3(code)`](#code3code) | ISO 639-2/3 code for a language |
| [`name(code)`](#namecode) | English name for a language |

### `detect(text[, limitOrOptions])`

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | `string` | Input text. Blank/non-string → undecided. |
| `limitOrOptions` | `number \| object` | Optional. `n` (≥ 0 integer) → top-n array; `0` → `[]`; invalid values ignored. Or an [Options](#options) object. |

```javascript
const { detect } = require('fastld-js');

detect('Bonjour le monde');
```

```json
{
  "code": "fr",
  "code2": "fra",
  "name": "French",
  "accuracy": 1,
  "matches": 20,
  "total": 20,
  "detect": true
}
```

Undecidable input returns the neutral result — this is the only case with `detect: false`:

```javascript
detect('');
```

```json
{
  "code": "",
  "code2": "und",
  "name": "Undecided",
  "accuracy": 0,
  "matches": 0,
  "total": 0,
  "detect": false
}
```

> **Note:** `total` comes from the input, `matches` from the model. A short or
> low-entropy text can still match several languages — check `detect` before
> trusting the top result.

### `detectAll(text[, options])`

Ranked list of every language with a positive score, best first. Accepts the same [Options](#options); undecidable input returns `[]`.

```javascript
const { detectAll } = require('fastld-js');

detectAll('Bonjour le monde');
```

```json
[
  {
    "code": "fr",
    "code2": "fra",
    "name": "French",
    "accuracy": 1,
    "matches": 20,
    "total": 20,
    "detect": true
  },
  {
    "code": "br",
    "code2": "bre",
    "name": "Breton",
    "accuracy": 0.6,
    "matches": 12,
    "total": 20,
    "detect": true
  },
  "..."
]
```

### Options

Common to `detect` and `detectAll`. Codes are matched case-insensitively.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `allow` | `string[]` | — | Only consider these ISO 639-1 codes. |
| `exclude` | `string[]` | — | Never consider these ISO 639-1 codes. |
| `minLen` / `minLength` | `number` | `0` | Minimum trimmed-input length before guessing; shorter input → undecided (`[]` for `detectAll`). |
| `count` | `number` | — | `detect` only: top-`count` result array (same as the numeric limit). |

**`allow`** — restrict candidates:

```javascript
detect('Bonjour le monde', { allow: ['fr', 'en', 'es'] });
```

```json
{
  "code": "fr",
  "code2": "fra",
  "name": "French",
  "accuracy": 1,
  "matches": 20,
  "total": 20,
  "detect": true
}
```

**`exclude`** — forbid candidates (an `allow` list containing no supported code is ignored; `exclude` is applied last):

```javascript
detect('La vida es hermosa y llena de colores', { exclude: ['es'] });
```

```json
{
  "code": "gl",
  "code2": "glg",
  "name": "Galician",
  "accuracy": 0.7568,
  "matches": 28,
  "total": 37,
  "detect": true
}
```

**`minLen`** — refuse short input:

```javascript
detect('hola', { minLen: 10 });
```

```json
{
  "code": "",
  "code2": "und",
  "name": "Undecided",
  "accuracy": 0,
  "matches": 0,
  "total": 0,
  "detect": false
}
```

**`count`** — top-n array (alternative to `detect(text, n)`):

```javascript
detect('Bonjour le monde', { allow: ['fr', 'en'], count: 2 });
```

```json
[
  {
    "code": "fr",
    "code2": "fra",
    "name": "French",
    "accuracy": 1,
    "matches": 20,
    "total": 20,
    "detect": true
  },
  {
    "code": "en",
    "code2": "eng",
    "name": "English",
    "accuracy": 0.5,
    "matches": 10,
    "total": 20,
    "detect": true
  }
]
```

### `getDatabaseInfo()`

Model metadata for the bundled build (values may change between releases):

```javascript
const { getDatabaseInfo } = require('fastld-js');

getDatabaseInfo();
```

```json
{
  "type": "WEIGHTED_IDF",
  "dataVersion": 5,
  "languages": 115,
  "ngrams": 658906,
  "modelNgrams": 658906,
  "config": {
    "MAX_WORDS_PER_LANG": 300000,
    "NGRAM_SIZES": [3, 4, 5],
    "MIN_WORD_LENGTH": 3,
    "TOP_NGRAMS_PER_LANG": 10000,
    "INCLUDE_FULL_WORD": true,
    "TF_SCALE": 200,
    "WEIGHT_SCALE": 64
  },
  "source": {
    "type": "local",
    "generatedAt": "2026-09-14T17:28:02.838Z"
  },
  "generated": "2026-09-14T17:28:02.838Z"
}
```

> **Note:** `dataVersion` mirrors the model build; the cache key is derived from
> it, so an updated model never reuses a stale decompressed snapshot.

### `supportedLanguages()`

All 115 ISO 639-1 codes, sorted:

```javascript
const { supportedLanguages } = require('fastld-js');

supportedLanguages();
```

```json
[
  "ab",
  "af",
  "am",
  "ar",
  "ay",
  "..."
]
```

### `languages()`

All 115 languages as `{ code, code2, name }`:

```javascript
const { languages } = require('fastld-js');

languages();
```

```json
[
  { "code": "ab", "code2": "abk", "name": "Abkhazian" },
  { "code": "af", "code2": "afr", "name": "Afrikaans" },
  { "code": "am", "code2": "amh", "name": "Amharic" },
  "..."
]
```

### Lookups

The three helpers accept an ISO 639-1 code, an ISO 639-2/3 code or an English
name, case-insensitively. `hasLanguage` returns `true`/`false`; `code3` and
`name` return the mapped value or `null` when unknown.

**`hasLanguage(code)`**

```javascript
const { hasLanguage } = require('fastld-js');

hasLanguage('es');        // 'es', 'spa' and 'spanish' all match
hasLanguage('spa');
hasLanguage('spanish');
hasLanguage('xyz');
```

```json
true
true
true
false
```

**`code3(code)`**

```javascript
const { code3 } = require('fastld-js');

code3('es');       // accepts 2-letter, 3-letter or name
code3('spanish');
code3('aa');
```

```json
"spa"
"spa"
null
```

**`name(code)`**

```javascript
const { name } = require('fastld-js');

name('es');
name('orm');
name('');
```

```json
"Spanish"
"Oromo"
null
```

## CLI

The `fastld-js` binary mirrors the library 1:1. After installing the package
(see [Installation](#installation)), the command is available directly — an
**npm registry** install exposes the global binary, and a local install runs it
via `npx` (below):

```bash
fastld-js "La vida es hermosa"
```

```json
{
  "code": "es",
  "code2": "spa",
  "name": "Spanish",
  "accuracy": 1,
  "matches": 17,
  "total": 17,
  "detect": true
}
```

Without a global install, run it from your project via `npx` (the binary lives
in your project's `node_modules/.bin`):

```bash
npx fastld-js "La vida es hermosa"
```

### Command reference

| Command | Description |
| --- | --- |
| `fastld-js "<text>"` | Detect a language (JSON result) |
| `fastld-js "<text>" --top <n>` | Top-`n` result array |
| `fastld-js --info` | `getDatabaseInfo()` |
| `fastld-js --languages` | `languages()` |
| `fastld-js --supported` | `supportedLanguages()` |
| `fastld-js --has <code>` | `true` / `false` |
| `fastld-js --code3 <code>` | ISO 639-2/3 code or `null` |
| `fastld-js --name <code>` | English name or `null` |
| `fastld-js --test` | Run the 115-language suite |
| `fastld-js --version` · `--help` | Version / help |

**Short flags:**

- `-i` (`--info`)
- `-l` (`--languages`)
- `-s` (`--supported`)
- `-a` (`--has`)
- `-c` (`--code3`)
- `-n` (`--name`)
- `-t` (`--test`)
- `-v` (`--version`)
- `-h` (`--help`)

> **Note:** Value flags (`--top <n>`, `-a`, `-c`, `-n`) must be immediately
> followed by their value, which is stripped from the analyzed text. Flagless
> flags can appear before or after the text.

## License

Apache 2.0 · Copyright 2026 ZendTay Studio