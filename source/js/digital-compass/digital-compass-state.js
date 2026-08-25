/* QiblaAstro R1 — standalone digital compass state
 * Read-only integration boundary. It never calculates or mutates QT/GNSS/WMM/astronomical verification.
 */
(function(root){'use strict';
  var listeners=[];
  var state={
    heading:null,
    qibla:null,
    compassAvailable:false,
    compassAccuracy:null,
    gnssTrusted:false,
    gnssAccuracy:null,
    latitude:null,
    longitude:null,
    deviation:null,
    sensorState:'idle',
    permissionState:'unknown',
    updatedAt:0
  };
  function finite(v){return typeof v==='number'&&Number.isFinite(v);}
  function norm360(v){return finite(v)?((v%360)+360)%360:null;}
  function angleDiff(target,current){return finite(target)&&finite(current)?((target-current+540)%360)-180:null;}
  function clone(){return Object.freeze(Object.assign({},state));}
  function emit(){var snap=clone();listeners.slice().forEach(function(fn){try{fn(snap);}catch(_){}});}
  function patch(next){
    var changed=false;
    Object.keys(next||{}).forEach(function(k){
      if(Object.prototype.hasOwnProperty.call(state,k)&&!Object.is(state[k],next[k])){state[k]=next[k];changed=true;}
    });
    var deviation=finite(state.qibla)&&finite(state.heading)?angleDiff(state.qibla,state.heading):null;
    if(!Object.is(state.deviation,deviation)){state.deviation=deviation;changed=true;}
    if(changed){state.updatedAt=Date.now();emit();}
    return clone();
  }
  function readHost(){
    var adapter=root.QiblaDigitalCompassAdapter;
    var source=adapter&&typeof adapter.snapshot==='function'?adapter.snapshot():{};
    var next={
      qibla:finite(source.qiblaDeg)?norm360(source.qiblaDeg):null,
      heading:finite(source.headingDeg)?norm360(source.headingDeg):null,
      compassAvailable:finite(source.headingDeg),
      compassAccuracy:finite(source.accuracyDeg)?Math.abs(Number(source.accuracyDeg)):null,
      gnssTrusted:source.gnssTrusted===true,
      gnssAccuracy:null,
      latitude:source.gnssTrusted===true&&finite(source.latitude)?Number(source.latitude):null,
      longitude:source.gnssTrusted===true&&finite(source.longitude)?Number(source.longitude):null,
      sensorState:finite(source.headingDeg)?'running':state.sensorState
    };
    var accuracyText=String(source.gnssLabel||source.gnssStatus||'').match(/(\d+(?:\.\d+)?)\s*م/);
    if(next.gnssTrusted&&accuracyText)next.gnssAccuracy=Math.abs(Number(accuracyText[1]));
    return patch(next);
  }
  function setSensorHeading(heading,accuracy){
    var next={compassAvailable:finite(heading),heading:finite(heading)?norm360(heading):null};
    next.compassAccuracy=finite(accuracy)?Math.abs(accuracy):null;
    return patch(next);
  }
  function setSensorState(sensorState,permissionState){return patch({sensorState:sensorState,permissionState:permissionState||state.permissionState});}
  function setQiblaForTest(q){return patch({qibla:finite(q)?norm360(q):null});}
  function subscribe(fn){if(typeof fn!=='function')return function(){};listeners.push(fn);fn(clone());return function(){listeners=listeners.filter(function(x){return x!==fn;});};}
  root.QiblaDigitalCompassState=Object.freeze({get:clone,subscribe:subscribe,readHost:readHost,setSensorHeading:setSensorHeading,setSensorState:setSensorState,setQiblaForTest:setQiblaForTest,angleDiff:angleDiff,norm360:norm360});
})(typeof globalThis!=='undefined'?globalThis:window);
