# Build

Download the reference corpora used to build the language database. The corpus folders must end up inside the local `languages` folder so the build step can generate `model.flt.gz`.

## 1) Recommended: fastld-corpus

Same data as the repositories below, plus extra frequency lists, already shaped as `languages/<iso>/*.txt`.

```bash
git clone https://github.com/zendtay-studio/fastld-corpus.git && mv fastld-corpus/languages/* languages && rm -rf fastld-corpus
```

## 2) Alternative: UDHR text corpus

```bash
git clone https://github.com/patrickschur/language-detection.git && mv language-detection/resources/* languages && rm -rf language-detection
```

## 3) Alternative: frequency word lists

```bash
git clone https://github.com/hermitdave/FrequencyWords.git && mv FrequencyWords/content/2018/* languages && rm -rf FrequencyWords
```

## Build the index -> model.flt.gz

```bash
node build.js
```

The build writes a gzipped V8 snapshot. On first load the runtime decompresses it
and caches the raw snapshot in the OS temp dir; later runs load the cache directly.