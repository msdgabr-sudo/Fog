'use strict';
const fs=require('fs');
function read(file){return fs.readFileSync(file,'utf8');}
function assert(condition,message){if(!condition)throw new Error(message);}

const adapter=read('js/presentation/compass/digital-adapter.js');
const state=read('js/digital-compass/digital-compass-state.js');
const bridge=read('js/digital-compass/digital-compass-app-bridge.js');
const controller=read('js/digital-compass/digital-compass-controller.js');
const host=read('js/presentation/compass/digital-screen-host.js');
const mode=read('js/compass-mode-view.js');
const page=read('pages/digital-compass.html');
const css=read('css/digital-compass/digital-compass.css');
const runtime=read('js/presentation/bootstrap.js');
const sw=read('service-worker.js');

for(const [name,source] of Object.entries({adapter,state,bridge,controller,host,mode})){
  assert(!/\bcalcQibla\b/.test(source),name+' must not calculate Qibla');
  assert(!/\bQT\s*=(?!=)/.test(source),name+' must not write QT');
  assert(!/getUserMedia|mediaDevices|camera-engine|celestial-solver/i.test(source),name+' must not access camera/solver');
  assert(!/AstronomicalVerificationStore|VerificationSession|recordVerification|verificationOffsetDeg/.test(source),name+' must not access verification state');
}
['box-heading','box-qibla','box-diff','compass-accuracy','gnss-badge','gnss-btn-status'].forEach((token)=>assert(adapter.includes(token),'adapter missing canonical output '+token));
['activateCompass','tryBrowserGPS','resetCompassCalibration'].forEach((token)=>assert(adapter.includes(token),'adapter missing existing action '+token));
assert(!/deviceorientation|DeviceOrientationEvent/.test(bridge),'bridge must not create a second sensor owner');
assert(page.includes('id="qd-screen"')&&page.includes('id="qd-canvas"'),'isolated digital screen fragment missing');
assert(!/id=["']cvs["']/.test(page),'digital screen must not duplicate canonical canvas');
assert(css.includes('.qd-screen')&&!/#page-compass\b/.test(css),'digital design must remain qd-scoped');
assert(host.includes('page.appendChild(host)')&&!/replaceChildren|cloneNode/.test(host),'digital host must append without replacing canonical nodes');
assert(mode.includes('QiblaDigitalCompassScreenHost'),'mode controller must switch the isolated digital host');
assert(mode.includes('qa-digital-dashboard-active')&&mode.includes('qa-astro-dashboard-active'),'mode classes missing');

const sequence=['presentation/compass/host.js','digital-adapter.js','digital-compass-state.js','digital-compass-app-bridge.js','digital-screen-host.js','compass-mode-view.js','astro-dashboard.js'].map((token)=>runtime.indexOf(token));
sequence.forEach((at)=>assert(at>=0,'runtime stage missing'));
for(let index=1;index<sequence.length;index++)assert(sequence[index]>sequence[index-1],'runtime load order is invalid');
['pages/digital-compass.html','digital-compass.css','digital-compass-renderer.js','digital-screen-host.js'].forEach((token)=>assert(sw.includes(token),'offline shell missing '+token));
assert(/const VERSION='qiblaastro-[^']+';/.test(sw),'service worker cache generation missing');

console.log('PASS digital compass presentation/engine boundary contract');
