'use strict';

const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const bootstrap=fs.readFileSync('js/native-bridge-bootstrap.js','utf8');
const prayer=fs.readFileSync('js/presentation/prayer/schedule-sync.js','utf8');
const azkarHost=fs.readFileSync('js/presentation/azkar/host.js','utf8');
const launcher=fs.readFileSync('android-twa/native/prayer-widget/QiblaLauncherActivity.java','utf8');

const TOKEN='AbCdEfGhIjKlMnOpQrStUvWxYz012345';
assert.strictEqual(TOKEN.length,32);
assert(launcher.includes('fragment("nativeToken=" + Uri.encode(token))')||launcher.includes('encodedFragment("nativeToken=" + Uri.encode(token))'),'Android launcher token contract changed unexpectedly');

function storage(seed={}){
  const values=new Map(Object.entries(seed));
  return {
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key),
    dump:()=>Object.fromEntries(values)
  };
}

function runBootstrap(hash){
  const sessionStorage=storage();
  const replaced=[];
  const location={hash,pathname:'/',search:'?twa=1'};
  const history={state:null,replaceState(state,title,url){replaced.push(url);}};
  const context={console,URLSearchParams,decodeURIComponent,location,history,sessionStorage};
  context.globalThis=context;
  vm.runInNewContext(bootstrap,context,{filename:'native-bridge-bootstrap.js'});
  return {sessionStorage,replaced};
}

// Current Code 3/5 launcher uses Uri.Builder.fragment(decodedText), so Android
// percent-encodes the '=' separator and the browser receives this form.
const legacy=runBootstrap('#nativeToken%3D'+TOKEN);
assert.strictEqual(legacy.sessionStorage.getItem('qiblaastro:native-token'),TOKEN,'bootstrap must decode Android fragment() output');
assert.strictEqual(legacy.sessionStorage.getItem('qiblaastro:twa'),'1','decoded Android token must mark the trusted TWA surface');
assert.deepStrictEqual(legacy.replaced,['/?twa=1'],'captured secret must be removed from the visible URL immediately');

// Future launcher builds may use encodedFragment() and emit the canonical form.
const canonical=runBootstrap('#nativeToken='+TOKEN);
assert.strictEqual(canonical.sessionStorage.getItem('qiblaastro:native-token'),TOKEN,'bootstrap must keep canonical token support');
assert.deepStrictEqual(canonical.replaced,['/?twa=1'],'canonical secret must also be stripped immediately');

// Prayer/Adhan bridge must recover the same Android-encoded fragment even if it
// runs without relying on the bootstrap's stored session value.
{
  const sessionStorage=storage();
  const replaced=[];
  const context={
    console,URLSearchParams,decodeURIComponent,Number,Math,Object,Array,String,JSON,Intl,
    location:{hash:'#nativeToken%3D'+TOKEN,pathname:'/',search:'?twa=1'},
    history:{replaceState(state,title,url){replaced.push(url);}},
    sessionStorage,localStorage:storage(),document:null,
    setTimeout(){return 1;},setInterval(){return 1;},addEventListener(){},CustomEvent:function(){}
  };
  context.globalThis=context;context.top=context;
  vm.runInNewContext(prayer,context,{filename:'presentation/prayer/schedule-sync.js'});
  assert(context.QiblaPrayerNativeSync,'prayer native sync API missing');
  assert.strictEqual(context.QiblaPrayerNativeSync.captureToken(),TOKEN,'prayer/Adhan sync must decode Android token fragment');
  assert.strictEqual(sessionStorage.getItem('qiblaastro:native-token'),TOKEN,'prayer/Adhan token must be persisted in-session');
  assert.deepStrictEqual(replaced,['/?twa=1'],'prayer bridge must strip the token after capture');
}

// Azkar top host must also understand the encoded form directly, so the native
// click path remains functional even before any child-frame seeding occurs.
{
  const location={hash:'#nativeToken%3D'+TOKEN,search:'?twa=1',pathname:'/',href:'https://app.qiblalabs.com/?twa=1#nativeToken%3D'+TOKEN};
  const context={console,URLSearchParams,decodeURIComponent,encodeURIComponent,Number,Math,Object,String,location,sessionStorage:storage(),document:null};
  context.globalThis=context;
  vm.runInNewContext(azkarHost,context,{filename:'presentation/azkar/host.js'});
  assert(context.QiblaAzkarHost,'Azkar host API missing');
  assert.strictEqual(context.QiblaAzkarHost.nativeReady(),true,'Azkar host must accept Android-encoded token fragment');
  assert.strictEqual(context.QiblaAzkarHost.launchNativeReminder({mode:'start',interval:5,phrase:'subhanallah'}),true,'Azkar host must launch after decoding Android token');
  assert(location.href.startsWith('intent://azkar-reminder?token='+TOKEN),'Azkar Android intent must carry the recovered per-install token');
}

console.log('Native token fragment compatibility: Android %3D form + canonical form + Adhan + Azkar: PASS');
