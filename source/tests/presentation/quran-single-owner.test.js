'use strict';

const fs = require('fs');
const assert = require('assert');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const index = read('index.html');
const navigation = read('js/06-navigation.js');
const shadowInit = read('js/22-init.js');
const homeFinal = read('js/home-final.js');
const bootstrap = read('js/presentation/bootstrap.js');
const registry = read('js/presentation/page-registry.js');
const host = read('js/presentation/quran/host.js');
const backHistory = read('js/presentation/quran/back-history.js');
const page = read('pages/quran.html');

assert.match(
  index,
  /<div class="page" id="page-quran" data-external-page="quran" aria-label="القرآن الكريم"><\/div>/,
  'index.html must retain only the empty Quran iframe host'
);

[
  ['index.html', index],
  ['js/06-navigation.js', navigation],
  ['js/22-init.js', shadowInit],
  ['js/home-final.js', homeFinal]
].forEach(function (entry) {
  const path = entry[0];
  const source = entry[1];
  [
    '[JS-32] QURAN MODULE',
    '_qrCurrent',
    '_qrMemCache',
    '_qrActive',
    'qrInit(',
    'qrDeactivate(',
    'qrOpen(',
    'qrBack(',
    "getElementById('qr-reader')",
    'originalQrOpen',
    'originalQrBack'
  ].forEach(function (token) {
    assert(!source.includes(token), 'legacy parent Quran owner token remains in ' + path + ': ' + token);
  });
});

assert(!/\bquran\s*:\s*Object\.freeze\(/.test(registry), 'Quran iframe must not have a competing fragment-registry contract');
assert(!bootstrap.includes("loader.mount('quran')"), 'Quran must not be mounted by the fragment page loader');
assert(bootstrap.includes('js/presentation/quran/host.js'), 'bootstrap must load the dedicated Quran iframe host');
assert(bootstrap.includes('QiblaQuranHost.mount'), 'bootstrap must mount the dedicated Quran iframe host');

assert(host.includes("FRAME_SRC='pages/quran.html'"), 'Quran host must load the standalone Quran screen');
assert(host.includes("frame.id='qa-quran-frame'"), 'Quran host must retain the production iframe identity');
['qrApp', 'qrHome', 'qrReader'].forEach(function (id) {
  assert(host.includes("getElementById('" + id + "')"), 'Quran host must validate #' + id);
});
assert(host.includes('presentation/quran/back-history.js'), 'Quran host must install the iframe-local Back bridge');

[
  'qrApp', 'qrHome', 'qrAppBack', 'qrReader', 'qrReaderBack', 'qrSurahList',
  'qrSearchInput', 'qrReaderSurah', 'qrText', 'qrFontMinus', 'qrReaderBookmark'
].forEach(function (id) {
  assert(page.includes('id="' + id + '"'), 'standalone Quran screen missing required ID: ' + id);
});

[
  '../js/quran-reader.js',
  '../js/quran-reader-controls.js',
  '../js/quran-pages.js',
  '../js/quran-experience.js',
  '../js/quran-search-plus.js',
  '../js/quran-khatma-plus.js',
  '../js/quran-reader-meta.js'
].forEach(function (src) {
  assert(page.includes('src="' + src), 'standalone Quran screen missing live controller: ' + src);
});

assert(backHistory.includes("owner:'quran-iframe'"), 'nested Quran Back history must remain iframe-owned');
assert(backHistory.includes("getElementById('qrReader')"), 'Back bridge must observe the modern Quran reader');
assert(backHistory.includes("getElementById('qrReaderBack')"), 'Back bridge must reuse the modern reader Back control');
assert(homeFinal.includes("nestedNavigation:'iframe-owned'"), 'parent Back layer must explicitly leave nested history to iframes');

assert.strictEqual(fs.existsSync('css/presentation/quran/screen.css'), false, 'unused empty Quran presentation CSS must stay deleted');
assert.strictEqual(fs.existsSync('scripts/extract-safe-pages-shadow.js'), false, 'obsolete extractor must not overwrite standalone screens from empty hosts');

const corpus = fs.readdirSync('quran').filter(function (name) { return /^\d+\.json$/.test(name); });
assert.strictEqual(corpus.length, 114, 'verified local Quran corpus must retain all 114 Surah files');

console.log('PASS Quran has one standalone production owner and iframe-local nested history');
