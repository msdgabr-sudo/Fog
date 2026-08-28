'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sw=read('service-worker.js');
const gateway=read('js/astro-verification.js');

assert(sw.includes("const VERSION='qiblaastro-v5.74-native-adhan-owner-20260829'"),'Code 5 Native Adhan offline cache generation mismatch');
assert(sw.includes("const OFFLINE_URL='./offline.html'"),'local offline fallback missing');
assert(sw.includes('await cache.addAll(requests)'),'App Shell install must be atomic');
assert(!sw.includes('Promise.allSettled'),'critical offline caching must not silently ignore missing assets');
assert(sw.includes("caches.match(request,{ignoreSearch:true})"),'versioned local URLs must match their precached path offline');
assert(sw.includes("request.headers.has('range')")&&sw.includes("status:206"),'offline audio byte-range support is missing');

const stack=gateway.match(/var STACK_SCRIPTS = Object\.freeze\(\[([\s\S]*?)\]\);/);
assert(stack,'astronomical gateway stack missing');
const protectedScripts=[...stack[1].matchAll(/'([^']+\.js)'/g)].map(match=>match[1]);
for(const script of protectedScripts){
  assert(sw.includes(`'./${script}'`),`protected verification module is not precached: ${script}`);
}
assert(sw.includes("'./css/28-astronomical-observatory.css'"),'astronomical observatory CSS is not precached');

const quranFiles=Array.from({length:114},(_,index)=>`quran/${index+1}.json`);
for(const file of quranFiles)assert(fs.existsSync(path.join(root,file)),`local Quran file missing: ${file}`);
assert(sw.includes("Array.from({length:114}"),'all 114 local Quran files must be part of first-run precache');
assert(sw.includes("return './quran/'+(index+1)+'.json'"),'Quran precache path contract missing');

const azkarDir=path.join(root,'assets/audio/azkar-alerts');
const azkarAudio=fs.readdirSync(azkarDir).filter(name=>name.endsWith('.mp3'));
assert.strictEqual(azkarAudio.length,10,'expected ten approved local Azkar voice reminders');
for(const name of azkarAudio){
  assert(sw.includes(`'./assets/audio/azkar-alerts/${name}'`),`Azkar audio is not precached: ${name}`);
}

for(const file of [
  'audio/adhan/mecca.mp3','audio/adhan/ahmed-al-nufais.mp3',
  'audio/adhan/islam-sobhi.mp3','audio/adhan/fajr-alafasy.mp3',
  'fonts/KFGQPC-Uthmanic-ScriptHAFS.woff2','manifest.json','site.webmanifest','offline.html'
]){
  assert(fs.existsSync(path.join(root,file)),`offline asset missing: ${file}`);
  assert(sw.includes(`'./${file}'`),`offline asset is not precached: ${file}`);
}

console.log(`Offline shell: ${protectedScripts.length} protected modules, 114 Quran files, 10 Azkar voices and 4 Adhan files: PASS`);
