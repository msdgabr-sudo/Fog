/* QiblaAstro — sole top-level page renderer.
 * History/Back ownership is layered by home-final.js after this classic script
 * loads. Internal Home controls remain owned by internal-screen-chrome.js.
 * No calculation, sensor or astronomical-verification code lives here.
 */
'use strict';

function _qaApplyRouteState(id){
  var body=document.body;
  if(!body)return;
  Array.prototype.slice.call(body.classList).forEach(function(name){
    if(/^tab-/.test(name))body.classList.remove(name);
  });
  body.classList.add('tab-'+id);
  body.setAttribute('data-qa-active-page',id);

  // Compass-only fullscreen state must never leak into another screen.
  if(id!=='compass')body.classList.remove('qa-astro-fullscreen-mode');
}

function _qaResetPageScroll(page){
  try{ if(page) page.scrollTop=0; }catch(e){}
  try{ document.documentElement.scrollTop=0; }catch(e){}
  try{ document.body.scrollTop=0; }catch(e){}
  try{ window.scrollTo(0,0); }catch(e){}
}

function _qaFinalizeNavigation(id,page){
  // Dynamic screen mounts, translations and image decoding can shift layout one
  // frame after activation. Reset again after paint so every screen opens from
  // its own top, especially Home after returning from a long internal screen.
  _qaResetPageScroll(page);
  if(typeof requestAnimationFrame==='function'){
    requestAnimationFrame(function(){
      _qaResetPageScroll(page);
      requestAnimationFrame(function(){_qaResetPageScroll(page);});
    });
  } else {
    setTimeout(function(){_qaResetPageScroll(page);},0);
  }
  try{window.dispatchEvent(new CustomEvent('qiblaastro:navigation-change',{detail:{page:id}}));}catch(e){}
}

function GT(id){
  if(!id)id='home';
  var page=document.getElementById('page-'+id);
  if(!page){console.error('Missing page:','page-'+id);return;}

  _qaApplyRouteState(id);
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  page.classList.add('active');
  _qaResetPageScroll(page);

  if(id!=='compass'&&window._gnssWatchId!=null){
    try{navigator.geolocation.clearWatch(window._gnssWatchId);window._gnssWatchId=null;}catch(e){}
  }
  // `default` was a retired pre-trusted-GNSS source name. Navigation now follows
  // the single authoritative state used by the production inline GNSS engine.
  if(id==='compass'&&!gnssHasTrustedFix){setTimeout(function(){tryBrowserGPS();},400);}
  if(id==='compass'){setTimeout(function(){var ds=gel('dev-slider');if(ds)ds.dispatchEvent(new Event('input'));},500);}
  if(id==='gnss'){setTimeout(function(){if(!gnssHasTrustedFix)tryBrowserGPS();},300);}
  if((id==='compass'||id==='gnss')&&gnssHasTrustedFix){updateQiblaFromPosition();}

  // Keep the single shared Home control synchronized in the same turn whenever
  // its presentation controller is already available.
  try{
    if(window.QiblaInternalScreenChrome&&typeof window.QiblaInternalScreenChrome.sync==='function'){
      window.QiblaInternalScreenChrome.sync();
    }
  }catch(e){}

  _qaFinalizeNavigation(id,page);
}

/* Analytics is intentionally isolated from navigation logic. This loader only attaches
   the privacy-safe screen/view timer; it does not change GT(), sensors or page state. */
(function(){
  'use strict';
  if(document.querySelector('script[data-qibla-analytics-screen-tracker]'))return;
  var s=document.createElement('script');
  s.src='js/analytics/privacy-safe-screen-tracker.js?v=20260814-release1';
  s.defer=true;
  s.dataset.qiblaAnalyticsScreenTracker='1';
  s.onerror=function(){try{console.warn('[analytics] screen tracker unavailable');}catch(_){ }};
  (document.head||document.documentElement).appendChild(s);
})();
