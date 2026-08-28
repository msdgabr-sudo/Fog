/* QiblaAstro — Azkar standalone page host | application wiring only
 * © 2026 محمد سيد جبر بحيرى — Mohamed SG Behairy. All Rights Reserved. */
(function(root){
  'use strict';
  var mounted=false;
  var loading=false;
  var watchdog=null;
  var FRAME_SRC='pages/azkar.html';
  var TOKEN_KEY='qiblaastro:native-token';
  var NATIVE_PHRASES={subhanallah:1,alhamdulillah:1,allahuakbar:1,lailahaillallah:1,astaghfirullah:1,astaghfirullahalazim:1,subhanallahwabihamdih:1,lahawla:1,hasbiyallah:1,salat:1};
  function setState(host,state){if(host)host.setAttribute('data-presentation-state',state);}
  function clearWatchdog(){if(watchdog){root.clearTimeout(watchdog);watchdog=null;}}
  function resetHost(host){host.innerHTML='';host.style.padding='0';host.style.background='transparent';host.style.overflow='hidden';host.style.height='100dvh';host.style.minHeight='100dvh';}
  function showFailure(host,message){clearWatchdog();loading=false;mounted=false;setState(host,'failed');host.innerHTML='<div role="alert" style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;background:#07111f;color:#eef5ff;font-family:inherit;"><div><strong style="display:block;margin-bottom:8px;">تعذر تحميل شاشة الأذكار</strong><span style="display:block;opacity:.78;margin-bottom:14px;">'+(message||'تحقق من الاتصال ثم أعد المحاولة.')+'</span><button type="button" data-qa-azkar-retry style="padding:9px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.08);color:#eef5ff;font:inherit;cursor:pointer;">إعادة المحاولة</button></div></div>';var retry=host.querySelector('[data-qa-azkar-retry]');if(retry)retry.addEventListener('click',function(){mount(true);},{once:true});}
  function frameContractOk(frame){try{var doc=frame&&frame.contentDocument;return !!(doc&&doc.getElementById('azkarApp')&&doc.getElementById('azHome')&&doc.getElementById('azReader')&&doc.getElementById('azAudio'));}catch(_){return false;}}
  function tokenFromHash(){try{return new URLSearchParams(String(root.location.hash||'').replace(/^#/,'' )).get('nativeToken')||'';}catch(_){return '';}}
  function nativeToken(){try{return tokenFromHash()||(root.sessionStorage&&root.sessionStorage.getItem(TOKEN_KEY))||'';}catch(_){return '';}}
  function isTwa(){try{return new URLSearchParams(root.location.search||'').get('twa')==='1'||(root.sessionStorage&&root.sessionStorage.getItem('qiblaastro:twa')==='1')||!!nativeToken();}catch(_){return false;}}
  function nativeReady(){var token=nativeToken();return !!(isTwa()&&token&&token.length>=32);}
  function nativeMode(value){value=String(value||'');return value==='start'||value==='stop'?value:'';}
  function nativePhrase(value){value=String(value||'subhanallah');return NATIVE_PHRASES[value]?value:'subhanallah';}
  function nativeInterval(value){var n=parseInt(value,10);if(!Number.isFinite(n))n=10;return Math.max(5,Math.min(1440,n));}
  function nativeIntentUri(request,token){var mode=nativeMode(request&&request.mode);if(!mode)return '';var interval=nativeInterval(request&&request.interval),phrase=nativePhrase(request&&request.phrase);return 'intent://azkar-reminder?token='+encodeURIComponent(token)+'&mode='+encodeURIComponent(mode)+'&interval='+encodeURIComponent(String(interval))+'&phrase='+encodeURIComponent(phrase)+'#Intent;scheme=qiblaastro;package=com.qiblalabs;category=android.intent.category.BROWSABLE;end';}
  /* The Azkar UI lives in a same-origin iframe. Chrome/TWA is most reliable
   * when the external Android intent is launched by the top-level trusted
   * browsing context during the original click task. The child therefore asks
   * this host synchronously; it never needs to own the per-install token. */
  function launchNativeReminder(request){try{if(!nativeReady())return false;var uri=nativeIntentUri(request,nativeToken());if(!uri)return false;root.location.href=uri;return true;}catch(_){return false;}}
  function frameSrc(){var src=FRAME_SRC;try{var token=nativeToken(),twa=isTwa();if(!twa&&!token)return src;var q=twa?'?twa=1':'';var h=token?'#nativeToken='+encodeURIComponent(token):'';return src+q+h;}catch(_){return src;}}
  function seedFrameContext(frame){try{var w=frame&&frame.contentWindow;if(!w)return;var token=nativeToken();if(token&&token.length>=32)w.sessionStorage.setItem(TOKEN_KEY,token);if(isTwa())w.sessionStorage.setItem('qiblaastro:twa','1');}catch(_){}}
  function wireBackHistory(frame){
    try{
      var doc=frame&&frame.contentDocument;
      if(!doc||doc.querySelector('script[data-qibla-azkar-back-history]'))return;
      var script=doc.createElement('script');
      script.src='../js/presentation/azkar/back-history.js?v=20260816-back1';
      script.async=false;
      script.dataset.qiblaAzkarBackHistory='1';
      script.onerror=function(){try{console.error('[azkar] nested Back bridge failed to load');}catch(_){}};
      (doc.head||doc.documentElement).appendChild(script);
    }catch(_){ }
  }
  function mount(force){if(mounted&&!force)return true;if(loading&&!force)return false;var host=root.document&&root.document.getElementById('page-azkar');if(!host)return false;clearWatchdog();loading=true;mounted=false;resetHost(host);setState(host,'loading');host.setAttribute('data-presentation-source','pages/azkar.html');var frame=root.document.createElement('iframe');frame.id='qa-azkar-frame';frame.title='الأذكار — QiblaAstro';frame.src=frameSrc();frame.loading='eager';frame.setAttribute('allow','autoplay');frame.style.cssText='display:block;width:100%;height:100dvh;min-height:100dvh;border:0;background:transparent;';frame.addEventListener('load',function(){clearWatchdog();if(!frameContractOk(frame)){showFailure(host,'وصل رد غير صالح بدل شاشة الأذكار الحديثة.');return;}seedFrameContext(frame);wireBackHistory(frame);loading=false;mounted=true;setState(host,'ready');root.dispatchEvent(new CustomEvent('qiblaastro:presentation-page-mounted',{detail:{name:'azkar',rootId:'page-azkar',source:'pages/azkar.html'}}));},{once:true});frame.addEventListener('error',function(){showFailure(host,'فشل تحميل ملف الشاشة الحديثة.');},{once:true});host.appendChild(frame);watchdog=root.setTimeout(function(){if(loading)showFailure(host,'استغرق التحميل وقتًا أطول من المتوقع.');},15000);return true;}
  root.QiblaAzkarHost=Object.freeze({mount:mount,launchNativeReminder:launchNativeReminder,nativeReady:nativeReady});
  if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',function(){mount(false);},{once:true});else mount(false);}
})(typeof globalThis!=='undefined'?globalThis:window);
