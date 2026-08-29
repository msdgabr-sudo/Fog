'use strict';

const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const source=fs.readFileSync('js/presentation/prayer/schedule-sync.js','utf8');
const TOKEN='a'.repeat(64);
const WIDGET_KEY='qiblaastro:widget-native-sync-enabled:v1';
const DELIVERY_KEY='qiblaastro:prayer-native-sync-enabled:v1';
const PREF_KEY='qiblaastro-adhan-ui-v5';

function storage(seed){
  const values=seed||Object.create(null);
  return {
    values,
    getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?String(values[key]):null;},
    setItem(key,value){values[key]=String(value);},
    removeItem(key){delete values[key];}
  };
}

function boot(localStorage){
  const launches=[];
  const timeouts=[];
  let href='https://app.qiblalabs.com/?twa=1';
  const location={hash:'#nativeToken='+TOKEN,pathname:'/',search:'?twa=1'};
  Object.defineProperty(location,'href',{get(){return href;},set(value){href=String(value);launches.push(href);}});
  const sessionStorage=storage();
  const document={
    hidden:false,
    readyState:'complete',
    querySelector(){return null;},
    getElementById(id){return id==='pr-h'?{textContent:'12 ربيع الأول 1448 هـ'}:null;},
    addEventListener(){}
  };
  const context={
    URLSearchParams,
    CustomEvent:function(type,init){this.type=type;this.detail=init&&init.detail;},
    location,
    history:{state:null,replaceState(){}},
    localStorage,
    sessionStorage,
    document,
    LAT:30.0444,
    LON:31.2357,
    QT:136.2,
    gnssSource:'gps',
    pCache:[
      {n:'الفجر',h:5},{n:'الظهر',h:12},{n:'العصر',h:15.5},{n:'المغرب',h:18},{n:'العشاء',h:19.5}
    ],
    QiblaPrayerLocation:{effective(){return {label:'القاهرة',timeZone:'Africa/Cairo'};}},
    QiblaAdhanUI:{getState(){return {enabled:true,advance:0,profile:'makkah',prayers:{'الفجر':'adhan','الظهر':'adhan','العصر':'adhan','المغرب':'adhan','العشاء':'adhan'}};}},
    QiblaPrayerNativePlan:{build(){return {timeZone:'Africa/Cairo'};},serialize(){return '2026-08-26:300,720,930,1080,1170|2026-08-27:301,720,930,1079,1169';}},
    setInterval(){return 1;},
    setTimeout(fn){timeouts.push(fn);return timeouts.length;},
    addEventListener(){},
    dispatchEvent(){},
    Intl,
    Number,
    Object,
    JSON
  };
  context.globalThis=context;
  context.window=context;
  context.top=context;
  vm.runInNewContext(source,context,{filename:'schedule-sync.js'});
  return {context,launches,timeouts,sessionStorage};
}

function flushTimeouts(app){while(app.timeouts.length)app.timeouts.shift()();}

// Migration fail-closed: a user who never enabled native prayer delivery must
// not gain, lose or mutate Adhan merely by asking for an independent widget refresh.
const freshStore=storage();
const fresh=boot(freshStore);
flushTimeouts(fresh);
assert.deepStrictEqual(fresh.launches,[],'startup must not launch a native bridge before explicit Adhan authorization');
assert.strictEqual(fresh.context.QiblaPrayerNativeSync.syncWidget(),false,'independent widget sync must be blocked while Code 3 may still be installed');
assert.strictEqual(freshStore.getItem(WIDGET_KEY),null,'blocked widget sync must not persist an auto-refresh marker');
assert.deepStrictEqual(fresh.launches,[],'blocked widget sync must not send any ambiguous prayer-sync intent to Code 3');

// Even a stale widget-only marker from an earlier candidate must be ignored
// during migration instead of auto-launching an ambiguous Code 3 intent.
const staleWidgetStore=storage({[WIDGET_KEY]:'1'});
const staleWidget=boot(staleWidgetStore);
flushTimeouts(staleWidget);
assert.deepStrictEqual(staleWidget.launches,[],'legacy migration guard must ignore stale widget-only auto-sync markers');

// Authoritative runtime unavailability still fails closed.
const unready=boot(storage({[PREF_KEY]:'{}'}));
unready.context.QiblaTrustedLocationRuntimeSync={getSchedule(){return[];},getState(){return{ok:false};}};
assert.strictEqual(unready.context.QiblaPrayerNativeSync.syncWidget(),false,'authorized full sync must still fail closed while the authoritative prayer schedule is unavailable');
assert.deepStrictEqual(unready.launches,[],'legacy pCache must not cross the native bridge after the authoritative runtime has taken ownership');

// Once the user has explicit prayer/Adhan preferences, widget refresh may reuse
// the normal full sync. That contract is understood by both Code 3 and Code 5.
const authorizedStore=storage({[PREF_KEY]:'{}'});
const authorized=boot(authorizedStore);
assert.strictEqual(authorized.context.QiblaPrayerNativeSync.syncWidget(),true,'authorized widget refresh may reuse the legacy-safe full prayer sync');
assert.strictEqual(authorized.launches.length,1);
assert(!authorized.launches[0].includes('widgetOnly=1'),'migration-safe widget refresh must not use the Code 5-only widgetOnly semantic');
assert(authorized.launches[0].includes('notify=1'),'legacy-safe full sync must carry the user-visible Adhan state');
flushTimeouts(authorized);
assert.strictEqual(authorized.launches.length,1,'startup refresh must deduplicate the already-sent authorized delivery state');

// Passive startup/focus/poll navigation is intentionally disabled even after the
// user has previously activated native Adhan delivery. This prevents Android
// intent navigation from stealing TWA focus while loading. An explicit user sync
// remains allowed and must preserve the full Adhan delivery state.
const deliveryStore=storage({[DELIVERY_KEY]:'1'});
const delivery=boot(deliveryStore);
flushTimeouts(delivery);
assert.strictEqual(delivery.launches.length,0,'an activated Adhan schedule must not auto-launch Android navigation on startup');
assert.strictEqual(delivery.context.QiblaPrayerNativeSync.sync(),true,'explicit user prayer sync must remain available');
assert.strictEqual(delivery.launches.length,1,'explicit user prayer sync should launch exactly one native refresh');
assert(!delivery.launches[0].includes('widgetOnly=1'),'full Adhan refresh must remain legacy-compatible during migration');
assert(delivery.launches[0].includes('notify=1'),'full Adhan refresh must preserve the enabled delivery state');

assert(source.includes('var LEGACY_CODE3_MIGRATION_GUARD=true'),'Code 3 migration guard must remain explicitly enabled until the old wrapper is retired');
assert(source.includes('var AUTO_NATIVE_NAVIGATION=false'),'passive Android navigation must remain disabled during normal startup/focus/poll cycles');
console.log('Prayer widget migration safety: passive native navigation blocked; explicit authorized Code 3/5 full sync preserved: PASS');
