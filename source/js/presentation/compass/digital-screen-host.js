/* QiblaAstro — isolated Digital Compass screen host.
 * Mounts only the external presentation fragment and never reparents, clones,
 * or replaces the canonical astronomical compass engine nodes.
 */
(function(root){'use strict';
  var mounted=false;
  var mounting=null;
  var active=false;
  function doc(){return root.document||null;}
  function byId(id){var d=doc();return d?d.getElementById(id):null;}
  function fail(message){throw new Error('[DigitalCompassScreenHost] '+message);}
  function desiredMode(){
    try{return root.QiblaCompassViewMode&&root.QiblaCompassViewMode.get?root.QiblaCompassViewMode.get():(root.sessionStorage.getItem('qibla-compass-view-mode')||'digital');}
    catch(_){return 'digital';}
  }
  function pageIsActive(){
    var page=byId('page-compass');
    return !!(page&&page.classList&&page.classList.contains('active'));
  }
  function shouldBeActive(){return desiredMode()!=='astro'&&pageIsActive();}
  function setActive(next){
    var wasActive=active;
    active=next===true&&pageIsActive();
    var host=byId('qa-digital-compass-host');
    if(host)host.hidden=!active;
    var controller=root.QiblaDigitalCompassController;
    if(!mounted||!controller)return active;
    var controllerMounted=typeof controller.isMounted==='function'?controller.isMounted():wasActive;
    if(active&&(!wasActive||!controllerMounted)&&typeof controller.mount==='function')controller.mount().catch(function(error){console.error(error);});
    if(!active&&(wasActive||controllerMounted)&&typeof controller.unmount==='function')controller.unmount();
    return active;
  }
  function mount(){
    if(mounted){setActive(shouldBeActive());return Promise.resolve(true);}
    if(mounting)return mounting;
    var d=doc();
    var page=byId('page-compass');
    if(!d)return Promise.resolve(false);
    if(!page)return Promise.reject(new Error('[DigitalCompassScreenHost] Missing #page-compass'));
    mounting=root.fetch('pages/digital-compass.html?v=20260825-gnss-global1',{cache:'no-store'}).then(function(response){
      if(!response||!response.ok)fail('Failed to load digital compass fragment ('+(response&&response.status)+')');
      return response.text();
    }).then(function(html){
      var template=d.createElement('template');
      template.innerHTML=html;
      var screens=template.content.querySelectorAll('#qd-screen');
      if(screens.length!==1)fail('Fragment must contain exactly one #qd-screen');
      if(d.getElementById('qd-screen'))fail('Duplicate #qd-screen is not allowed');
      var host=d.createElement('div');
      host.id='qa-digital-compass-host';
      host.setAttribute('data-qibla-digital-screen','isolated');
      host.appendChild(template.content);
      page.appendChild(host);
      mounted=true;
      mounting=null;
      setActive(shouldBeActive());
      if(typeof root.CustomEvent==='function')root.dispatchEvent(new root.CustomEvent('qiblaastro:digital-compass-mounted'));
      return true;
    }).catch(function(error){mounting=null;console.error(error);throw error;});
    return mounting;
  }
  root.QiblaDigitalCompassScreenHost=Object.freeze({mount:mount,setActive:setActive,isMounted:function(){return mounted;},isActive:function(){return active;}});
})(typeof globalThis!=='undefined'?globalThis:window);
