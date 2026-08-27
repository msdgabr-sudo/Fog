'use strict';

const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const uiSource=fs.readFileSync('js/presentation/prayer/adhan-ui.js','utf8');
const bootstrapSource=fs.readFileSync('js/presentation/bootstrap.js','utf8');
const runtimeSource=fs.readFileSync('js/runtime/trusted-location-dependent-sync.js','utf8');

function createHarness(saved){
  const timers=[],alerts=[],notifications=[],audioProfiles=[];
  const store={};
  if(saved)store['qiblaastro-adhan-ui-v5']=JSON.stringify(saved);
  const document={
    readyState:'complete',hidden:false,
    getElementById(){return null;},querySelector(){return null;},
    addEventListener(){},documentElement:{style:{}}
  };
  const context={
    console,Math,JSON,Date,Number,URLSearchParams,document,
    localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},
    setInterval(fn,ms){timers.push({fn,ms});return timers.length;},clearInterval(){},
    setTimeout(fn){fn();return 1;},clearTimeout(){},requestAnimationFrame(fn){fn();},
    addEventListener(){},dispatchEvent(){return true;},
    Notification:function(title,options){notifications.push({title,options});},
    QiblaPrayerLocation:{
      effective(){return {mode:'manual',timeZone:'Asia/Riyadh'};},
      civilHour(d){return ((d.getUTCHours()+3)%24)+d.getUTCMinutes()/60+d.getUTCSeconds()/3600;},
      dateKey(d){return d.toISOString().slice(0,10);}
    }
  };
  context.Notification.permission='granted';
  context.window=context;context.globalThis=context;
  vm.createContext(context);
  vm.runInContext("var _adhanPlayed={},_adhanDay='',_adhanEnabled=true; var pCache=[{n:'الظهر',h:12}]; function _playAdhan(fajr){window.__plays.push(!!fajr);} function _showAdhanAlert(name){window.__alerts.push(name);} function _checkAdhan(){} function adhanSetAudioURLs(normal,fajr,fallback){window.__profiles.push({normal,fajr,fallback});} function adhanSetEnabled(value){_adhanEnabled=!!value;}",context);
  context.__plays=[];context.__alerts=alerts;context.__profiles=audioProfiles;
  vm.runInContext(uiSource,context);
  return {context,timers,alerts,notifications,audioProfiles,plays:context.__plays};
}

const normal=createHarness();
assert(normal.context.QiblaAdhanUI,'Adhan UI API missing');
assert.strictEqual(typeof normal.context.QiblaAdhanUI.checkSchedule,'function','independent Adhan runtime check is missing');
assert(normal.timers.some(t=>t.ms===1000),'Adhan must own a one-second scheduler independent from the compass loop');

const atDhuhr=new Date('2026-08-27T09:00:05.000Z');
normal.context.QiblaAdhanUI.checkSchedule(atDhuhr,[{n:'الظهر',h:12}]);
normal.context.QiblaAdhanUI.checkSchedule(atDhuhr,[{n:'الظهر',h:12}]);
assert.strictEqual(normal.plays.length,1,'one prayer occurrence must play once only');
assert.strictEqual(normal.plays[0],false,'Dhuhr must use the normal Adhan profile');
assert(normal.audioProfiles.some(x=>x.normal==='audio/adhan/mecca.mp3'),'selected local profile was not applied');

normal.context.QiblaAdhanUI.checkSchedule(new Date('2026-08-28T09:00:05.000Z'),[{n:'الظهر',h:12}]);
assert.strictEqual(normal.plays.length,2,'the same prayer must become eligible on the next civil day');

const notificationOnly=createHarness({profile:'calm',advance:0,enabled:true,prayers:{'الظهر':'notification'}});
notificationOnly.context.QiblaAdhanUI.checkSchedule(atDhuhr,[{n:'الظهر',h:12}]);
assert.strictEqual(notificationOnly.plays.length,0,'notification-only mode must not play Adhan');
assert.strictEqual(notificationOnly.notifications.length,1,'notification-only mode must notify once');

const disabled=createHarness({profile:'makkah',advance:0,enabled:false,prayers:{'الظهر':'adhan'}});
disabled.context.QiblaAdhanUI.checkSchedule(atDhuhr,[{n:'الظهر',h:12}]);
assert.strictEqual(disabled.plays.length,0,'master-disabled Adhan must remain silent');

assert(/function\s+loadAdhanRuntime\s*\(/.test(bootstrapSource),'bootstrap must expose an eager Adhan runtime loader');
assert(/function\s+start\(\)\{[^}]*loadAdhanRuntime\(\)[^}]*loadPrayer\(\)/.test(bootstrapSource),'Adhan runtime must start without opening the Prayer screen');
assert(uiSource.includes("typeof runtime.getSchedule==='function'"),'Adhan must prefer the authoritative advanced prayer schedule');
assert(runtimeSource.includes('getSchedule:scheduleCopy'),'trusted runtime must expose an immutable schedule copy outside the protected inline runtime');

console.log('Adhan runtime resilience: independent tick, civil-day reset, per-prayer modes and master switch: PASS');
