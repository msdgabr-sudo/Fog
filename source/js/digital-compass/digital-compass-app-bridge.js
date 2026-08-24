/* QiblaAstro — Digital Compass application bridge.
 * Read-only state synchronization plus delegation to existing public actions.
 * It does not register orientation/geolocation listeners and never writes
 * QT, GNSS, WMM, device-heading, camera, or astronomical verification state.
 */
(function(root){'use strict';
  var timer=0;
  var retryTimer=0;

  function state(){return root.QiblaDigitalCompassState||null;}
  function adapter(){return root.QiblaDigitalCompassAdapter||null;}
  function refresh(){var current=state();if(current&&typeof current.readHost==='function')current.readHost();}
  function observe(){
    if(timer)return true;
    refresh();
    timer=root.setInterval(refresh,50);
    return true;
  }
  function stop(){
    if(timer){root.clearInterval(timer);timer=0;}
    if(retryTimer){root.clearTimeout(retryTimer);retryTimer=0;}
  }
  function startFromGesture(){
    var current=state();
    if(current&&typeof current.setSensorState==='function')current.setSensorState('starting','unknown');
    observe();
    var api=adapter();
    var invoked=!!(api&&typeof api.activateCompass==='function'&&api.activateCompass());
    if(retryTimer)root.clearTimeout(retryTimer);
    retryTimer=root.setTimeout(function(){
      retryTimer=0;
      refresh();
      var snapshot=current&&current.get?current.get():null;
      if(snapshot&&!snapshot.compassAvailable&&current&&current.setSensorState){
        current.setSensorState(invoked?'permission-required':'unavailable',invoked?'prompt':'unsupported');
      }
    },2200);
    return Promise.resolve(invoked);
  }
  function getCalibrationOffset(){
    var api=adapter();
    return api&&typeof api.calibrationOffset==='function'?api.calibrationOffset():0;
  }
  function changeCalibrationOffset(delta){
    var api=adapter();
    var value=api&&typeof api.changeCalibrationOffset==='function'?api.changeCalibrationOffset(delta):getCalibrationOffset();
    refresh();
    return value;
  }
  function setCalibrationOffset(value){
    var target=Number(value);
    var current=getCalibrationOffset();
    if(!Number.isFinite(target))return current;
    target=((target+180)%360+360)%360-180;
    var difference=((target-current+540)%360)-180;
    var steps=Math.min(360,Math.round(Math.abs(difference)));
    var direction=difference<0?-1:1;
    for(var index=0;index<steps;index++)changeCalibrationOffset(direction);
    return getCalibrationOffset();
  }
  function resetCalibration(){
    var api=adapter();
    var result=!!(api&&typeof api.resetCalibration==='function'&&api.resetCalibration());
    refresh();
    return result;
  }

  root.QiblaDigitalCompassSensor=Object.freeze({
    observe:observe,
    startFromGesture:startFromGesture,
    stop:stop,
    resetCalibration:resetCalibration,
    setCalibrationOffset:setCalibrationOffset,
    changeCalibrationOffset:changeCalibrationOffset,
    getCalibrationOffset:getCalibrationOffset,
    isGestureRequired:function(){var current=state();return !!(current&&current.get&&current.get().sensorState==='permission-required');}
  });
})(typeof globalThis!=='undefined'?globalThis:window);
