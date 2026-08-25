'use strict';

const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const index = read('index.html');
const homeFinal = read('js/home-final.js');
const navigation = read('js/06-navigation.js');
const homeFinalizer = read('js/home-reference-finalizer.js');
const internalChrome = read('js/presentation/internal-screen-chrome.js');
const activePageCss = read('css/27-animations.css');
const quranBack = read('js/presentation/quran/back-history.js');
const azkarBack = read('js/presentation/azkar/back-history.js');

[
  ['index.html', index]
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
assert.strictEqual(fs.existsSync('js/22-init.js'), false, 'the unloaded init shadow must stay deleted');
assert(!/function\s+GT\s*\(id\)/.test(index), 'index must not retain a second inline page renderer');
assert(index.includes('<script src="js/06-navigation.js"></script>'), 'index must load the sole external page renderer');
assert(!index.includes('<nav class="nav"')&&!index.includes('class="ad-slot"')&&!index.includes('class="topbar"'), 'retired global chrome must not remain in index');
assert(index.includes('loop();'), 'scientific/application main loop startup must remain untouched');
assert(index.includes("document.addEventListener('touchstart'"), 'existing fullscreen gesture hook must remain outside retired Back code');

assert(homeFinal.includes('var renderPage=window.GT;'), 'home-final must capture the sole page renderer directly');
assert(homeFinal.includes("owner:'home-final'"), 'home-final must declare top-level history ownership');
assert(homeFinal.includes("nestedNavigation:'iframe-owned'"), 'top-level owner must leave nested navigation to iframe bridges');
assert(!homeFinal.includes('document.body.className='), 'history owner must not overwrite body state owned by the renderer');
assert(homeFinal.includes("history.replaceState(stateFor('home')"), 'initial Home state must replace rather than push');
assert(homeFinal.includes("history.pushState(stateFor(id)"), 'Home to internal navigation must push one entry');
assert(homeFinal.includes("history.replaceState(stateFor(id)"), 'internal to internal navigation must replace the internal entry');
assert(!homeFinal.includes('_origGT'), 'top-level owner must not depend on a removed GT wrapper');
assert(!homeFinal.includes('_pageHistory'), 'top-level owner must not depend on a removed private stack');
assert(!homeFinal.includes('stopImmediatePropagation()'), 'single-owner popstate must not suppress unrelated listeners');
assert.strictEqual((homeFinal.match(/new MutationObserver/g)||[]).length,1,'Home binding must use one scoped mirror observer, not one observer per field');
assert(homeFinal.includes("root.querySelector('[hidden][aria-hidden=\"true\"]')"),'Home mirror observer must be scoped to the hidden source container');

assert(navigation.includes('qiblaastro:navigation-change'), 'external renderer must retain the stable navigation event contract');
assert(navigation.includes("body.setAttribute('data-qa-active-page',id)"), 'external renderer must publish the active route synchronously');
assert(navigation.includes("body.classList.add('tab-'+id)"), 'external renderer must own tab-* route classes');
assert(!navigation.includes('.nav-item')&&!navigation.includes('.ad-slot'), 'external renderer must not retain retired global chrome logic');
assert(!homeFinalizer.includes('new MutationObserver'), 'Home finalizer must not rescan the complete document after every mutation');
assert(homeFinalizer.includes('qiblaastro:navigation-change'), 'Home finalizer must use the stable route event');
assert(!homeFinalizer.includes('setInterval(syncMoonAltAz,250)'), 'Home finalizer must not force layout four times per second on hidden screens');
assert(!activePageCss.includes('nav.nav')&&!activePageCss.includes('div.nav'), 'active CSS must not retain fixed-shell selectors');
assert(internalChrome.includes('qiblaastro:navigation-change')&&internalChrome.includes('qiblaastro:presentation-page-mounted'), 'internal chrome must synchronize through explicit lifecycle events');
assert(quranBack.includes("owner:'quran-iframe'"), 'Quran child history must remain iframe-owned');
assert(azkarBack.includes("owner:'azkar-iframe'"), 'Azkar child history must remain iframe-owned');

const navStart = homeFinal.indexOf('/* Android/TWA Back compatibility layer.');
const navEnd = homeFinal.indexOf('/* Sole PWA registration owner.', navStart);
assert(navStart >= 0 && navEnd > navStart, 'top-level navigation runtime must remain independently testable');

const rendered = [];
const listeners = {};
function tokenList(initial,onChange){
  const values=new Set(initial||[]);
  const list={
    add:function(){for(const v of arguments)values.add(v);sync();},
    remove:function(){for(const v of arguments)values.delete(v);sync();},
    contains:function(v){return values.has(v);},
    toggle:function(v,force){const next=force===undefined?!values.has(v):!!force;if(next)values.add(v);else values.delete(v);sync();return next;}
  };
  function sync(){for(let i=0;i<list.length;i++)delete list[i];const all=[...values];all.forEach((v,i)=>{list[i]=v;});list.length=all.length;if(onChange)onChange(all);}
  sync();return list;
}
let activePage = 'home';
const pageIds=['home','quran','settings'];
const pages={};
pageIds.forEach(function(id){
  pages[id]={id:'page-'+id,scrollTop:0};
  pages[id].classList=tokenList(id==='home'?['page','active']:['page'],function(all){if(all.includes('active'))activePage=id;});
});
const body={className:'tab-home',scrollTop:0,attrs:{'data-qa-active-page':'home'}};
body.classList=tokenList(['tab-home'],function(all){body.className=all.join(' ');});
body.setAttribute=function(name,value){this.attrs[name]=String(value);};
body.getAttribute=function(name){return this.attrs[name]||'';};
const documentStub = {
  body: body,
  documentElement:{scrollTop:0},
  getElementById: function (id) {
    return /^page-(home|quran|settings)$/.test(id) ? pages[id.slice(5)] : null;
  },
  querySelectorAll: function(selector){return selector==='.page'?Object.values(pages):[];},
  querySelector: function (selector) {
    if(selector==='script[data-qibla-analytics-screen-tracker]')return {};
    return selector === '.page.active' ? pages[activePage] : null;
  },
  createElement:function(){return {};},
  head:{appendChild:function(){}},
  addEventListener:function(){}
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
const runtime = {
  document:documentStub,history:historyStub,console:console,navigator:{geolocation:{clearWatch:function(){}}},
  gnssHasTrustedFix:true,_gnssWatchId:null,CustomEvent:function(type,init){this.type=type;this.detail=init&&init.detail;},
  dispatchEvent:function(){},scrollTo:function(){},requestAnimationFrame:function(fn){fn();},setTimeout:function(fn){fn();},
  addEventListener:function(type,fn){listeners[type]=fn;}
};
runtime.window=runtime;runtime.globalThis=runtime;
vm.createContext(runtime);
vm.runInContext(navigation,runtime);
const renderer=runtime.GT;
runtime.GT=function(id){rendered.push(id);return renderer(id);};
vm.runInContext(homeFinal.slice(navStart, navEnd), runtime);

const windowStub=runtime;
/* History wrapper replaces GT after capturing the external renderer. */
assert.notStrictEqual(windowStub.GT,renderer,'history owner must wrap the external renderer');

assert.strictEqual(historyStub.replaced[0].qiblaastroNav.page, 'home', 'startup must replace the current entry with Home');
windowStub.GT('quran');
assert.strictEqual(historyStub.pushed.length, 1, 'Home to internal navigation must push exactly once');
assert.strictEqual(historyStub.state.qiblaastroNav.page, 'quran', 'pushed state must own the selected internal page');
assert.strictEqual(activePage, 'quran', 'page renderer must open the selected internal page');
assert.strictEqual(documentStub.body.className, 'tab-quran', 'internal route must preserve its exact body class');
assert.strictEqual(documentStub.body.getAttribute('data-qa-active-page'), 'quran', 'renderer must expose the active route');

windowStub.GT('settings');
assert.strictEqual(historyStub.pushed.length, 1, 'internal to internal navigation must not grow history');
assert.strictEqual(historyStub.state.qiblaastroNav.page, 'settings', 'internal transition must replace the current internal state');
assert.strictEqual(activePage, 'settings', 'replacement transition must render the selected page');

windowStub.GT('home');
assert.strictEqual(historyStub.backCalls, 1, 'Home control from an internal page must consume the internal history entry');
listeners.popstate({ state: { qiblaastroNav: { version: 3, page: 'home' } } });
assert.strictEqual(activePage, 'home', 'popstate must render the browser-selected Home state');
assert.strictEqual(documentStub.body.className, 'tab-home', 'Home popstate must restore the exact Home body class without retired chrome state');

const beforeUnknown = rendered.length;
listeners.popstate({ state: { qiblaastroQuranNav: { version: 1, reader: false } } });
assert.strictEqual(rendered.length, beforeUnknown, 'parent Back owner must ignore iframe-local history states');

console.log('PASS top-level navigation and Back have one owner; nested histories remain iframe-local');
