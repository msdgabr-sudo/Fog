'use strict';
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8');}
function fail(msg){throw new Error(msg);}
const html=read('index.html');
const homeJs=read('js/home-final.js');
const sw=read('service-worker.js');

const must=[
  'id="page-home"','id="qa-home"',
  'data-go="compass" data-compass-mode="digital"',
  'data-go="compass" data-compass-mode="astro"',
  '>التحقق الفلكي<','>القبلة الرقمية<',
  'id="qibla-compass-engine-anchors"','id="cvs"','id="dev-slider"',
  'id="page-compass" data-external-page="compass"',
  'id="page-night" data-external-page="falaki"'
];
for(const token of must) if(!html.includes(token)) fail('Missing static Home contract token: '+token);
for(const id of ['page-home','qa-home','page-compass','page-night','cvs','dev-slider']){
  const n=(html.match(new RegExp('id=["\\\']'+id+'["\\\']','g'))||[]).length;
  if(n!==1) fail('Expected one '+id+', found '+n);
}
if(/createElement\(['"]main['"]\)/.test(homeJs)||homeJs.includes('page.insertBefore(root')||homeJs.includes('root.innerHTML')){
  fail('home-final.js must bind static Home, not generate it');
}
if(fs.existsSync('css/05-topbar.css')||fs.existsSync('css/06-navigation.css')) fail('Retired global shell styles must stay deleted');
if(html.includes('<nav class="nav"')||html.includes('class="ad-slot"')||html.includes('class="topbar"')) fail('Retired global shell markup must stay absent');
if(!/<body\s+class="tab-home"\s+data-qa-active-page="home"/.test(html)) fail('Home route state must be complete on first paint');
if(!html.includes('<script src="js/06-navigation.js"></script>')) fail('The sole external renderer must be loaded');
for(const asset of [
  './css/home-final.css','./css/home-header-controls.css','./css/home-button-icons-polish.css','./js/home-final.js',
  './js/home-reference-finalizer.js','./images/home/qibla-bg-4k.webp','./images/home/qibla-bg-embedded.svg','./images/home/kaaba-reference.data-uri.txt'
]) if(!sw.includes(asset)) fail('Home offline asset missing: '+asset);
if(!sw.includes("const VERSION='qiblaastro-3.1.0-code3-location-only-r8-activation-layout2'")) fail('Expected current Fog digital-compass cache generation');
console.log('Static Home transfer contract: PASS');
