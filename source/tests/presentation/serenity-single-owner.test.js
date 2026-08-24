'use strict';

const fs = require('fs');
const assert = require('assert');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const index = read('index.html');
const homeFinal = read('js/home-final.js');
const navigation = read('js/06-navigation.js');
const bootstrap = read('js/presentation/bootstrap.js');
const registry = read('js/presentation/page-registry.js');
const page = read('pages/serenity.html');
const screen = read('js/presentation/serenity/screen.js');

assert.strictEqual(
  fs.existsSync('js/serenity-quran-stream.js'),
  false,
  'the competing Serenity stream owner must be deleted'
);
assert.strictEqual(fs.existsSync('js/22-init.js'), false, 'the unloaded init shadow must stay deleted');

assert.match(
  index,
  /<div class="page" id="page-serenity" data-page-src="pages\/serenity\.html" aria-busy="true"><\/div>/,
  'index.html must retain only an empty external Serenity host'
);

[
  ['index.html', index],
  ['js/home-final.js', homeFinal],
  ['js/06-navigation.js', navigation]
].forEach(function (entry) {
  const path = entry[0];
  const source = entry[1];
  [
    'serenity-quran-stream',
    'data-serenity-quran-stream',
    '_skTracks',
    '_skActive',
    'skInitCanvas',
    'skDeactivate',
    'skRenderList',
    'skLoad(',
    'skSeek('
  ].forEach(function (token) {
    assert(!source.includes(token), 'legacy Serenity owner token remains in ' + path + ': ' + token);
  });
});

assert(bootstrap.includes("loader.mount('serenity')"), 'presentation bootstrap must mount the registered Serenity page');
assert(bootstrap.includes('js/presentation/serenity/screen.js'), 'presentation bootstrap must load the sole Serenity controller');
assert(bootstrap.includes('QiblaSerenityScreen.mount'), 'presentation bootstrap must activate the sole Serenity controller');
assert(registry.includes("fragment: 'pages/serenity.html'"), 'page registry must point to the sole Serenity markup');
assert(registry.includes("'css/presentation/serenity/screen.css'"), 'page registry must retain Serenity presentation CSS');

[
  'page-serenity',
  'sr-reciter-grid',
  'sr-audio',
  'sk-track-list',
  'sk-play-btn'
].forEach(function (id) {
  assert(page.includes('id="' + id + '"'), 'sole Serenity page missing required ID: ' + id);
});
assert(page.includes('class="sr-stage"'), 'sole Serenity page must retain the full-height stage');

assert(screen.includes('QiblaSerenityScreen=Object.freeze'), 'sole Serenity controller API must remain available');
assert(screen.includes("id('sr-audio')"), 'sole Serenity controller must bind its own audio element');

console.log('PASS Serenity has one production markup/controller owner');
