'use strict';

const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const sources=['js/prayer/calculation-methods.js','js/prayer/prayer-settings.js','js/prayer/prayer-location.js','js/prayer/time-format.js','js/runtime/trusted-location-dependent-sync.js'].map(p=>fs.readFileSync(p,'utf8'));
let now=Date.parse('2026-08-27T10:00:00.000Z'),solarCalls=0;
class ControlledDate extends Date{
  constructor(...args){super(args.length?args[0]:now);}
  static now(){return now;}
}
const store={},listeners={};
const document={readyState:'complete',hidden:false,querySelector:()=>null,getElementById:()=>null,createElement:()=>({setAttribute(){}}),head:{appendChild(){}},documentElement:{appendChild(){}},addEventListener(){}};
const context={console,Math,JSON,Date:ControlledDate,Intl,Number,document,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},CustomEvent:function(type,options){this.type=type;this.detail=options&&options.detail;},addEventListener:(type,fn)=>{listeners[type]=fn;},dispatchEvent(){return true;},setInterval(){return 1;},clearInterval(){},setTimeout(fn){fn();return 1;},QiblaPrayerScreen:{render(){}},QiblaPrayerScheduleSync:{check(){}}};
context.window=context;context.globalThis=context;
vm.createContext(context);
vm.runInContext("let LAT=30.0444,LON=31.2357,gnssHasTrustedFix=true,gnssSource='gps';let eCache=null,eKey='',pCache=null,pKey='';function solarEvts(){window.__solarCalls++;return {rH:5.25,nH:12.02,sH:18.62,dec:14};}function hm(){return '12:00';}function shms(){return '0';}",context);
Object.defineProperty(context,'__solarCalls',{get(){return solarCalls;},set(v){solarCalls=v;}});
for(const source of sources)vm.runInContext(source,context);
assert.strictEqual(solarCalls,1,'initial trusted schedule must be calculated once');
const originalSchedule=JSON.parse(JSON.stringify(context.QiblaTrustedLocationRuntimeSync.getSchedule()));
assert(originalSchedule.length>=6,'authoritative prayer schedule must be published');
const callerCopy=context.QiblaTrustedLocationRuntimeSync.getSchedule();
callerCopy[0].h=99;
assert.notStrictEqual(context.QiblaTrustedLocationRuntimeSync.getSchedule()[0].h,99,'callers must not mutate the authoritative prayer schedule');
vm.runInContext("pCache=[{n:'legacy',h:1}]",context);
context.QiblaTrustedLocationRuntimeSync.check();
assert.strictEqual(solarCalls,1,'repeated checks on the same civil day must reuse the schedule');
assert.deepStrictEqual(JSON.parse(vm.runInContext('JSON.stringify(pCache)',context)),originalSchedule,'trusted runtime must restore its approved schedule without editing the protected inline loop');
now=Date.parse('2026-08-28T10:00:00.000Z');
context.QiblaTrustedLocationRuntimeSync.check();
assert.strictEqual(solarCalls,2,'the prayer schedule must refresh after the civil day changes');
assert.strictEqual(context.QiblaTrustedLocationRuntimeSync.getState().ok,true);
console.log('Prayer civil-day refresh: PASS');
