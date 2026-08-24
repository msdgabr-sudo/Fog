/* QiblaAstro — Digital Compass read-only presentation adapter
 * Presentation contract only. It reads canonical engine-written DOM outputs and invokes existing public actions.
 * It does not calculate, mutate, or own Qibla/GNSS/device-heading/verification truth.
 * © 2026 محمد سيد جبر بحيرى — Mohamed SG Behairy. All Rights Reserved.
 */
(function(root){'use strict';
  function doc(){return root.document||null;}
  function byId(id){var d=doc();return d?d.getElementById(id):null;}
  function text(id){var el=byId(id);return el?String(el.textContent||'').trim():'';}
  function numberFrom(id){var m=text(id).replace(/,/g,'.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null;}
  function finite(v){return typeof v==='number'&&Number.isFinite(v);}

  function snapshot(){
    var heading=numberFrom('box-heading');
    var qibla=numberFrom('box-qibla');
    var deviation=numberFrom('box-diff');
    var accuracy=numberFrom('compass-accuracy');
    var latitude=numberFrom('gnss-lat');
    var longitude=numberFrom('gnss-lon');
    var gnss=text('gnss-badge');

    // Prefer the authoritative live engine values when available. These are
    // reads only; canonical DOM outputs remain the delayed-start/test fallback.
    try{if(typeof deviceHeading!=='undefined'&&finite(Number(deviceHeading)))heading=Number(deviceHeading);}catch(_){}
    try{if(typeof QT!=='undefined'&&finite(Number(QT)))qibla=Number(QT);}catch(_){}
    try{if(typeof compassAccuracy!=='undefined'&&finite(Number(compassAccuracy)))accuracy=Math.abs(Number(compassAccuracy));}catch(_){}
    try{if(typeof LAT!=='undefined'&&finite(Number(LAT)))latitude=Number(LAT);}catch(_){}
    try{if(typeof LON!=='undefined'&&finite(Number(LON)))longitude=Number(LON);}catch(_){}
    var trusted=/GPS|GNSS/i.test(gnss)&&!/بانتظار|غير محدد|تعذر|مرفوض/.test(gnss);
    try{if(typeof gnssHasTrustedFix!=='undefined'&&typeof gnssSource!=='undefined')trusted=gnssHasTrustedFix===true&&gnssSource==='gps';}catch(_){}
    if(!trusted)qibla=null;
    return Object.freeze({
      qiblaDeg:finite(qibla)?qibla:null,
      headingDeg:finite(heading)?heading:null,
      deviationDeg:finite(deviation)?deviation:null,
      accuracyDeg:finite(accuracy)?accuracy:null,
      latitude:finite(latitude)?latitude:null,
      longitude:finite(longitude)?longitude:null,
      gnssTrusted:trusted,
      qiblaText:text('box-qibla'),
      headingText:text('box-heading'),
      headingHint:text('live-compass-hint'),
      deviationText:text('box-diff'),
      deviationSide:text('box-dir'),
      accuracyText:text('compass-accuracy'),
      gnssLabel:text('gnss-badge'),
      gnssStatus:text('gnss-btn-status')
    });
  }

  function calibrationButtons(){
    var display=byId('cal-offset-display');
    var parent=display&&display.parentElement;
    var buttons=parent?parent.querySelectorAll('button'):[];
    return {minus:buttons[0]||null,plus:buttons[1]||null};
  }
  function calibrationOffset(){
    var value=numberFrom('cal-offset-display');
    if(!finite(value))return 0;
    return value>180?value-360:value;
  }
  function changeCalibrationOffset(delta){
    var controls=calibrationButtons();
    var button=Number(delta)<0?controls.minus:controls.plus;
    if(button&&typeof button.click==='function')button.click();
    return calibrationOffset();
  }

  function invoke(name){
    var fn=root[name];
    if(typeof fn!=='function')return false;
    fn();return true;
  }
  function activateCompass(){
    if(typeof root._qiblaActivateLiveCompass==='function'){root._qiblaActivateLiveCompass();return true;}
    if(typeof root.activateCompass==='function'){root.activateCompass();return true;}
    return false;
  }
  function requestGnss(){return invoke('tryBrowserGPS');}
  function openCalibration(){return invoke('showManualCal');}
  function closeCalibration(){return invoke('hideManualCal');}
  function resetCalibration(){return invoke('resetCompassCalibration');}
  function goHome(){
    if(typeof root.GT==='function'){root.GT('home');return true;}
    return false;
  }

  root.QiblaDigitalCompassAdapter=Object.freeze({
    snapshot:snapshot,
    activateCompass:activateCompass,
    requestGnss:requestGnss,
    openCalibration:openCalibration,
    closeCalibration:closeCalibration,
    resetCalibration:resetCalibration,
    calibrationOffset:calibrationOffset,
    changeCalibrationOffset:changeCalibrationOffset,
    goHome:goHome
  });
})(typeof globalThis!=='undefined'?globalThis:window);
