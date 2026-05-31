# (FastLd-JS) fastld-js

A fast, lightweight, and high-performance language detection library based on n-gram matching (2-, 3-, and 4-grams). Written in pure JavaScript with zero dependencies, works completely offline. Supports **130+ languages.**

**GitHub:** [https://github.com/zendtay-studio/fastld-js](https://github.com/zendtay-studio/fastld-js)

## ⚡ Performance

This library is optimized for speed. Using an in-memory indexed search (`PURE_MATCH_ARRAY`), detection takes only fractions of a millisecond per text, making it ideal for real-time and batch processing where analytical performance is critical.

## ⚠️ Known Limitation

**Short texts** (e.g., one or two words) do not work reliably. The detection relies on statistical frequency of n-grams, so a medium to long text is required for accurate results.

---

## 📦 Installation

```bash
npm install fastld-js
```

## 🚀 API Usage

All functions are exposed from the main `index.js` file.

### 1. Detect main language (`detect`)

Returns the most probable language, or a limited number of top results.

```javascript
const { detect } = require('fastld-js');

const text = "La familia salió de viaje hacia la playa el fin de semana pasado.";

// Get the most likely language
const result = detect(text);
console.log(result);
/*
Output:
{
  code: 'es',
  code2: 'spa',
  name: 'Spanish',
  accuracy: 0.8543,
  matches: 120,
  total: 140
}
*/

// Get top N results by passing a number
const top3 = detect(text, 3);
console.log(top3); // Array of the 3 most probable languages
```

### 2. Get full breakdown (`detectAll`)

Analyzes the text and returns a sorted array (highest to lowest accuracy) of all supported languages that had matches.

```javascript
const { detectAll } = require('fastld-js');

const text = "The family went on a trip to the beach last weekend.";
const allLanguages = detectAll(text);

console.log(allLanguages[0]);
/*
Output:
{
  code: 'en',
  code2: 'eng',
  name: 'English',
  accuracy: 0.8912,
  matches: 135,
  total: 151
}
*/
```

### 3. Database information (`getDatabaseInfo`)

Returns technical details about the internally loaded data model.

```javascript
const { getDatabaseInfo } = require('fastld-js');

const dbInfo = getDatabaseInfo();
console.log(dbInfo);
```

#### Current technical specifications:

- **Type:** `PURE_MATCH_ARRAY`
- **Languages:** 130
- **Total n-grams:** 254,497
- **Config:** 2, 3, 4-grams, top 9000 per language

## 📄 License

Apache 2.0 © [ZendTay Studio](mailto:zendtaystudio@gmail.com)
