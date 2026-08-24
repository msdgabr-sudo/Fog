'use strict';

const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const index = read('index.html');
const shadowInit = read('js/22-init.js');
const homeFinal = read('js/home-final.js');
const navigation = read('js/06-navigation.js');
const quranBack = read('js/presentation/quran/back-history.js');
const azkarBack = read('js/presentation/azkar/back-history.js');

[
  ['index.html', index],
  ['js/22-init.js', shadowInit]
].forEach(function (entry) {
  const path = entry[0];
  const source = entry[1];
  [
    '[JS-31] DYNAMIC BACKGROUND SYSTEM',
    'drawBackground(',
    'currentTab',
    'bgCvs',
    "var _pageHistory = ['home'];",
    'function _pushPage(',
    'var _origGT = GT;',
    "history.pushState({page:id}"
  ].forEach(function (token) {
    assert(!source.includes(token), 'retired background/navigation owner remains in ' + path + ': ' + token);
  });
});

assert.strictEqual(fs.existsSync('js/21-quran.js'), false, 'misnamed dead background renderer shadow must stay deleted');
assert(/function\s+GT\s*\(id\)/.test(index), 'index must retain the current page renderer until the later extraction phase');
assert(index.includes('loop();'), 'scientific/application main loop startup must remain untouched');
assert(index.includes("document.addEventListener('touchstart'"), 'existing fullscreen gesture hook must remain outside retired Back code');

assert(homeFinal.includes('var renderPage=window.GT;'), 'home-final must capture the sole page renderer directly');
assert(homeFinal.includes("owner:'home-final'"), 'home-final must declare top-level history ownership');
assert(homeFinal.includes("nestedNavigation:'iframe-owned'"), 'top-level owner must leave nested navigation to iframe bridges');
assert(homeFinal.includes("document.body.className='tab-'+id+(id==='home'?' hide-topbar':'')"), 'top-level owner must preserve exact route class behavior');
assert(homeFinal.includes("history.replaceState(stateFor('home')"), 'initial Home state must replace rather than push');
assert(homeFinal.includes("history.pushState(stateFor(id)"), 'Home to internal navigation must push one entry');
assert(homeFinal.includes("history.replaceState(stateFor(id)"), 'internal to internal navigation must replace the internal entry');
assert(!homeFinal.includes('_origGT'), 'top-level owner must not depend on a removed GT wrapper');
assert(!homeFinal.includes('_pageHistory'), 'top-level owner must not depend on a removed private stack');
assert(!homeFinal.includes('stopImmediatePropagation()'), 'single-owner popstate must not suppress unrelated listeners');

assert(navigation.includes('qiblaastro:navigation-change'), 'future extracted renderer must retain the stable navigation event contract');
assert(quranBack.includes("owner:'quran-iframe'"), 'Quran child history must remain iframe-owned');
assert(azkarBack.includes("owner:'azkar-iframe'"), 'Azkar child history must remain iframe-owned');

const navStart = homeFinal.indexOf('/* Android/TWA Back compatibility layer.');
const navEnd = homeFinal.indexOf('/* PWA registration lives here', navStart);
assert(navStart >= 0 && navEnd > navStart, 'top-level navigation runtime must remain independently testable');

let activePage = 'home';
const rendered = [];
const listeners = {};
const documentStub = {
  body: { className: 'hide-topbar tab-home' },
  getElementById: function (id) {
    return /^page-(home|quran|settings)$/.test(id) ? { id: id } : null;
  },
  querySelector: function (selector) {
    return selector === '.page.active' ? { id: 'page-' + activePage } : null;
  }
};
const historyStub = {
  state: null,
  pushed: [],
  replaced: [],
  backCalls: 0,
  replaceState: function (state) { this.state = state; this.replaced.push(state); },
  pushState: function (state) { this.state = state; this.pushed.push(state); },
  back: function () { this.backCalls++; }
};
const windowStub = {
  GT: function (id) { activePage = id; rendered.push(id); },
  addEventListener: function (type, fn) { listeners[type] = fn; }
};
vm.runInNewContext(homeFinal.slice(navStart, navEnd), {
  window: windowStub,
  document: documentStub,
  history: historyStub,
  console: console
});

assert.strictEqual(historyStub.replaced[0].qiblaastroNav.page, 'home', 'startup must replace the current entry with Home');
windowStub.GT('quran');
assert.strictEqual(historyStub.pushed.length, 1, 'Home to internal navigation must push exactly once');
assert.strictEqual(historyStub.state.qiblaastroNav.page, 'quran', 'pushed state must own the selected internal page');
assert.strictEqual(activePage, 'quran', 'page renderer must open the selected internal page');
assert.strictEqual(documentStub.body.className, 'tab-quran', 'internal route must preserve its exact body class');

windowStub.GT('settings');
assert.strictEqual(historyStub.pushed.length, 1, 'internal to internal navigation must not grow history');
assert.strictEqual(historyStub.state.qiblaastroNav.page, 'settings', 'internal transition must replace the current internal state');
assert.strictEqual(activePage, 'settings', 'replacement transition must render the selected page');

windowStub.GT('home');
assert.strictEqual(historyStub.backCalls, 1, 'Home control from an internal page must consume the internal history entry');
listeners.popstate({ state: { qiblaastroNav: { version: 3, page: 'home' } } });
assert.strictEqual(activePage, 'home', 'popstate must render the browser-selected Home state');
assert.strictEqual(documentStub.body.className, 'tab-home hide-topbar', 'Home popstate must restore the exact Home body classes');

const beforeUnknown = rendered.length;
listeners.popstate({ state: { qiblaastroQuranNav: { version: 1, reader: false } } });
assert.strictEqual(rendered.length, beforeUnknown, 'parent Back owner must ignore iframe-local history states');

console.log('PASS top-level navigation and Back have one owner; nested histories remain iframe-local');
