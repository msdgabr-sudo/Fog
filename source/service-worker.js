/* QiblaAstro — atomic local App Shell, full Quran text, Adhan and Azkar audio.
 * Presentation/PWA integration only; protected scientific files are cached byte-for-byte.
 * © 2026 Mohamed SG Behairy. All Rights Reserved. */
'use strict';

const VERSION='qiblaastro-v5.70-offline-native-20260826';
const BRIDGE_RELEASE='package-scoped-native-20260826';
const GNSS_RELEASE='trusted-startup-recovery-20260818';
const PERMISSIONS_RELEASE='prayer-exact-user-grant-20260826';
const OFFLINE_RELEASE='atomic-app-shell-quran-audio-20260826';
const CACHE_PREFIX='qiblaastro-';
const APP_CACHE=VERSION+'-app';
const RUNTIME_CACHE=VERSION+'-runtime';
const OFFLINE_URL='./offline.html';

/* Every literal below is verified by the repository PWA gate. Do not replace
 * this list with a silent best-effort cache: an incomplete install must fail
 * atomically so the last complete worker remains active. */
const APP_SHELL=[
  './assets/audio/azkar-alerts/أَسْتَغْفِرُ اللهَ ا.mp3',
  './assets/audio/azkar-alerts/أَسْتَغْفِرُ اللهَ.mp3',
  './assets/audio/azkar-alerts/اللهُ أَكْبَرُ.mp3',
  './assets/audio/azkar-alerts/اللَّهُمَّ صَلِّ وَس.mp3',
  './assets/audio/azkar-alerts/الْحَمْدُ للهِ.mp3',
  './assets/audio/azkar-alerts/حَسْبِيَ اللهُ.mp3',
  './assets/audio/azkar-alerts/سبحان الله (377).mp3',
  './assets/audio/azkar-alerts/سبحان الله وبحمده (377).mp3',
  './assets/audio/azkar-alerts/لَا إِلٰهَ إِلَّا ال.mp3',
  './assets/audio/azkar-alerts/لَا حَوْلَ وَلَا قُو.mp3',
  './audio/adhan/ahmed-al-nufais.mp3',
  './audio/adhan/fajr-alafasy.mp3',
  './audio/adhan/islam-sobhi.mp3',
  './audio/adhan/mecca.mp3',
  './css/01-variables.css',
  './css/02-sky-backgrounds.css',
  './css/03-reset-base.css',
  './css/04-splash.css',
  './css/07-pages.css',
  './css/08-compass-canvas.css',
  './css/09-qibla-hero.css',
  './css/10-stat-grid.css',
  './css/11-section-headers.css',
  './css/12-sky-track.css',
  './css/15-device-compass.css',
  './css/16-qibla-instructions.css',
  './css/17-calibration.css',
  './css/18-tips.css',
  './css/19-gnss.css',
  './css/20-settings.css',
  './css/21-utility.css',
  './css/24-gemini-compass.css',
  './css/27-animations.css',
  './css/28-astronomical-observatory.css',
  './css/astro-verification-controls.css',
  './css/azkar-final-tuning.css',
  './css/azkar-home-tuning.css',
  './css/azkar-listen.css',
  './css/azkar-new.css',
  './css/azkar-reader-tuning.css',
  './css/compass-astro-dashboard.css',
  './css/compass-confidence-final.css',
  './css/digital-compass/app-integration.css',
  './css/digital-compass/digital-compass.css',
  './css/home-4k-background.css',
  './css/home-action-layout-233.css',
  './css/home-button-icons-polish.css',
  './css/home-card-final-cleanup.css',
  './css/home-final-polish.css',
  './css/home-final.css',
  './css/home-header-controls.css',
  './css/home-hero-final-match.css',
  './css/home-hero-photo.css',
  './css/home-motion-design.css',
  './css/home-pixel-perfect.css',
  './css/home-premium-finish.css',
  './css/home-premium-polish.css',
  './css/home-reference-match.css',
  './css/home-single-screen-cards.css',
  './css/internal-screen-chrome.css',
  './css/live-deviation-confidence.css',
  './css/phone-acceptance-fixes.css',
  './css/presentation/prayer/final-polish.css',
  './css/presentation/prayer/refinement.css',
  './css/presentation/prayer/screen.css',
  './css/presentation/prayer/settings-overrides.css',
  './css/presentation/serenity/final-polish.css',
  './css/presentation/serenity/screen.css',
  './css/quran-contrast.css',
  './css/quran-experience.css',
  './css/quran-khatma-plus.css',
  './css/quran-luxe.css',
  './css/quran-reader-center-final.css',
  './css/quran-reader-controls.css',
  './css/quran-reader.css',
  './css/reading-full-width-final.css',
  './fonts/KFGQPC-Uthmanic-ScriptHAFS.woff2',
  './icons/apple-touch-icon.png',
  './icons/favicon.ico',
  './icons/hm-astronomy.png',
  './icons/hm-azkar.png',
  './icons/hm-compass.png',
  './icons/hm-gnss.png',
  './icons/hm-prayer.png',
  './icons/hm-quran.png',
  './icons/hm-serenity.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-kaaba.png',
  './icons/icon-moon.png',
  './icons/icon-sextant.png',
  './icons/icon-sun.png',
  './icons/maskable/icon-maskable-192x192.png',
  './icons/maskable/icon-maskable-512x512.png',
  './icons/safari-pinned-tab.svg',
  './images/1784808776667.png',
  './images/home/kaaba-reference.data-uri.txt',
  './images/home/qibla-bg-4k.webp',
  './images/home/qibla-bg-embedded.svg',
  './images/splash-qiblaastro-emblem.svg',
  './index.html',
  './js/06-navigation.js',
  './js/17-deviation.js',
  './js/analytics/privacy-safe-screen-tracker.js',
  './js/astro-qibla-engine.js',
  './js/astro-verification.js',
  './js/astronomical-observation-bridge.js',
  './js/astronomical-observatory-ui.js',
  './js/astronomical-solver.js',
  './js/astronomical-trace.js',
  './js/astronomical-verification-session.js',
  './js/astronomical-verification-store.js',
  './js/azkar-alert-audio-map.js',
  './js/azkar-data.js',
  './js/azkar-dua-overlay.js',
  './js/azkar-final-ui.js',
  './js/azkar-native-reminders.js',
  './js/azkar-new.js',
  './js/azkar-verified-overlay.js',
  './js/camera-pose.js',
  './js/camera-projection.js',
  './js/celestial-detector.js',
  './js/compass-astro-dashboard.js',
  './js/compass-cards.js',
  './js/compass-mode-view.js',
  './js/compass-premium-render.js',
  './js/coordinate-frames.js',
  './js/digital-compass/digital-compass-app-bridge.js',
  './js/digital-compass/digital-compass-controller.js',
  './js/digital-compass/digital-compass-deviation.js',
  './js/digital-compass/digital-compass-renderer.js',
  './js/digital-compass/digital-compass-state.js',
  './js/geomag/wmm2025-runtime.js',
  './js/geomag/wmm2025.js',
  './js/gravity-reference.js',
  './js/home-final.js',
  './js/home-reference-finalizer.js',
  './js/i18n/dynamic-patterns.js',
  './js/i18n/en-batch1.js',
  './js/i18n/en-safe2.js',
  './js/i18n/english-rollout.js',
  './js/i18n/extra-phrases.js',
  './js/i18n/fr-phrases.js',
  './js/i18n/general-phrases.js',
  './js/i18n/home-language-picker.js',
  './js/i18n/home-phrases.js',
  './js/i18n/internal-screen-final-phrases.js',
  './js/i18n/internal-screen-language-bridge.js',
  './js/i18n/internal-screen-phrases.js',
  './js/i18n/module-phrases.js',
  './js/i18n/prayer-phrases.js',
  './js/i18n/prayer-settings-complete-phrases.js',
  './js/i18n/safe4-phrases.js',
  './js/i18n/status-phrases.js',
  './js/i18n/ui-phrases.js',
  './js/native-bridge-bootstrap.js',
  './js/position-provider.js',
  './js/post-verification-live-compass.js',
  './js/prayer/calculation-methods.js',
  './js/prayer/prayer-location.js',
  './js/prayer/prayer-settings.js',
  './js/prayer/time-format.js',
  './js/presentation/astro-verification-controls.js',
  './js/presentation/azkar/back-history.js',
  './js/presentation/azkar/host.js',
  './js/presentation/bootstrap.js',
  './js/presentation/compass/astro-live-heading-mirror.js',
  './js/presentation/compass/digital-adapter.js',
  './js/presentation/compass/digital-screen-host.js',
  './js/presentation/compass/host.js',
  './js/presentation/compass/live-deviation-confidence.js',
  './js/presentation/compass/trusted-qibla-refresh.js',
  './js/presentation/falaki/event-times-sync.js',
  './js/presentation/falaki/host.js',
  './js/presentation/internal-screen-chrome.js',
  './js/presentation/location-label.js',
  './js/presentation/page-loader.js',
  './js/presentation/page-registry.js',
  './js/presentation/permissions-onboarding.js',
  './js/presentation/prayer/adhan-ui.js',
  './js/presentation/prayer/audio-finalizer.js',
  './js/presentation/prayer/audio-readiness.js',
  './js/presentation/prayer/calculation-settings-ui.js',
  './js/presentation/prayer/location-settings-ui.js',
  './js/presentation/prayer/native-plan.js',
  './js/presentation/prayer/schedule-sync.js',
  './js/presentation/prayer/screen.js',
  './js/presentation/quran/back-history.js',
  './js/presentation/quran/host.js',
  './js/presentation/serenity/screen.js',
  './js/qibla-alignment-reticle.js',
  './js/qibla-card-runtime.js',
  './js/quran-experience.js',
  './js/quran-khatma-plus.js',
  './js/quran-pages.js',
  './js/quran-reader-controls.js',
  './js/quran-reader-meta.js',
  './js/quran-reader.js',
  './js/quran-search-plus.js',
  './js/runtime/local-timezone-adapter.js',
  './js/runtime/trusted-location-dependent-sync.js',
  './js/verification-quality.js',
  './js/world-orientation.js',
  './manifest.json',
  './offline.html',
  './pages/azkar.html',
  './pages/compass.html',
  './pages/digital-compass.html',
  './pages/falaki.html',
  './pages/prayer.html',
  './pages/quran.html',
  './pages/serenity.html',
  './pages/wmm2025-test.html',
  './site.webmanifest'
];

const QURAN_TEXT=Array.from({length:114},function(_,index){return './quran/'+(index+1)+'.json';});
const PRECACHE_URLS=Object.freeze(APP_SHELL.concat(QURAN_TEXT));

async function precacheCritical(){
  const cache=await caches.open(APP_CACHE);
  const requests=PRECACHE_URLS.map(function(url){return new Request(url,{cache:'reload',credentials:'same-origin'});});
  await cache.addAll(requests);
}

async function notifyUpdated(){
  try{
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients)client.postMessage({type:'SW_UPDATED',version:VERSION,bridgeRelease:BRIDGE_RELEASE,
      gnssRelease:GNSS_RELEASE,permissionsRelease:PERMISSIONS_RELEASE,offlineRelease:OFFLINE_RELEASE
    });
  }catch(_){}
}

async function matchIgnoringSearch(request){
  return caches.match(request,{ignoreSearch:true});
}

async function fetchAndStore(request,cacheName,cacheMode){
  const response=await fetch(request,{cache:cacheMode||'no-store'});
  if(response&&response.ok){
    const cache=await caches.open(cacheName);
    await cache.put(request,response.clone());
  }
  return response;
}

async function networkFirst(r,cacheName){
  try{
    const response=await fetch(r,{cache:'no-store'});
    if(response&&response.ok){
      const cache=await caches.open(cacheName);
      await cache.put(r,response.clone());
    }
    return response;
  }catch(_){
    return(await matchIgnoringSearch(r))||new Response('',{status:503});
  }
}

function isNavigation(request){return request.mode==='navigate';}
function isRefreshableCode(url){return /\.(?:html?|css|js)$/i.test(url.pathname);}

async function navigationResponse(request){
  try{return await fetchAndStore(request,APP_CACHE,'no-store');}
  catch(_){return(await matchIgnoringSearch(request))||(await caches.match('./index.html'))||(await caches.match(OFFLINE_URL))||new Response('',{status:503});}
}

async function cachedAssetResponse(request){
  const cached=await matchIgnoringSearch(request);
  if(cached)return cached;
  try{return await fetchAndStore(request,RUNTIME_CACHE,'no-store');}
  catch(_){return new Response('',{status:503});}
}

async function rangedResponse(request){
  const cached=await matchIgnoringSearch(request);
  if(!cached)return fetch(request);
  const value=request.headers.get('range')||'';
  const match=/^bytes=(\d*)-(\d*)$/.exec(value);
  if(!match)return cached;
  const data=await cached.arrayBuffer();
  const size=data.byteLength;
  let start=match[1]?Number(match[1]):NaN;
  let end=match[2]?Number(match[2]):NaN;
  if(!Number.isFinite(start)&&Number.isFinite(end)){start=Math.max(0,size-end);end=size-1;}
  else{if(!Number.isFinite(start))start=0;if(!Number.isFinite(end))end=size-1;}
  if(start<0||end<start||start>=size)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
  end=Math.min(end,size-1);
  const headers=new Headers(cached.headers);
  headers.set('Accept-Ranges','bytes');
  headers.set('Content-Range','bytes '+start+'-'+end+'/'+size);
  headers.set('Content-Length',String(end-start+1));
  return new Response(data.slice(start,end+1),{status:206,statusText:'Partial Content',headers:headers});
}

self.addEventListener('install',function(event){
  event.waitUntil((async function(){await precacheCritical();await self.skipWaiting();})());
});

self.addEventListener('activate',function(event){
  event.waitUntil((async function(){
    const names=await caches.keys();
    await Promise.all(names.filter(function(name){return name.startsWith(CACHE_PREFIX)&&name!==APP_CACHE&&name!==RUNTIME_CACHE;}).map(function(name){return caches.delete(name);}));
    await self.clients.claim();
    await notifyUpdated();
  })());
});

self.addEventListener('fetch',function(event){
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(isNavigation(request)){
    event.respondWith(navigationResponse(request));
    return;
  }
  if(request.headers.has('range')){
    event.respondWith(rangedResponse(request));
    return;
  }
  if(isRefreshableCode(url)){
    event.respondWith(networkFirst(request, APP_CACHE));
    return;
  }
  event.respondWith(cachedAssetResponse(request));
});

self.addEventListener('message',function(event){
  const data=event.data||{};
  if(data.type==='SKIP_WAITING')self.skipWaiting();
  if(data.type==='GET_VERSION'){
    const value={type:'SW_VERSION',version:VERSION,bridgeRelease:BRIDGE_RELEASE,gnssRelease:GNSS_RELEASE,permissionsRelease:PERMISSIONS_RELEASE,offlineRelease:OFFLINE_RELEASE};
    if(event.ports&&event.ports[0])event.ports[0].postMessage(value);
    else if(event.source)event.source.postMessage(value);
  }
});
