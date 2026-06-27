# fastld-js

fastld-js is a lightweight, offline language detection library for Node.js. It uses n-gram matching over a prebuilt index and does not depend on external services or packages.

The library is designed for speed and simplicity. It is suitable for real-time classification, batch processing, content moderation, and other text analysis workflows.

Repository: https://github.com/zendtay-studio/fastld-js

## Features

- Pure JavaScript, zero dependencies
- Fully offline
- Fast detection using an in-memory indexed database
- Supports a broad set of languages
- Compatible with CommonJS
- Includes a CLI for quick testing and detection

## Installation

```bash
npm install fastld-js
```

## API

The main entry point exports three functions:

- detect(text, options)
- detectAll(text, options)
- getDatabaseInfo()

### detect

Returns the most likely language for the provided text.

```javascript
const { detect } = require('fastld-js');

const text = 'La familia salió de viaje hacia la playa el fin de semana pasado.';
const result = detect(text);

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

You can also request the top N results by passing a number:

```javascript
const top3 = detect(text, 3);
console.log(top3);
```

### detectAll

Returns a ranked list of all matching languages.

```javascript
const { detectAll } = require('fastld-js');

const text = 'The family went on a trip to the beach last weekend.';
const results = detectAll(text);

console.log(results[0]);
```

### getDatabaseInfo

Returns metadata about the internal database.

```javascript
const { getDatabaseInfo } = require('fastld-js');

const info = getDatabaseInfo();
console.log(info);
```

## Options

Both detect and detectAll accept an options object with:

- allow: array of language codes to restrict the result set
- exclude: array of language codes to remove from the result set

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
npx fastld-js --test
npx fastld-js --version
```

## Build Process

The database used by the library is generated from local language corpora under the languages folder.

The build step reads language folders, applies the tokenizer, generates n-grams, and writes the compressed index to data.json.

## Limitations

Short texts may produce less reliable results. The detector works best on medium or long passages where enough n-gram evidence is available.

## License

Apache 2.0

Copyright 2026 ZendTay Studio
