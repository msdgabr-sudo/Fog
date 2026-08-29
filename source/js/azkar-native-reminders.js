/* QiblaAstro — Android/TWA native Azkar reminder bridge.
 * Presentation/integration only. Does not touch Qibla, GNSS, astronomy or verification engines.
 */
(function(root){
'use strict';
var STORAGE_KEY='qiblaastro:native-azkar-reminder:v1',SELECTION_KEY='qiblaastro:azkar-reminder-selection:v1',TOKEN_KEY='qiblaastro:native-token';
var PHRASES={'سبحان الله':'subhanallah','الحمد لله':'alhamdulillah','الله أكبر':'allahuakbar','لا إله إلا الله':'lailahaillallah','أستغفر الله':'astaghfirullah','أستغفر الله العظيم':'astaghfirullahalazim','سبحان الله وبحمده':'subhanallahwabihamdih','لا حول ولا قوة إلا بالله':'lahawla','حسبي الله':'hasbiyallah','اللهم صل وسلم على نبينا محمد':'salat'};
function parentPart(name){try{return root.parent&&root.parent!==root?String(root.parent.location[name]||''):'';}catch(_){return '';}}
function topPart(name){try{return root.top&&root.top!==root?String(root.top.location[name]||''):'';}catch(_){return '';}}
function tokenFromHash(h){try{var raw=String(h||'').replace(/^#/,'');var params=new URLSearchParams(raw),token=params.get('nativeToken')||'';if(token)return token;try{var decoded=decodeURIComponent(raw);if(decoded!==raw)return new URLSearchParams(decoded).get('nativeToken')||'';}catch(_){}return '';}catch(_){return '';}}
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
function launchViaTrustedTop(mode,minutes,text){
  try{
    var topWin=root.top;
    var host=topWin&&topWin.QiblaAzkarHost;
    if(topWin&&topWin!==root&&host&&typeof host.launchNativeReminder==='function'){
      return host.launchNativeReminder({mode:mode,interval:minutes,phrase:phraseId(text)})===true;
    }
  }catch(_){}
  return false;
}
function launch(mode,minutes,text){
  /* Primary path: synchronously execute the Android intent from the trusted
     top-level TWA context while the original iframe click still has user activation. */
  if(launchViaTrustedTop(mode,minutes,text))return true;
  /* Compatibility fallback for direct standalone Azkar pages and legacy hosts. */
  var token=captureToken();if(!token)return false;
  return navigateTop(packageIntentUri(mode,minutes,text,token));
}
function readJson(key){try{return JSON.parse(root.localStorage.getItem(key)||'null');}catch(_){return null;}}
function writeJson(key,value){try{if(value)root.localStorage.setItem(key,JSON.stringify(value));else root.localStorage.removeItem(key);}catch(_){}}
function readState(){return readJson(STORAGE_KEY);}
function writeState(value){writeJson(STORAGE_KEY,value);}
function readAudioSelection(){return readJson(SELECTION_KEY);}
function saveAudioSelection(value){
  value=value||{};
  var text=PHRASES[value.text]?value.text:selectedText(),interval=parseInt(value.interval,10);
  if(!Number.isFinite(interval))interval=selectedInterval();
  writeJson(SELECTION_KEY,{text:text,interval:Math.max(5,interval),phrase:phraseId(text),savedAt:Date.now()});
}
function applySelection(value){
  if(!value)return;
  var select=root.document.getElementById('azAudioPhrase'),text=String(value.text||'');
  if(select&&text&&PHRASES[text]){
    var found=false;for(var i=0;i<select.options.length;i++){if(select.options[i].value===text){found=true;break;}}
    if(found)select.value=text;
    var preview=root.document.getElementById('azAudioPreview');if(preview)preview.textContent=select.value||text;
  }
  var interval=parseInt(value.interval,10);if(!Number.isFinite(interval))return;
  var buttons=root.document.querySelectorAll('#azIntervals .az-interval');
  for(var j=0;j<buttons.length;j++)buttons[j].classList.toggle('is-on',parseInt(buttons[j].textContent,10)===interval);
}
function currentSelection(){var text=selectedText(),interval=selectedInterval();return{text:text,interval:interval,phrase:phraseId(text)};}
function setUi(running,state){var btn=root.document.getElementById('azAudioToggle'),status=root.document.getElementById('azAudioState'),summary=root.document.getElementById('azAudioSummary');if(btn){btn.textContent=running?'إيقاف التنبيه':'بدء التنبيه';btn.classList.toggle('is-stop',!!running);btn.disabled=false;}var panel=btn&&btn.closest('.az-audio-panel'),row=panel&&panel.querySelector('.az-audio-status');if(row)row.classList.toggle('is-running',!!running);if(status)status.textContent=running?'يعمل':'متوقف';if(summary&&state&&running)summary.textContent=(state.text||'الذكر المختار')+' — كل '+state.interval+' دقيقة';}
function clearStaleState(){writeState(null);setUi(false,null);}
function topBridgeReady(){try{var topWin=root.top,host=topWin&&topWin.QiblaAzkarHost;return !!(topWin&&topWin!==root&&host&&typeof host.nativeReady==='function'&&host.nativeReady());}catch(_){return false;}}
function nativeReady(){return topBridgeReady()||!!captureToken();}
function restoreUi(){
  if(!isNativeTwa())return;
  if(!nativeReady()){clearStaleState();return;}
  var running=readState(),saved=readAudioSelection();
  if(running&&running.running){applySelection(running);saveAudioSelection(running);setUi(true,running);}
  else{applySelection(saved);setUi(false,null);}
}
function rememberSelectionSoon(event){
  var target=event&&event.target;if(!target)return;
  var relevant=target.id==='azAudioPhrase'||(target.closest&&target.closest('#azIntervals .az-interval'));
  if(!relevant)return;
  setTimeout(function(){saveAudioSelection(currentSelection());},0);
}
function intercept(event){
  if(!isNativeTwa())return;
  var btn=event.target&&event.target.closest?event.target.closest('#azAudioToggle'):null;if(!btn)return;
  event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  var prior=readState();
  if(prior&&prior.running){var keep=currentSelection();saveAudioSelection(keep);if(launch('stop',prior.interval||10,prior.text||'ذكر الله'))clearStaleState();return;}
  if(btn.disabled)return;
  var text=selectedText(),interval=selectedInterval(),state={running:true,text:text,interval:interval,phrase:phraseId(text),startedAt:Date.now()};
  var launched=launch('start',interval,text);if(!launched){clearStaleState();return;}
  writeState(state);saveAudioSelection(state);setUi(true,state);
}
root.document.addEventListener('click',intercept,true);
root.document.addEventListener('change',rememberSelectionSoon,false);
root.document.addEventListener('click',rememberSelectionSoon,false);
if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',function(){captureToken();setTimeout(restoreUi,50);},{once:true});else{captureToken();setTimeout(restoreUi,50);}
root.QiblaAzkarNativeReminder=Object.freeze({isNativeTwa:isNativeTwa,getState:readState,getSelection:readAudioSelection,stop:function(){var s=readState();if(s&&launch('stop',s.interval,s.text)){saveAudioSelection(currentSelection());clearStaleState();}return true;}});
})(typeof globalThis!=='undefined'?globalThis:window);
