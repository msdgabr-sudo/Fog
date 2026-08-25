/* QiblaAstro — final reference hero binding */
(function(){
  'use strict';
  var HOME_UI_RELEASE='mizan-home-20260814-phone-acceptance1';
  function forceFreshHomeLayout(){
    try{
      var link=document.querySelector('link[href^="css/home-action-layout-233.css"]');
      if(link){var expected='css/home-action-layout-233.css?v='+encodeURIComponent(HOME_UI_RELEASE);if(link.getAttribute('href')!==expected)link.setAttribute('href',expected);}
    }catch(_){ }
  }
  function requestServiceWorkerUpdate(){try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistration().then(function(reg){if(reg&&typeof reg.update==='function')return reg.update();}).catch(function(){});}}catch(_){ }}
  forceFreshHomeLayout();requestServiceWorkerUpdate();
  function loadPresentationBootstrap(){if(!document||document.querySelector('script[data-qibla-presentation-bootstrap]'))return;var s=document.createElement('script');s.src='js/presentation/bootstrap.js?v='+encodeURIComponent(HOME_UI_RELEASE);s.async=false;s.setAttribute('data-qibla-presentation-bootstrap','true');(document.head||document.documentElement).appendChild(s);}
  loadPresentationBootstrap();
  var kaaba='<svg class="qa-kaaba-inline" viewBox="0 0 520 520" role="img" aria-label="الكعبة المشرفة"><defs><linearGradient id="qaf" x1="0" x2="1"><stop stop-color="#050609"/><stop offset=".72" stop-color="#0b0c10"/><stop offset="1" stop-color="#17191f"/></linearGradient><linearGradient id="qas" x1="0" x2="1"><stop stop-color="#17191f"/><stop offset="1" stop-color="#050609"/></linearGradient><linearGradient id="qag" x1="0" x2="1"><stop stop-color="#936315"/><stop offset=".45" stop-color="#f3d379"/><stop offset="1" stop-color="#86570f"/></linearGradient></defs><ellipse cx="260" cy="467" rx="178" ry="25" fill="#e0ad43" opacity=".27"/><polygon points="112,120 356,84 356,422 112,452" fill="url(#qaf)"/><polygon points="356,84 430,126 430,392 356,422" fill="url(#qas)"/><polygon points="112,120 356,84 430,126 184,164" fill="#111217"/><polygon points="112,188 356,154 430,191 184,227" fill="url(#qag)"/><polygon points="112,229 356,195 430,230 430,240 356,207 112,242" fill="#efd178"/><rect x="326" y="231" width="62" height="132" rx="3" fill="url(#qag)"/><rect x="337" y="242" width="40" height="108" rx="2" fill="#bb8324"/><path d="M337 282h40M337 321h40M357 242v108" stroke="#755015" stroke-width="4"/><g fill="#e6c565"><rect x="145" y="198" width="56" height="14" rx="3"/><rect x="216" y="187" width="67" height="14" rx="3"/><rect x="298" y="175" width="39" height="14" rx="3"/><circle cx="133" cy="207" r="7"/><circle cx="347" cy="180" r="7"/></g><path d="M120 130l236-34v315l-236 30z" fill="none" stroke="#454953" stroke-opacity=".32" stroke-width="3"/></svg>';
  function replaceSkyIcon(selector,src,alt){var orb=document.querySelector(selector);if(!orb)return false;var img=orb.querySelector('img.qa-sky-real-icon');if(!img){orb.textContent='';img=document.createElement('img');img.className='qa-sky-real-icon';img.alt=alt;img.decoding='async';img.draggable=false;img.style.cssText='display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;';orb.appendChild(img);}var expected=src+'?v='+HOME_UI_RELEASE;if(img.getAttribute('src')!==expected)img.setAttribute('src',expected);orb.style.setProperty('background','none','important');orb.style.setProperty('background-image','none','important');orb.style.setProperty('box-shadow','none','important');orb.style.setProperty('border','0','important');orb.style.setProperty('color','transparent','important');return true;}
  function replaceSkyIcons(){var moon=replaceSkyIcon('#page-home .qa-moon-card .qa-moon-orb','icons/icon-moon.png','القمر');var sun=replaceSkyIcon('#page-home .qa-sun-card .qa-sun-orb','icons/icon-sun.png','الشمس');return moon&&sun;}
  function replaceAstronomyIcon(){try{var img=document.querySelector('#page-home .qa-service-card.astronomy .qa-service-icon img');if(!img)return false;var expected='icons/hm-astronomy.png?v='+HOME_UI_RELEASE;if(img.getAttribute('src')!==expected)img.setAttribute('src',expected);img.setAttribute('alt','علم الفلك');return true;}catch(_){return false;}}
  function syncMoonAltAz(){
    try{
      var frame=document.getElementById('qa-falaki-frame');if(!frame||!frame.contentDocument)return false;
      var fd=frame.contentDocument,az=fd.getElementById('moonAz'),alt=fd.getElementById('moonAlt');
      if(!az||!alt)return false;
      var azText=(az.textContent||'').trim(),altText=(alt.textContent||'').trim();
      if(!azText||!altText||azText==='—'||altText==='—')return false;
      var target=document.getElementById('qaMoonPhase');if(!target)return false;
      var expected='الارتفاع '+altText+' · السمت '+azText;
      if((target.textContent||'').trim()!==expected)target.textContent=expected;
      target.setAttribute('data-qa-moon-altaz','true');
      target.style.setProperty('font-size','.52rem','important');
      target.style.setProperty('font-weight','600','important');
      target.style.setProperty('white-space','nowrap','important');
      target.style.setProperty('color','#c9d9ef','important');
      target.style.setProperty('direction','rtl','important');
      return true;
    }catch(_){return false;}
  }
  function isHomeActive(){var page=document.getElementById('page-home');return !!(page&&page.classList.contains('active'));}
  function apply(){forceFreshHomeLayout();var g=document.querySelector('#qa-home .qa-galaxy');if(g)g.remove();var holder=document.querySelector('#qa-home .qa-kaaba-photo');if(holder&&!holder.querySelector('.qa-kaaba-inline')){holder.innerHTML=kaaba+'<span></span>';holder.classList.add('is-inline');}replaceSkyIcons();replaceAstronomyIcon();syncMoonAltAz();return !!document.getElementById('qa-home');}
  var n=0;function boot(){if(apply())return;if(++n<80)setTimeout(boot,100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('qiblaastro:home-final-loaded',function(){setTimeout(apply,0)});
  window.addEventListener('qiblaastro:navigation-change',function(event){if(event&&event.detail&&event.detail.page==='home')setTimeout(apply,0)});
  window.addEventListener('resize',function(){if(isHomeActive())setTimeout(apply,30)});
  setInterval(function(){if(isHomeActive())syncMoonAltAz();},2000);
})();
