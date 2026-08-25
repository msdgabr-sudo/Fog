'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const gnss=fs.readFileSync('js/05-gnss.js','utf8');
const astro=fs.readFileSync('js/10-astronomy.js','utf8');
const methodsSrc=fs.readFileSync('js/prayer/calculation-methods.js','utf8');
const locationSrc=fs.readFileSync('js/prayer/prayer-location.js','utf8');
const digitalPage=fs.readFileSync('pages/digital-compass.html','utf8');
const digitalCss=fs.readFileSync('css/digital-compass/digital-compass.css','utf8');

assert(digitalPage.includes('id="qd-heading-sub" data-compass-activation-label>اضغط للتفعيل</small>'),'the activation instruction must be visible button content');
assert(digitalPage.includes('aria-describedby="qd-heading-sub"'),'the activation button must expose its visible instruction to accessibility APIs');
for(const token of ['#qd-activate #qd-heading-sub','display: block !important','visibility: visible !important','opacity: 1 !important']){
  assert(digitalCss.includes(token),`activation visibility guard missing: ${token}`);
}

for(const source of [index,gnss]){
  assert(source.includes('enableHighAccuracy:true'),'GNSS acquisition must request high accuracy');
  assert(source.includes("gnssSource='gps'"),'accepted fixes must retain device-GNSS provenance');
  assert(source.includes('gnssHasTrustedFix=true'),'accepted fixes must publish the trusted-fix state');
  assert(source.includes('lat < -90||lat > 90'),'latitude range validation must run before publication');
  assert(source.includes('lon < -180||lon > 180'),'longitude range validation must run before publication');
  const update=source.slice(source.indexOf('function updateQiblaFromPosition(){'),source.indexOf('// Browser Geolocation',source.indexOf('function updateQiblaFromPosition(){'))>0?source.indexOf('// Browser Geolocation',source.indexOf('function updateQiblaFromPosition(){')):source.indexOf('function resetCompassCalibration',source.indexOf('function updateQiblaFromPosition(){')));
  assert(update.includes('QT=calcQibla(LAT,LON);'),'trusted GNSS must calculate true Qibla');
  assert(!/if\s*\(!refreshMdeclFromTrustedGnss[\s\S]*?return;/.test(update),'true Qibla must not be blocked when magnetic WMM publication is unavailable');
}

const qiblaFunction=index.match(/function calcQibla\(\)\{[\s\S]*?\n\}/);
assert(qiblaFunction,'production Qibla function missing');
function qibla(latitude,longitude){
  const sandbox={Math};
  vm.createContext(sandbox);
  vm.runInContext(`const KLAT=21.42250833,KLON=39.82616667,R2D=180/Math.PI,D2R=Math.PI/180;let LAT=${latitude},LON=${longitude};${qiblaFunction[0]};result=calcQibla();`,sandbox);
  return sandbox.result;
}

const cities=[
  {name:'Cairo',lat:30.0444,lon:31.2357,tz:'Africa/Cairo',qibla:136.137,method:'egyptian'},
  {name:'London',lat:51.5074,lon:-0.1278,tz:'Europe/London',qibla:118.987,method:'mwl'},
  {name:'New York',lat:40.7128,lon:-74.0060,tz:'America/New_York',qibla:58.482,method:'isna'},
  {name:'Jakarta',lat:-6.2088,lon:106.8456,tz:'Asia/Jakarta',qibla:295.152,method:'singapore'},
  {name:'Sydney',lat:-33.8688,lon:151.2093,tz:'Australia/Sydney',qibla:277.500,method:'mwl'},
  {name:'Tokyo',lat:35.6762,lon:139.6503,tz:'Asia/Tokyo',qibla:292.999,method:'mwl'},
  {name:'Johannesburg',lat:-26.2041,lon:28.0473,tz:'Africa/Johannesburg',qibla:14.589,method:'mwl'}
];
for(const city of cities)assert(Math.abs(qibla(city.lat,city.lon)-city.qibla)<0.01,`${city.name}: production Qibla bearing changed unexpectedly`);

// Execute the real Browser Geolocation acceptance path with western-hemisphere
// coordinates. WMM is deliberately unavailable: true Qibla must still publish.
{
  const elements={};
  const runtime={
    console,Math,Date,Number,
    document:{getElementById(id){return elements[id]||(elements[id]={textContent:''});}},
    set(id,value){elements[id]||(elements[id]={textContent:''});elements[id].textContent=String(value);},
    navigator:{
      vibrate(){},
      geolocation:{
        clearWatch(){},
        getCurrentPosition(ok){ok({coords:{latitude:40.7128,longitude:-74.0060,accuracy:8,altitude:12}});},
        watchPosition(){return 7;}
      }
    },
    QiblaWMM2025Runtime:{evaluateTrustedFix(){return {status:'blackout',publish:false};}}
  };
  runtime.window=runtime;
  runtime.globalThis=runtime;
  vm.createContext(runtime);
  vm.runInContext(`
    const KLAT=21.42250833,KLON=39.82616667,R2D=180/Math.PI,D2R=Math.PI/180;
    let MDECL=0,MDECL_READY=false,MDECL_STATUS='unavailable',MDECL_FIELD=null,QT=0,QM=0;
    let _rawHeading=null,compassAvailable=false,calOffset=0;
    function calcQibla(){
      const dL=(KLON-LON)*D2R,f1=LAT*D2R,f2=KLAT*D2R;
      const y=Math.sin(dL)*Math.cos(f2),x=Math.cos(f1)*Math.sin(f2)-Math.sin(f1)*Math.cos(f2)*Math.cos(dL);
      return((Math.atan2(y,x)*R2D)+360)%360;
    }
    function refreshMdeclFromTrustedGnss(){
      const result=window.QiblaWMM2025Runtime.evaluateTrustedFix();
      MDECL_STATUS=result.status;
      MDECL_READY=result.publish===true;
      return MDECL_READY;
    }
  `,runtime);
  vm.runInContext(gnss,runtime,{filename:'js/05-gnss.js'});
  vm.runInContext('tryBrowserGPS()',runtime);
  const accepted=vm.runInContext('({LAT,LON,gnssSource,gnssHasTrustedFix,QT,MDECL_READY})',runtime);
  assert.strictEqual(accepted.gnssHasTrustedFix,true,'real geolocation callback must trust a valid device fix');
  assert.strictEqual(accepted.gnssSource,'gps');
  assert.strictEqual(accepted.LON,-74.006,'western longitude must not be rejected or sign-flipped');
  assert(Math.abs(accepted.QT-58.482)<0.01,'real geolocation callback must publish New York true Qibla');
  assert.strictEqual(accepted.MDECL_READY,false,'the test vector deliberately keeps magnetic publication blocked');
  assert.strictEqual(elements['box-qibla'].textContent,'58.5°','true Qibla UI must remain available through WMM blackout');
  assert.strictEqual(elements['q-mag'].textContent,'---','magnetic Qibla must not be fabricated during WMM blackout');
}

const shared={console,Math,Date,Intl,localStorage:{getItem(){return null;},setItem(){}},dispatchEvent(){},CustomEvent:function(){}};
shared.globalThis=shared;shared.window=shared;vm.createContext(shared);vm.runInContext(locationSrc,shared);vm.runInContext(methodsSrc,shared);
const date=new Date('2026-08-25T12:00:00Z');

for(const city of cities){
  const sandbox={console,Math,Date,Number,Object,window:{}};
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`const UTC_OFF=3,KLAT=21.42250833,KLON=39.82616667,R2D=180/Math.PI,D2R=Math.PI/180;let LAT=${city.lat},LON=${city.lon};${astro}`,sandbox);
  const raw=vm.runInContext('solarEvts(new Date("2026-08-25T12:00:00Z"))',sandbox);
  assert(raw,`${city.name}: solar events must be available on the coverage date`);
  const offset=shared.QiblaPrayerLocation.offsetHours(date,city.tz);
  const delta=offset-3;
  const events=Object.assign({},raw,{rH:(raw.rH+delta+24)%24,nH:(raw.nH+delta+24)%24,sH:(raw.sH+delta+24)%24});
  const result=shared.QiblaPrayerMethods.calculate(events,city.lat,{method:'auto',lon:city.lon,asr:'standard',highLatitude:'auto'},date);
  assert(result&&result.prayers.length===6,`${city.name}: complete prayer schedule missing`);
  assert(result.prayers.every(p=>Number.isFinite(p.h)&&p.h>=0&&p.h<24),`${city.name}: prayer hours must be finite local civil hours`);
  assert(events.nH>=10&&events.nH<=14,`${city.name}: converted solar noon must be a plausible local civil hour`);
  assert.strictEqual(result.methodId,city.method,`${city.name}: automatic regional prayer profile mismatch`);
}

console.log('International GNSS consumer flow: PASS');
console.log('Verified 7 locations across Africa, Europe, North America, Asia and Australia for Qibla, local prayer hours and regional methods.');
