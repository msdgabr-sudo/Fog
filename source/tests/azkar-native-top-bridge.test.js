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

// Top-level host must own the authenticated Android launch.
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
assert(topLocation.href.includes('&mode=start&interval=5&phrase=subhanallah'),'top host must preserve the validated reminder request');
assert(topLocation.href.includes('#Intent;scheme=qiblaastro;package=com.qiblalabs;category=android.intent.category.BROWSABLE;end'),'top host intent must be package-scoped to QiblaAstro');

// The iframe click must delegate synchronously to the trusted top-level host.
let clickHandler=null;
let launchedRequest=null;
const childLocal=storage();
const childSession=storage({'qiblaastro:twa':'1'});
const phrase={value:'سبحان الله'};
const intervalButton={textContent:'5 دقيقة'};
const toggle={disabled:false,textContent:'بدء التنبيه',classList:{toggle(){},contains(){return false;}},closest(){return null;}};
const status={textContent:''},summary={textContent:''};
const childDocument={
  readyState:'complete',
  addEventListener(type,fn){if(type==='click')clickHandler=fn;},
  getElementById(id){return {azAudioPhrase:phrase,azAudioToggle:toggle,azAudioState:status,azAudioSummary:summary}[id]||null;},
  querySelector(selector){return selector==='#azIntervals .az-interval.is-on'?intervalButton:null;}
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
  console,URLSearchParams,encodeURIComponent,Number,Math,Object,String,JSON,
  location:{hash:'',search:'?twa=1'},
  document:childDocument,
  sessionStorage:childSession,
  localStorage:childLocal,
  top:trustedTop,
  parent:trustedTop,
  setTimeout(fn){fn();return 1;},
  alert(){throw new Error('bridge failure alert must not be shown on successful top-level launch');}
};
childContext.globalThis=childContext;
vm.runInNewContext(childSource,childContext,{filename:'azkar-native-reminders.js'});
assert.strictEqual(typeof clickHandler,'function','native reminder click interceptor was not registered');
const event={
  target:{closest(selector){return selector==='#azAudioToggle'?toggle:null;}},
  preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}
};
clickHandler(event);
assert.deepStrictEqual(JSON.parse(JSON.stringify(launchedRequest)),{mode:'start',interval:5,phrase:'subhanallah'},'iframe must delegate the selected reminder to the top-level host');
const saved=JSON.parse(childLocal.getItem('qiblaastro:native-azkar-reminder:v1'));
assert(saved&&saved.running===true&&saved.interval===5&&saved.phrase==='subhanallah','UI state must be committed only after successful native launch');

console.log('Azkar native bridge: iframe click -> trusted top-level TWA -> package-scoped Android intent: PASS');
