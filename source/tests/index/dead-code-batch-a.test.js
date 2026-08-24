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
const prayerScreen = read('js/presentation/prayer/screen.js');

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
assert(/function\s+activateCompass\s*\(/.test(index), 'the canonical live compass activation entry point must remain');
['startCalibration','finishCalibration','calSamples','calMode','calTimer','CAL_DURATION','compass-perm-btn','cal-compass-btn','cal-progress-bar','cal-result','compass-ring'].forEach(function (token) {
  assert(!index.includes(token), 'disconnected automatic calibration/permission token returned: ' + token);
});

assert(/function\s+saveCfg\s*\(/.test(index), 'settings persistence must remain');
assert(homeFinal.includes("typeof window.saveCfg==='function'"), 'Home language control must retain settings persistence bridge');
assert(!/function\s+updateDates\s*\(/.test(index), 'the retired duplicate date updater must not return');
assert(index.includes("set('hm-date-greg'") && index.includes("set('hm-date-hijri'"), 'Home date writers must remain');
assert(index.includes("set('pr-h',new Intl.DateTimeFormat"), 'Prayer detail Hijri writer must remain');
assert(prayerScreen.includes('function hijri(now)') && prayerScreen.includes("byId('qa-hijri')"), 'the visible Prayer date owner must remain');

console.log('PASS index dead-code Batch A removal and live dependency retention');
