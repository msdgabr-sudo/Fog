'use strict';

const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const source=fs.readFileSync('js/presentation/prayer/schedule-sync.js','utf8');
const TOKEN='a'.repeat(64);
const WIDGET_KEY='qiblaastro:widget-native-sync-enabled:v1';
const DELIVERY_KEY='qiblaastro:prayer-native-sync-enabled:v1';

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

function flushTimeouts(app){
  while(app.timeouts.length)app.timeouts.shift()();
}

const persisted=storage();
const first=boot(persisted);
flushTimeouts(first);
assert.deepStrictEqual(first.launches,[],'startup must not launch a native bridge before explicit Adhan or widget activation');

const unready=boot(storage());
unready.context.QiblaTrustedLocationRuntimeSync={getSchedule(){return[];},getState(){return{ok:false};}};
assert.strictEqual(unready.context.QiblaPrayerNativeSync.syncWidget(),false,'native bridge must fail closed while the authoritative prayer schedule is unavailable');
assert.deepStrictEqual(unready.launches,[],'legacy pCache must not cross the native bridge after the authoritative runtime has taken ownership');

assert.strictEqual(first.context.QiblaPrayerNativeSync.syncWidget(),true,'explicit widget refresh should launch the authenticated native bridge');
assert.strictEqual(persisted.getItem(WIDGET_KEY),'1','successful explicit widget refresh must persist widget auto-refresh activation');
assert.strictEqual(first.launches.length,1);
assert(first.launches[0].includes('widgetOnly=1'),'explicit widget refresh must remain widget-only');
assert(first.launches[0].includes('notify=0'),'widget-only refresh must never request Adhan notification delivery');

const reopened=boot(persisted);
flushTimeouts(reopened);
assert.strictEqual(reopened.launches.length,1,'an explicitly activated widget should refresh once on the next app start');
assert(reopened.launches[0].includes('widgetOnly=1'),'automatic widget refresh must use the isolated widget-only bridge');
assert(reopened.launches[0].includes('notify=0'),'automatic widget refresh must not request notification or exact-alarm access');

persisted.setItem(DELIVERY_KEY,'1');
const delivery=boot(persisted);
flushTimeouts(delivery);
assert.strictEqual(delivery.launches.length,1,'an activated Adhan schedule should use one full native refresh');
assert(!delivery.launches[0].includes('widgetOnly=1'),'full Adhan refresh must remain distinct from widget-only refresh');
assert(delivery.launches[0].includes('notify=1'),'full Adhan refresh must preserve the enabled delivery state');

console.log('Prayer widget safe auto-sync: explicit activation -> widget-only startup refresh; Adhan delivery remains isolated: PASS');
