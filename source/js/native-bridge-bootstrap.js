/* QiblaAstro — earliest native/TWA token capture.
 * Runs synchronously before third-party analytics so the per-install secret
 * never remains in the visible URL fragment during analytics initialization.
 */
(function(root){
'use strict';
try{
  var raw=String(root.location.hash||'').replace(/^#/,'');
  var params=new URLSearchParams(raw);
  var token=params.get('nativeToken')||'';
  if(token.length>=32){
    root.sessionStorage.setItem('qiblaastro:native-token',token);
    root.sessionStorage.setItem('qiblaastro:twa','1');
  }
  if(params.has('nativeToken')){
    params.delete('nativeToken');
    var clean=params.toString();
    root.history.replaceState(root.history.state,'',root.location.pathname+root.location.search+(clean?'#'+clean:''));
  }
}catch(_){}
})(typeof globalThis!=='undefined'?globalThis:window);
