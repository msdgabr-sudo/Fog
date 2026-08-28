'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const source=fs.readFileSync('js/presentation/prayer/schedule-sync.js','utf8');
assert(source.includes('function widgetPresentation(payload,hijriOverride)'),'rich widget formatter missing');
assert(source.includes("q.set('hijri',widget.summary)"),'native widget sync must receive the rich summary');
assert(!source.includes('widgetCountdown'),'Code 5 must not fake a stale live countdown');
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
const context={console,URLSearchParams,Intl,Date,Number,Math,Object,Array,String,Promise,document:null,location:{hash:'',pathname:'/',search:''},history:{replaceState(){}},sessionStorage:storage(),localStorage:storage(),setInterval(){return 1;},setTimeout(){return 1;},addEventListener(){}};
context.globalThis=context;
vm.runInNewContext(source,context,{filename:'schedule-sync.js'});
assert(context.QiblaPrayerNativeSync&&typeof context.QiblaPrayerNativeSync.widgetPreview==='function','widget preview helper must be exported for regression testing');
const preview=context.QiblaPrayerNativeSync.widgetPreview({loc:{label:'موقعك الحالي',timeZone:'Africa/Cairo'},plan:{timeZone:'Africa/Cairo'},times:{fajr:299,dhuhr:777,asr:991,maghrib:1162,isha:1282}},'16 ربيع الأول 1448 هـ');
assert.strictEqual(preview.city,'موقعك الحالي');
assert(preview.summary.length<=80,'native safeText limit is 80 chars');
for(const value of ['فج04:59','ظه12:57','عص16:31','مغ19:22','عش21:22'])assert(preview.summary.includes(value),`missing prayer time ${value}`);
assert(preview.summary.includes('ربيع')||preview.summary.includes('أغسطس'),'summary must preserve date context');
console.log('Code 5 widget rich summary: Gregorian/Hijri context + all five prayer times within native 80-char field: PASS');
