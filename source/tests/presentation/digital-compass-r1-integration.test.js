'use strict';
const assert=require('assert');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'../..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const page=read('pages/digital-compass.html');
const css=read('css/digital-compass/digital-compass.css');
const integrationCss=read('css/digital-compass/app-integration.css');
const adapter=read('js/presentation/compass/digital-adapter.js');
const stateSource=read('js/digital-compass/digital-compass-state.js');
const bridge=read('js/digital-compass/digital-compass-app-bridge.js');
const renderer=read('js/digital-compass/digital-compass-renderer.js');
const deviation=read('js/digital-compass/digital-compass-deviation.js');
const controller=read('js/digital-compass/digital-compass-controller.js');
const host=read('js/presentation/compass/digital-screen-host.js');
const mode=read('js/compass-mode-view.js');
const bootstrap=read('js/presentation/bootstrap.js');
const sw=read('service-worker.js');

function sha(file){return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');}

assert.strictEqual((page.match(/id="qd-canvas"/g)||[]).length,1,'one visible compass canvas is required');
assert.strictEqual((page.match(/id="qd-dev-canvas"/g)||[]).length,1,'the deviation chart must remain separate');
assert(!/id=["']cvs["']/.test(page),'the isolated screen must not duplicate the canonical engine canvas');
assert(!/<(?:script|style|link)\b/i.test(page),'screen fragment must contain markup only');
assert(!/\b(?:style|on[a-z]+)=["']/i.test(page),'screen fragment must not contain inline design or handlers');
for(const token of ['id="qd-home"','id="qd-activate"','اضغط للتفعيل','البوصلة الرقمية','القبلة الحسابية','درجة الانحراف','GNSS &amp; GPS','معايرة البوصلة يدوياً'])assert(page.includes(token),'missing reference token: '+token);

assert(css.includes('padding: 48px 12px max(8px, env(safe-area-inset-bottom))'));
assert(css.includes('top: calc(env(safe-area-inset-top, 0px) + 46px)'));
assert(css.includes('width: min(97vw, 55vh, 500px)'));
assert(css.includes('margin: -7px auto 3px'));
assert(css.includes('isolation: isolate;'));
assert(css.includes('contain: layout paint style;'));
assert(!/#page-compass\b|#cvs\b/.test(css),'reference stylesheet must remain independently scoped');
assert(integrationCss.includes('> :not(#qa-digital-compass-host)'),'application bridge must hide the legacy digital composition without deleting it');

for(const [name,source] of Object.entries({adapter,stateSource,bridge,renderer,deviation,controller,host,mode})){
  assert(!/\bQT\s*=(?!=)/.test(source),name+' must not write QT');
  assert(!/\b(?:LAT|LON|deviceHeading|gnssSource|gnssHasTrustedFix|MDECL)\s*=(?!=)/.test(source),name+' must not write authoritative application state');
  assert(!/getUserMedia|mediaDevices|camera-engine|celestial-solver/i.test(source),name+' crossed the camera/solver boundary');
  assert(!/AstronomicalVerificationStore|VerificationSession|recordVerification|verificationOffsetDeg/.test(source),name+' crossed astronomical verification state');
}
assert(!/deviceorientation|DeviceOrientationEvent/.test(bridge),'application bridge must not own a second sensor listener');
assert(adapter.includes('box-heading')&&adapter.includes('box-qibla')&&adapter.includes('box-diff'),'adapter must retain canonical DOM fallbacks');
assert(adapter.includes('activateCompass')&&adapter.includes('tryBrowserGPS')&&adapter.includes('resetCompassCalibration'),'actions must delegate to existing application APIs');
assert(host.includes("page.appendChild(host)"),'digital screen must be appended without replacing the canonical fragment');
assert(!/replaceChildren|replaceWith|cloneNode/.test(host),'digital host must not replace or clone astronomical engine nodes');

const order=[
  'presentation/compass/host.js',
  'presentation/compass/digital-adapter.js',
  'digital-compass/digital-compass-state.js',
  'digital-compass/digital-compass-app-bridge.js',
  'digital-compass/digital-compass-renderer.js',
  'digital-compass/digital-compass-deviation.js',
  'digital-compass/digital-compass-controller.js',
  'presentation/compass/digital-screen-host.js',
  'compass-mode-view.js',
  'compass-astro-dashboard.js'
].map((token)=>bootstrap.indexOf(token));
order.forEach((at,index)=>assert(at>=0,'bootstrap missing stage '+index));
for(let index=1;index<order.length;index++)assert(order[index]>order[index-1],'bootstrap order is not deterministic at stage '+index);
for(const asset of ['pages/digital-compass.html','css/digital-compass/digital-compass.css','js/digital-compass/digital-compass-renderer.js','js/presentation/compass/digital-screen-host.js'])assert(sw.includes(asset),'offline cache missing '+asset);

assert.strictEqual(sha('icons/hm-compass.png'),'8d714b516240988c400f03db89a76d1e5ec32acef8ead5e944636e0e70c49b33');
assert.strictEqual(sha('icons/icon-kaaba.png'),'ac7bf3c1eb933d4e5e5caa81b5f11d8089a849d92aec592a2a4a6ec3a079049d');
assert.strictEqual(sha('icons/icon-sextant.png'),'b2f6184ed4e47f9367e9a381511a373652c5d938163a7e927c099d61a505ede0');

const sandbox={Date,Math,Number,Object,QiblaDigitalCompassAdapter:{snapshot(){return{qiblaDeg:136,headingDeg:117.2,accuracyDeg:2.4,gnssTrusted:true,gnssLabel:'GPS 19م±',latitude:30.1,longitude:31.2};}}};
sandbox.globalThis=sandbox;sandbox.window=sandbox;
vm.runInNewContext(stateSource,sandbox,{filename:'digital-compass-state.js'});
const snap=sandbox.QiblaDigitalCompassState.readHost();
assert.strictEqual(snap.qibla,136);
assert(Math.abs(snap.heading-117.2)<1e-9);
assert(Math.abs(snap.deviation-18.8)<1e-9);
assert.strictEqual(snap.compassAccuracy,2.4);
assert.strictEqual(snap.gnssTrusted,true);
assert.strictEqual(snap.gnssAccuracy,19);

const calls={drawImage:0,created:0};
const gradient={addColorStop(){}};
const context=new Proxy({}, {get(target,key){if(key==='createRadialGradient'||key==='createLinearGradient')return()=>gradient;if(key==='drawImage')return()=>{calls.drawImage++;};if(!(key in target))target[key]=()=>{};return target[key];},set(target,key,value){target[key]=value;return true;}});
function canvas(){return{width:660,height:660,getContext:()=>context};}
const renderSandbox={Math,Number,Object,Date,document:{createElement(name){assert.strictEqual(name,'canvas');calls.created++;return canvas();}}};
renderSandbox.globalThis=renderSandbox;renderSandbox.window=renderSandbox;
vm.runInNewContext(renderer,renderSandbox,{filename:'digital-compass-renderer.js'});
const visible=canvas();
assert.strictEqual(renderSandbox.QiblaDigitalCompassRenderer.render(visible,{heading:117.2,qibla:136}),true);
assert.strictEqual(renderSandbox.QiblaDigitalCompassRenderer.render(visible,{heading:118,qibla:136}),true);
assert.strictEqual(calls.created,1,'renderer must reuse one internal supersampling buffer');
assert.strictEqual(calls.drawImage,2);

console.log('PASS fog isolated qdev R1 digital compass integration');
