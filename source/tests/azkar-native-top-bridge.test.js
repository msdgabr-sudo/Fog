'use strict';

const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const hostSource=fs.readFileSync('js/presentation/azkar/host.js','utf8');
const childSource=fs.readFileSync('js/azkar-native-reminders.js','utf8');
const pageSource=fs.readFileSync('pages/azkar.html','utf8');
const serviceWorker=fs.readFileSync('service-worker.js','utf8');

assert(pageSource.includes('azkar-native-reminders.js?v=20260828-topbridge1'),'Azkar page must request the top-level native bridge release');
assert(serviceWorker.includes("'./js/azkar-native-reminders.js'"),'native Azkar bridge must remain in the offline App Shell');
assert(serviceWorker.includes("'./js/presentation/azkar/host.js'"),'top-level Azkar host must remain in the offline App Shell');
assert(serviceWorker.includes("if(isRefreshableCode(url)){\n    event.respondWith(networkFirst(request, APP_CACHE));"),'online JS/HTML refresh must remain network-first so the bridge hotfix reaches installed clients');

function storage(seed={}){
  const values=new Map(Object.entries(seed));
  return {getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
}
function classList(){return {toggle(){},contains(){return false;},remove(){},add(){}};}

// Top-level host must own the authenticated Android launch and clamp an old
// five-minute request to the Android-safe ten-minute minimum.
const token='abcdefghijklmnopqrstuvwxyzABCDEF';
const topLocation={hash:'',search:'?twa=1',pathname:'/',href:'https://app.qiblalabs.com/?twa=1'};
const topContext={
  console,URLSearchParams,encodeURIComponent,Number,Math,Object,String,
  location:topLocation,
  sessionStorage:storage({'qiblaastro:native-token':token,'qiblaastro:twa':'1'}),
  document:null
};
topContext.globalThis=topContext;
vm.runInNewContext(hostSource,topContext,{filename:'presentation/azkar/host.js'});
assert(topContext.QiblaAzkarHost,'top-level Azkar host was not exported');
assert.strictEqual(topContext.QiblaAzkarHost.nativeReady(),true,'top host must recognize the TWA token');
assert.strictEqual(topContext.QiblaAzkarHost.launchNativeReminder({mode:'start',interval:5,phrase:'subhanallah'}),true,'top host must launch an authenticated reminder intent');
assert(topLocation.href.startsWith('intent://azkar-reminder?token='),'top host must launch the Azkar Android intent');
assert(topLocation.href.includes('&mode=start&interval=10&phrase=subhanallah'),'top host must clamp legacy five-minute requests to ten minutes');
assert(topLocation.href.includes('#Intent;scheme=qiblaastro;package=com.qiblalabs;category=android.intent.category.BROWSABLE;end'),'top host intent must be package-scoped to QiblaAstro');

// The iframe click must delegate synchronously to the trusted top-level host.
let clickHandler=null;
let launchedRequest=null;
const childLocal=storage();
const childSession=storage({'qiblaastro:twa':'1'});
const phrase={value:'سبحان الله'};
const fiveButton={textContent:'5 دقيقة',hidden:false,disabled:false,classList:classList(),click(){}};
const intervalButton={textContent:'10 دقيقة',hidden:false,disabled:false,classList:classList(),click(){}};
const toggle={disabled:false,textContent:'بدء التنبيه',classList:classList(),closest(){return null;}};
const status={textContent:''},summary={textContent:''};
const childDocument={
  readyState:'complete',
  addEventListener(type,fn){if(type==='click')clickHandler=fn;},
  getElementById(id){return {azAudioPhrase:phrase,azAudioToggle:toggle,azAudioState:status,azAudioSummary:summary}[id]||null;},
  querySelector(selector){return selector==='#azIntervals .az-interval.is-on'?intervalButton:null;},
  querySelectorAll(selector){return selector==='#azIntervals .az-interval'?[fiveButton,intervalButton]:[];}
};
const trustedTop={
  location:{hash:'',search:'?twa=1'},
  sessionStorage:storage({'qiblaastro:native-token':token,'qiblaastro:twa':'1'}),
  QiblaAzkarHost:{
    nativeReady(){return true;},
    launchNativeReminder(request){launchedRequest=request;return true;}
  }
};
const childContext={
  console,URLSearchParams,encodeURIComponent,Number,Math,Object,String,JSON,Array,
  location:{hash:'',search:'?twa=1'},
  document:childDocument,
  sessionStorage:childSession,
  localStorage:childLocal,
  top:trustedTop,
  parent:trustedTop,
  setTimeout(fn){fn();return 1;}
};
childContext.globalThis=childContext;
vm.runInNewContext(childSource,childContext,{filename:'azkar-native-reminders.js'});
assert.strictEqual(fiveButton.hidden,true,'five-minute option must be hidden inside Android/TWA');
assert.strictEqual(fiveButton.disabled,true,'five-minute option must be disabled inside Android/TWA');
assert.strictEqual(typeof clickHandler,'function','native reminder click interceptor was not registered');
const event={
  target:{closest(selector){return selector==='#azAudioToggle'?toggle:null;}},
  preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}
};
clickHandler(event);
assert.deepStrictEqual(JSON.parse(JSON.stringify(launchedRequest)),{mode:'start',interval:10,phrase:'subhanallah'},'iframe must delegate a ten-minute-or-longer reminder to the top-level host');
const saved=JSON.parse(childLocal.getItem('qiblaastro:native-azkar-reminder:v1'));
assert(saved&&saved.running===true&&saved.interval===10&&saved.phrase==='subhanallah','UI state must persist the real native ten-minute interval');

console.log('Azkar native bridge: 5-minute legacy input -> 10-minute floor -> trusted top-level TWA -> Android intent: PASS');
