'use strict';

const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html', 'utf8');
const homeFinal = fs.readFileSync('js/home-final.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const referencePreview = fs.readFileSync('reference-preview.html', 'utf8');
const homeLanguagePicker = fs.readFileSync('js/i18n/home-language-picker.js', 'utf8');
const internalLanguageBridge = fs.readFileSync('js/i18n/internal-screen-language-bridge.js', 'utf8');
const presentationBootstrap = fs.readFileSync('js/presentation/bootstrap.js', 'utf8');
const liveCompassMode = fs.readFileSync('js/compass-mode-view.js', 'utf8');
const compassPage = fs.readFileSync('pages/compass.html', 'utf8');
const digitalCompassPage = fs.readFileSync('pages/digital-compass.html', 'utf8');
const prayerPage = fs.readFileSync('pages/prayer.html', 'utf8');
const pageRegistry = fs.readFileSync('js/presentation/page-registry.js', 'utf8');

const retired = [
  'js/04-core.js',
  'js/07-settings.js',
  'js/08-share.js',
  'js/13-polaris.js',
  'js/14-shadow.js',
  'js/15-polar-drift.js',
  'js/16-map.js',
  'js/19-main-loop.js',
  'js/22-init.js',
  'js/99-misc.js',
  'js/100-reference-dashboard-stage2.js',
  'js/i18n/direction.js',
  'js/presentation/compass/digital-layout.js',
  'js/presentation/compass/mode-view.js',
  'js/system-check.js'
];

const retiredPresentationLayers = [
  'css/29-horizon-design-system.css',
  'css/30-horizon-compass-instruments.css',
  'css/31-horizon-home-header.css',
  'css/32-horizon-navigation.css',
  'css/33-horizon-mega-interface.css',
  'css/34-horizon-square-dashboard.css',
  'css/35-horizon-dashboard-grid.css',
  'css/36-horizon-dashboard-polish.css',
  'css/36-horizon-reference-parity.css',
  'css/37-horizon-hero-mega-phase1.css',
  'css/37-horizon-reference-home.css',
  'css/38-approved-reference-layout.css',
  'css/39-horizon-mega-phase2-dashboard-nav.css',
  'css/40-horizon-mega-phase3-identity-motion.css',
  'css/41-horizon-mega-phase4-final-polish.css',
  'css/42-horizon-mega-phase5-cross-page-finish.css',
  'css/42-horizon-screenshot-correction.css',
  'css/43-reference-match-stage1.css',
  'css/44-reference-dashboard-stage2.css',
  'css/45-reference-navigation-polish-stage3.css',
  'css/47-phone-reference-final-stage5.css'
];

retired.forEach(function (path) {
  assert.strictEqual(fs.existsSync(path), false, 'unloaded numbered shadow must stay deleted: ' + path);
  assert(!index.includes(path), 'index must not reference a retired shadow: ' + path);
  assert(!worker.includes(path), 'Service Worker must not cache a retired shadow: ' + path);
});

retiredPresentationLayers.forEach(function (path) {
  assert.strictEqual(fs.existsSync(path), false, 'unloaded presentation layer must stay deleted: ' + path);
  assert(!index.includes(path), 'index must not load a retired presentation layer: ' + path);
  assert(!worker.includes(path), 'Service Worker must not cache a retired presentation layer: ' + path);
  assert(!referencePreview.includes(path), 'reference preview must not load a retired presentation layer: ' + path);
});

[
  'const UTC_OFF=3;',
  'const KLAT=21.42250833,KLON=39.82616667;',
  'const R2D=180/Math.PI,D2R=Math.PI/180;',
  "const D8=['شمال','شمال شرق','شرق'",
  'function d8(az)',
  'function hm(h)',
  'function shms(s)',
  'function phaseName(ill,elong)',
  'function gel(id)',
  'function set(id,v)',
  'function loadCfg()',
  'function saveCfg()',
  'loadCfg();',
  'function drawPolarDrift(now)',
  'drawPolarDrift(now);',
  "let eCache=null,eKey='';",
  'let _lastSp=null,_lastMp=null;',
  "document.addEventListener('touchstart'",
  "document.getElementById('sp-canvas')",
  "document.getElementById('qo-canvas')",
  'window._celCheck = _celCheck;',
  "const devSlider = gel('dev-slider');",
  'loop();'
].forEach(function (token) {
  assert(index.includes(token), 'live inline owner or its call was lost: ' + token);
});

assert(homeFinal.includes("s.src='js/i18n/english-rollout.js"), 'the live English rollout owner must remain in home-final');

['activateBubble', 'deactivateBubble', '_swAdhanNotify', 'level-ball', 'level-txt'].forEach(function (token) {
  assert(!index.includes(token), 'unreachable init-only feature leaked into the live inline owner: ' + token);
});

['اتجاه القبلة من الجيزة', 'القبلة تقع جنوب شرق'].forEach(function (token) {
  assert(!index.includes(token), 'stale fixed-location share copy leaked into the live owner: ' + token);
});

['function shareApp()', 'function copyQibla()', 'share-feedback'].forEach(function (token) {
  assert(!index.includes(token), 'unreachable Help-only share runtime returned: ' + token);
});

['id="page-map"', 'id="mapCvs"', 'function drawMap()', 'drawMap();'].forEach(function (token) {
  assert(!index.includes(token), 'unreachable fixed-Giza Map runtime returned: ' + token);
});

[
  'id="page-cal"',
  'id="shadowCvs"',
  'id="err-table"',
  'function drawShadow(saz,salt,vis)',
  'drawShadow(sp.az,sp.altApp,sunV);',
  "buildDG('dgD'",
  "set('cal-az'",
  "seti('cal-qi'"
].forEach(function (token) {
  assert(!index.includes(token), 'unreachable legacy Calibration runtime returned: ' + token);
});

[
  'function buildDG(',
  'function drawPhase(',
  'function drawPolaris(',
  'function buildMethods(',
  "set('nc-az'",
  "seti('qn-instr'",
  'const DI=',
  'let ptick='
].forEach(function (token) {
  assert(!index.includes(token), 'retired parent-document Night presentation returned: ' + token);
});

assert(index.includes('function calcPrayers(evts)'), 'the live prayer calculation engine must remain');
assert(index.includes('function updatePrayers(now,evts)'), 'the live prayer-cache updater must remain');
assert(index.includes('pCache=calcPrayers(evts)'), 'the main loop must continue to seed the shared prayer cache');
[
  'const PICO=',
  "set('p-cd'",
  "gel('p-prog')",
  "gel('p-list')",
  "set('pr-raz'",
  "set('pr-saz'"
].forEach(function (token) {
  assert(!index.includes(token), 'retired parent-document Prayer presentation returned: ' + token);
});
['qa-prayer-legacy-contract', 'id="p-cd"', 'id="p-nn"', 'id="p-prog"', 'id="p-list"'].forEach(function (token) {
  assert(!prayerPage.includes(token), 'hidden legacy Prayer DOM contract returned: ' + token);
});
['\'p-cd\'', '\'p-nn\'', '\'p-prog\'', '\'p-list\''].forEach(function (token) {
  assert(!pageRegistry.includes(token), 'retired Prayer ID returned to the page-loader contract: ' + token);
});

[
  "getElementById('box-diff-inline')",
  'function updateDates()',
  "set('date-greg'",
  "set('date-hijri'",
  "set('s-eot'",
  "set('s-eots'",
  "set('s-rf'",
  "gel('skyArc')",
  "gel('sunBall')",
  "gel('moonBall')",
  "gel('qibla-needle')",
  "gel('qibla-head')",
  'function startCalibration()',
  'function finishCalibration()',
  'function requestCompassPermission()',
  'function updateCompassStatus(',
  'function _safeOrient()',
  'function _requestCompassPermission()',
  'calSamples',
  'calMode',
  'calTimer',
  'CAL_DURATION',
  "gel('cal-compass-btn')",
  "gel('cal-progress-bar')",
  "gel('cal-result')",
  "gel('compass-perm-btn')",
  "gel('compass-ring')",
  'function seti(id,v)',
  'function updateCompassHeadingUI()'
].forEach(function (token) {
  assert(!index.includes(token), 'retired parent Compass artifact returned: ' + token);
});
['box-heading','box-qibla','box-diff','box-dir','compass-accuracy','manual-cal-section','cal-offset-display','sunFill','moonFill','mag-decl-inline'].forEach(function (id) {
  assert(index.includes("'" + id + "'") || compassPage.includes('id="' + id + '"'), 'live Compass contract was lost: ' + id);
});

assert(index.includes('G-1D1GKVZB74'), 'the production Analytics identity must remain in the live shell');
assert(!index.includes('G-QMRD6BZDRH'), 'the stale Analytics identity from the retired core shadow must not return');
assert.strictEqual(fs.existsSync('js/101-reference-home-rebuild-stage4.js'), true, 'the live reference-preview runtime must remain');
assert(referencePreview.includes('js/101-reference-home-rebuild-stage4.js'), 'reference preview must keep loading its stage-4 runtime');
assert.strictEqual(fs.existsSync('css/46-reference-home-rebuild-stage4.css'), true, 'the live reference-preview stylesheet must remain');
assert(referencePreview.includes('css/46-reference-home-rebuild-stage4.css'), 'reference preview must keep loading its stage-4 stylesheet');
assert(homeLanguagePicker.includes('function setDocDirection(l)'), 'the live Home language owner must retain document direction switching');
assert(homeLanguagePicker.includes("(l==='ar'||l==='ur')?'rtl':'ltr'"), 'Arabic and Urdu must remain RTL in the live Home language owner');
assert(internalLanguageBridge.includes('function direction(doc,lang)'), 'the live internal-screen language owner must retain frame direction switching');
assert(internalLanguageBridge.includes('.qr-text,#qrText,.qr-basmala'), 'Quran source text must remain direction-protected');
assert(internalLanguageBridge.includes('.az-dhikr-text,#azDhikrText'), 'Dhikr source text must remain direction-protected');
assert(internalLanguageBridge.includes('QiblaInternalLanguageBridge=Object.freeze'), 'the live internal language bridge API must remain available');
assert(presentationBootstrap.includes("loadScript('js/compass-mode-view.js"), 'bootstrap must retain the live compass mode coordinator');
assert(!presentationBootstrap.includes('presentation/compass/mode-view.js'), 'bootstrap must not restore the retired compass mode chain');
assert(liveCompassMode.includes('QiblaDigitalCompassScreenHost'), 'live mode coordinator must switch the isolated digital screen host');
assert(liveCompassMode.includes('QiblaCompassViewMode=Object.freeze'), 'live compass mode API must remain available');
assert(!liveCompassMode.includes('QiblaDigitalCompassLayout'), 'live mode coordinator must not depend on the retired legacy layout annotator');
assert(digitalCompassPage.includes('id="qd-screen"'), 'isolated digital compass screen must remain available');
assert(digitalCompassPage.includes('id="qd-heading-sub">اضغط للتفعيل'), 'digital compass activation prompt must remain intact');

console.log('PASS unloaded runtime and presentation shadows stay retired while every live owner remains intact');
