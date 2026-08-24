'use strict';

const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html', 'utf8');
const homeFinal = fs.readFileSync('js/home-final.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

const retired = [
  'js/07-settings.js',
  'js/13-polaris.js',
  'js/14-shadow.js',
  'js/15-polar-drift.js',
  'js/16-map.js',
  'js/19-main-loop.js',
  'js/22-init.js'
];

retired.forEach(function (path) {
  assert.strictEqual(fs.existsSync(path), false, 'unloaded numbered shadow must stay deleted: ' + path);
  assert(!index.includes(path), 'index must not reference a retired shadow: ' + path);
  assert(!worker.includes(path), 'Service Worker must not cache a retired shadow: ' + path);
});

[
  'function loadCfg()',
  'function saveCfg()',
  'loadCfg();',
  'function drawPolaris(maz,mvis,malt)',
  'drawPolaris(mp.az,moonV,mp.altApp);',
  'function drawShadow(saz,salt,vis)',
  'drawShadow(sp.az,sp.altApp,sunV);',
  'function drawPolarDrift(now)',
  'drawPolarDrift(now);',
  'function drawMap()',
  'drawMap();',
  "let eCache=null,eKey='';",
  'let _lastSp=null,_lastMp=null;',
  "document.addEventListener('touchstart'",
  "document.getElementById('sp-canvas')",
  "document.getElementById('qo-canvas')",
  'window._celCheck = _celCheck;'
].forEach(function (token) {
  assert(index.includes(token), 'live inline owner or its call was lost: ' + token);
});

assert(homeFinal.includes("s.src='js/i18n/english-rollout.js"), 'the live English rollout owner must remain in home-final');

['activateBubble', 'deactivateBubble', '_swAdhanNotify', 'level-ball', 'level-txt'].forEach(function (token) {
  assert(!index.includes(token), 'unreachable init-only feature leaked into the live inline owner: ' + token);
});

console.log('PASS seven unloaded numbered shadows stay retired while every live inline owner remains intact');
