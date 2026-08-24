/* QiblaAstro — Compass view-mode coordinator.
 * Owns only digital/astronomical presentation visibility. Scientific engines,
 * canonical compass nodes, and astronomical verification remain untouched.
 */
(function(root){'use strict';
  var STORAGE_KEY='qibla-compass-view-mode';
  var currentMode='digital';
  var observer=null;
  function byId(id){return root.document?root.document.getElementById(id):null;}
  function adapter(){return root.QiblaDigitalCompassAdapter||null;}

  function ensureAstroHomeButton(){
    if(!root.document)return null;
    var button=byId('qa-compass-home-button');
    if(button)return button;
    button=root.document.createElement('button');
    button.id='qa-compass-home-button';
    button.type='button';
    button.hidden=true;
    button.setAttribute('aria-label','العودة إلى الشاشة الرئيسية');
    button.setAttribute('title','الرئيسية');
    button.innerHTML='<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>';
    button.style.position='fixed';
    button.style.right='12px';
    button.style.top='calc(env(safe-area-inset-top,0px) + 46px)';
    button.style.zIndex='321';
    button.style.width='40px';
    button.style.height='40px';
    button.style.padding='0';
    button.style.borderRadius='12px';
    button.style.border='1px solid rgba(216,174,76,.78)';
    button.style.background='linear-gradient(145deg,rgba(31,25,13,.96),rgba(8,14,23,.98))';
    button.style.color='#D8AE4C';
    button.style.display='grid';
    button.style.placeItems='center';
    button.addEventListener('click',function(event){
      event.preventDefault();
      event.stopPropagation();
      var api=adapter();
      if(api&&typeof api.goHome==='function')api.goHome();
    });
    (root.document.body||root.document.documentElement).appendChild(button);
    return button;
  }
  function syncHomeButton(){
    var page=byId('page-compass');
    var button=ensureAstroHomeButton();
    if(!button)return;
    var visible=!!(page&&page.classList.contains('active')&&currentMode==='astro');
    button.hidden=!visible;
    button.style.display=visible?'grid':'none';
  }
  function syncClasses(){
    var page=byId('page-compass');
    if(!page)return;
    page.classList.toggle('qa-digital-dashboard-active',currentMode==='digital');
    page.classList.toggle('qa-astro-dashboard-active',currentMode==='astro');
    var host=root.QiblaDigitalCompassScreenHost;
    if(host&&typeof host.setActive==='function')host.setActive(currentMode==='digital');
    syncHomeButton();
  }
  function apply(mode){
    currentMode=mode==='astro'?'astro':'digital';
    syncClasses();
    try{root.sessionStorage.setItem(STORAGE_KEY,currentMode);}catch(_){}
    return currentMode;
  }
  function restore(){
    var saved='digital';
    try{saved=root.sessionStorage.getItem(STORAGE_KEY)||'digital';}catch(_){}
    return apply(saved);
  }
  function watchPage(){
    var page=byId('page-compass');
    if(!page||observer||typeof root.MutationObserver!=='function')return;
    observer=new root.MutationObserver(syncHomeButton);
    observer.observe(page,{attributes:true,attributeFilter:['class']});
  }
  function boot(){restore();watchPage();syncHomeButton();}

  root.QiblaCompassViewMode=Object.freeze({set:apply,apply:apply,restore:restore,get:function(){return currentMode;}});
  root.addEventListener('qiblaastro:compass-view-mode',function(event){apply(event&&event.detail?event.detail.mode:'digital');});
  if(root.document){
    if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();
  }
})(typeof globalThis!=='undefined'?globalThis:window);
