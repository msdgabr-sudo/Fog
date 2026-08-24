'use strict';

const fs = require('fs');
const assert = require('assert');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const index = read('index.html');
const adhanUi = read('js/presentation/prayer/adhan-ui.js');
const digitalAdapter = read('js/presentation/compass/digital-adapter.js');
const homeFinal = read('js/home-final.js');

const retiredTokens = [
  'id="compass-activate"',
  '_inertiaCurrent',
  '_inertiaTarget',
  '_inertiaUpdate',
  '_setInertiaTarget',
  'drawCompassInertia',
  'dismissActivationScreen',
  'adhanToggleSound',
  '_zkParticlesEnabled',
  'zkDrops',
  'zkCompletionMsg',
  '_bubbleActive',
  'activateBubble',
  '_startBubble',
  '_onBubble',
  'deactivateBubble',
  '_swAdhanNotify'
];

retiredTokens.forEach(function (token) {
  assert(!index.includes(token), 'retired Batch A token returned to index.html: ' + token);
});

assert(/function\s+adhanPlayNow\s*\(/.test(index), 'live Adhan preview fallback must remain');
assert(adhanUi.includes("typeof adhanPlayNow==='function'"), 'prayer screen must retain the Adhan preview fallback contract');

[
  'resetCompassCalibration',
  'showManualCal',
  'hideManualCal'
].forEach(function (name) {
  assert(new RegExp('function\\s+' + name + '\\s*\\(').test(index), 'live compass calibration function must remain: ' + name);
  assert(digitalAdapter.includes(name), 'digital compass adapter must retain calibration bridge: ' + name);
});

assert(/function\s+saveCfg\s*\(/.test(index), 'settings persistence must remain');
assert(homeFinal.includes("typeof window.saveCfg==='function'"), 'Home language control must retain settings persistence bridge');
assert(/function\s+updateDates\s*\(/.test(index), 'the executing date updater must remain');

console.log('PASS index dead-code Batch A removal and live dependency retention');
