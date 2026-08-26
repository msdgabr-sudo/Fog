/* QiblaAstro — Android/TWA native Azkar reminder bridge.
 * Presentation/integration only. Does not touch Qibla, GNSS, astronomy or verification engines.
 */
(function(root){
'use strict';
var STORAGE_KEY='qiblaastro:native-azkar-reminder:v1',TOKEN_KEY='qiblaastro:native-token';
var PHRASES={'سبحان الله':'subhanallah','الحمد لله':'alhamdulillah','الله أكبر':'allahuakbar','لا إله إلا الله':'lailahaillallah','أستغفر الله':'astaghfirullah','أستغفر الله العظيم':'astaghfirullahalazim','سبحان الله وبحمده':'subhanallahwabihamdih','لا حول ولا قوة إلا بالله':'lahawla','حسبي الله':'hasbiyallah','اللهم صل وسلم على نبينا محمد':'salat'};
function parentPart(name){try{return root.parent&&root.parent!==root?String(root.parent.location[name]||''):'';}catch(_){return '';}}
function topPart(name){try{return root.top&&root.top!==root?String(root.top.location[name]||''):'';}catch(_){return '';}}
function tokenFromHash(h){try{return new URLSearchParams(String(h||'').replace(/^#/,'')).get('nativeToken')||'';}catch(_){return '';}}
function tokenFromStorage(win){try{return win&&win.sessionStorage?win.sessionStorage.getItem(TOKEN_KEY)||'':'';}catch(_){return '';}}
function captureToken(){
  try{
    var t=tokenFromHash(root.location.hash)||tokenFromHash(parentPart('hash'))||tokenFromHash(topPart('hash'))||tokenFromStorage(root)||tokenFromStorage(root.parent)||tokenFromStorage(root.top)||'';
    if(t&&t.length>=32){
      try{root.sessionStorage.setItem(TOKEN_KEY,t);}catch(_){}
      try{if(root.parent&&root.parent!==root)root.parent.sessionStorage.setItem(TOKEN_KEY,t);}catch(_){}
      try{if(root.top&&root.top!==root)root.top.sessionStorage.setItem(TOKEN_KEY,t);}catch(_){}
      return t;
    }
    return '';
  }catch(_){return '';}
}
function isNativeTwa(){try{var here=new URLSearchParams(root.location.search||''),parent=new URLSearchParams(parentPart('search')),top=new URLSearchParams(topPart('search'));if(here.get('twa')==='1'||parent.get('twa')==='1'||top.get('twa')==='1'||captureToken()){root.sessionStorage.setItem('qiblaastro:twa','1');return true;}return root.sessionStorage.getItem('qiblaastro:twa')==='1';}catch(_){return false;}}
function selectedInterval(){var b=root.document.querySelector('#azIntervals .az-interval.is-on');var n=b?parseInt(b.textContent,10):10;return Number.isFinite(n)?Math.max(5,n):10;}
function selectedText(){var s=root.document.getElementById('azAudioPhrase');return s&&s.value?s.value:'سبحان الله';}
function phraseId(text){return PHRASES[text]||'subhanallah';}
function packageIntentUri(mode,minutes,text,token){return 'intent://azkar-reminder?token='+encodeURIComponent(token)+'&mode='+encodeURIComponent(mode)+'&interval='+encodeURIComponent(String(minutes||10))+'&phrase='+encodeURIComponent(phraseId(text))+'#Intent;scheme=qiblaastro;package=com.qiblalabs;category=android.intent.category.BROWSABLE;end';}
function navigateTop(uri){try{var topWin=root.top||root;topWin.location.href=uri;return true;}catch(_){try{root.location.href=uri;return true;}catch(__){return false;}}}
function launch(mode,minutes,text){
  var token=captureToken();if(!token)return false;
  /* Package-scoped Android intent prevents another app from intercepting the
     per-install token while keeping the handoff inside the trusted click. */
  return navigateTop(packageIntentUri(mode,minutes,text,token));
}
function readState(){try{return JSON.parse(root.localStorage.getItem(STORAGE_KEY)||'null');}catch(_){return null;}}
function writeState(value){try{if(value)root.localStorage.setItem(STORAGE_KEY,JSON.stringify(value));else root.localStorage.removeItem(STORAGE_KEY);}catch(_){}}
function setUi(running,state){var btn=root.document.getElementById('azAudioToggle'),status=root.document.getElementById('azAudioState'),summary=root.document.getElementById('azAudioSummary');if(btn){btn.textContent=running?'إيقاف التنبيه':'بدء التنبيه';btn.classList.toggle('is-stop',!!running);btn.disabled=false;}var panel=btn&&btn.closest('.az-audio-panel'),row=panel&&panel.querySelector('.az-audio-status');if(row)row.classList.toggle('is-running',!!running);if(status)status.textContent=running?'يعمل':'متوقف';if(summary&&state&&running)summary.textContent=(state.text||'الذكر المختار')+' — كل '+state.interval+' دقيقة';}
function clearStaleState(){writeState(null);setUi(false,null);}
function restoreUi(){if(!isNativeTwa())return;var token=captureToken();if(!token){clearStaleState();return;}var s=readState();if(s&&s.running)setUi(true,s);else setUi(false,null);}
function intercept(event){if(!isNativeTwa())return;var btn=event.target&&event.target.closest?event.target.closest('#azAudioToggle'):null;if(!btn)return;event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();var prior=readState();if(prior&&prior.running){launch('stop',prior.interval||10,prior.text||'ذكر الله');clearStaleState();return;}if(btn.disabled)return;var text=selectedText(),interval=selectedInterval(),state={running:true,text:text,interval:interval,phrase:phraseId(text),startedAt:Date.now()};var launched=launch('start',interval,text);if(!launched){clearStaleState();return;}writeState(state);setUi(true,state);}
root.document.addEventListener('click',intercept,true);if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',function(){captureToken();setTimeout(restoreUi,50);},{once:true});else{captureToken();setTimeout(restoreUi,50);}root.QiblaAzkarNativeReminder=Object.freeze({isNativeTwa:isNativeTwa,getState:readState,stop:function(){var s=readState();if(s)launch('stop',s.interval,s.text);clearStaleState();return true;}});
})(typeof globalThis!=='undefined'?globalThis:window);
