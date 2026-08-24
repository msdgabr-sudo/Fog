'use strict';

const fs = require('fs');
const assert = require('assert');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const index = read('index.html');
const navigation = read('js/06-navigation.js');
const homeFinal = read('js/home-final.js');
const bootstrap = read('js/presentation/bootstrap.js');
const registry = read('js/presentation/page-registry.js');
const host = read('js/presentation/azkar/host.js');
const backHistory = read('js/presentation/azkar/back-history.js');
const page = read('pages/azkar.html');

assert.match(
  index,
  /<div class="page" id="page-azkar" data-external-page="azkar" aria-label="الأذكار"><\/div>/,
  'index.html must retain only the empty Azkar iframe host'
);
assert.strictEqual(fs.existsSync('js/22-init.js'), false, 'the unloaded init shadow must stay deleted');

[
  ['index.html', index],
  ['js/06-navigation.js', navigation],
  ['js/home-final.js', homeFinal],
  ['js/presentation/azkar/host.js', host]
].forEach(function (entry) {
  const path = entry[0];
  const source = entry[1];
  [
    '[JS-3] AZKAR ENGINE',
    '_zkParticlesEnabled',
    'zkDrops(',
    'zkCompletionMsg(',
    'zkSwitch(',
    'zkTap(',
    'initAzkar',
    'az-bg-morning',
    'az-particles',
    'removeLegacyResidue'
  ].forEach(function (token) {
    assert(!source.includes(token), 'legacy parent Azkar owner token remains in ' + path + ': ' + token);
  });
});

assert(!/\bazkar\s*:\s*Object\.freeze\(/.test(registry), 'Azkar iframe must not have a competing fragment-registry contract');
assert(!bootstrap.includes("loader.mount('azkar')"), 'Azkar must not be mounted by the fragment page loader');
assert(bootstrap.includes('js/presentation/azkar/host.js'), 'bootstrap must load the dedicated Azkar iframe host');
assert(bootstrap.includes('QiblaAzkarHost.mount'), 'bootstrap must mount the dedicated Azkar iframe host');

assert(host.includes("FRAME_SRC='pages/azkar.html'"), 'Azkar host must load the standalone Azkar screen');
assert(host.includes("frame.id='qa-azkar-frame'"), 'Azkar host must retain the production iframe identity');
assert(host.includes("frame.setAttribute('allow','autoplay')"), 'Azkar iframe must retain audio permission');
['azkarApp', 'azHome', 'azReader', 'azAudio'].forEach(function (id) {
  assert(host.includes("getElementById('" + id + "')"), 'Azkar host must validate #' + id);
});
assert(host.includes('seedFrameContext(frame)'), 'Azkar host must preserve authenticated native/TWA context propagation');
assert(host.includes('presentation/azkar/back-history.js'), 'Azkar host must install the iframe-local Back bridge');

[
  'azkarApp', 'azHome', 'azReader', 'azAudio', 'azCategoryGrid', 'azBackHome',
  'azAudioBack', 'azDhikrText', 'azAudioPhrase', 'azAudioToggle'
].forEach(function (id) {
  assert(page.includes('id="' + id + '"'), 'standalone Azkar screen missing required ID: ' + id);
});

[
  '../js/azkar-data.js',
  '../js/azkar-verified-overlay.js',
  '../js/azkar-dua-overlay.js',
  '../js/azkar-alert-audio-map.js',
  '../js/azkar-new.js',
  '../js/azkar-native-reminders.js',
  '../js/azkar-final-ui.js'
].forEach(function (src) {
  assert(page.includes('src="' + src), 'standalone Azkar screen missing live controller: ' + src);
});

assert(backHistory.includes("owner:'azkar-iframe'"), 'nested Azkar Back history must remain iframe-owned');
assert(backHistory.includes("getElementById('azReader')"), 'Back bridge must observe the modern Azkar reader');
assert(backHistory.includes("getElementById('azAudio')"), 'Back bridge must observe the modern Azkar audio view');
assert(backHistory.includes('root.AzkarPage.openCategory'), 'Back bridge must reuse the live Azkar controller for Reader restoration');
assert(backHistory.includes('root.AzkarPage.openAudio'), 'Back bridge must reuse the live Azkar controller for Audio restoration');

[
  'js/03-azkar-engine.js',
  'css/22-azkar.css',
  'css/presentation/azkar/screen.css'
].forEach(function (path) {
  assert.strictEqual(fs.existsSync(path), false, 'retired Azkar owner must stay deleted: ' + path);
});

const audioFiles = fs.readdirSync('assets/audio/azkar-alerts').filter(function (name) { return /\.mp3$/i.test(name); });
assert.strictEqual(audioFiles.length, 10, 'approved local Azkar reminder audio set must retain all 10 MP3 files');

console.log('PASS Azkar has one standalone production owner with iframe-local Reader/Audio history');
