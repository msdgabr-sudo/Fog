/* QiblaAstro — earliest native/TWA token capture.
 * Runs synchronously before third-party analytics so the per-install secret
 * never remains in the visible URL fragment during analytics initialization.
 */
(function(root){
'use strict';
function fragmentParams(hash){
  var raw=String(hash||'').replace(/^#/,'');
  var params=new URLSearchParams(raw);
  if(params.has('nativeToken'))return params;
  /* Android Uri.Builder.fragment() percent-encodes '='. Code 3/5 therefore
     launch with #nativeToken%3D<token>. Decode that legacy/current native
     representation once, while continuing to accept the canonical
     #nativeToken=<token> form used by future launchers. */
  try{
    var decoded=decodeURIComponent(raw);
    if(decoded!==raw){
      var decodedParams=new URLSearchParams(decoded);
      if(decodedParams.has('nativeToken'))return decodedParams;
    }
  }catch(_){}
  return params;
}
try{
  var params=fragmentParams(root.location.hash);
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
