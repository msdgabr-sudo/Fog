// ══ ميزان الماء ══
var _bubbleActive=false;
function activateBubble(){
  if(typeof DeviceOrientationEvent!=='undefined'&&
     typeof DeviceOrientationEvent.requestPermission==='function'){
    DeviceOrientationEvent.requestPermission()
      .then(function(s){if(s==='granted')_startBubble();})
      .catch(function(){_startBubble();});
  } else {_startBubble();}
}
function _startBubble(){
  _bubbleActive=true;
  window.addEventListener('deviceorientation',_onBubble,true);
  var t=document.getElementById('level-txt');
  if(t)t.textContent='جاري...';
}
function _onBubble(e){
  var ball=document.getElementById('level-ball');
  var txt=document.getElementById('level-txt');
  if(!ball)return;
  var beta=e.beta||0;
  var gamma=e.gamma||0;
  var maxR=16;
  var x=Math.max(-maxR,Math.min(maxR,gamma/90*maxR));
  var y=Math.max(-maxR,Math.min(maxR,beta/90*maxR));
  ball.style.transform='translate(calc(-50% + '+x+'px),calc(-50% + '+y+'px))';
  var angle=Math.sqrt(x*x+y*y);
  var color=angle<4?'#40C070':angle<10?'#C8A44A':'#E05050';
  ball.style.background=color;
  ball.style.boxShadow='0 0 8px '+color;
  if(txt)txt.textContent=angle<4?'مستوٍ ✓':angle<10?'قريب':'أمِل الهاتف';
}
function deactivateBubble(){
  _bubbleActive=false;
  window.removeEventListener('deviceorientation',_onBubble);
}


function _swAdhanNotify(title, body){
  try{
    if('Notification' in window){
      if(Notification.permission === 'granted'){
        new Notification(title, {
          body: body,
          icon: './images/1784590231216.png',
          silent: false
        });
      } else if(Notification.permission !== 'denied'){
        Notification.requestPermission().then(function(p){
          if(p === 'granted'){
            new Notification(title, {body:body, icon:'./images/1784590231216.png'});
          }
        });
      }
    }
  }catch(e){}
}

document.addEventListener('touchstart',function(){try{var el=document.documentElement;if(el.requestFullscreen)el.requestFullscreen();else if(el.webkitRequestFullscreen)el.webkitRequestFullscreen();}catch(e){}},{once:true});


(function(){
  var _r=null,_c=null,_w=0,_hh=0,_p=[],_g=[],_rf=null,_bottom=[];
  function _sz(){
    var cv=document.getElementById('sp-canvas');if(!cv||!_c)return;
    var d=window.devicePixelRatio||1;
    _w=window.innerWidth;_hh=window.innerHeight;
    cv.width=_w*d;cv.height=_hh*d;_c.setTransform(d,0,0,d,0,0);
  }
  function _stop(){
    if(_r)cancelAnimationFrame(_r);_r=null;
    if(_rf)window.removeEventListener('resize',_rf);_rf=null;
    if(_c)_c.clearRect(0,0,_w,_hh);_c=null;_p=[];_g=[];_bottom=[];
  }
  function _init(){
    var cv=document.getElementById('sp-canvas');if(!cv)return;
    _c=cv.getContext('2d');_sz();_rf=_sz;window.addEventListener('resize',_rf);
    // جسيمات عائمة
    for(var i=0;i<80;i++) _p.push({
      x:Math.random()*window.innerWidth,
      y:Math.random()*window.innerHeight,
      vx:(Math.random()-.5)*.35,
      vy:-(Math.random()*.55+.15),
      r:Math.random()*1.4+.3,
      a:Math.random()*.5+.1,
      ph:Math.random()*Math.PI*2,
      sp:Math.random()*.018+.004,
      gold:Math.random()>.4
    });
    // رزاز ذهبي من الأسفل
    for(var i=0;i<60;i++) _bottom.push({
      x:Math.random()*window.innerWidth,
      y:window.innerHeight+Math.random()*100,
      vx:(Math.random()-.5)*.8,
      vy:-(Math.random()*2+0.8),
      r:Math.random()*2.5+0.5,
      a:Math.random()*.8+.2,
      ph:Math.random()*Math.PI*2,
      sp:Math.random()*.025+.008
    });
    // حلقات
    _g=[{r:55,a:.22,sp:.28,mx:165},{r:95,a:.16,sp:.20,mx:185},{r:135,a:.11,sp:.24,mx:205}];
    var st=Date.now();
    var _d=function(){
      if(_r===null)return;
      var t=Date.now()-st,cx=_w/2,cy=_hh/2,mx=Math.max(_w,_hh);
      _c.clearRect(0,0,_w,_hh);
      // توهج مركزي
      var gl=_c.createRadialGradient(cx,cy*.6,0,cx,cy*.6,Math.min(_w,_hh)*.6);
      gl.addColorStop(0,'rgba(201,168,76,.09)');gl.addColorStop(1,'transparent');
      _c.fillStyle=gl;_c.fillRect(0,0,_w,_hh);
      // God Rays
      for(var i=0;i<12;i++){
        var ang=(i/12)*Math.PI*2+t*.00018;
        _c.save();_c.translate(cx,cy*.6);_c.rotate(ang);
        var gr=_c.createLinearGradient(0,0,0,-mx);
        gr.addColorStop(0,'rgba(201,168,76,.06)');gr.addColorStop(1,'rgba(201,168,76,0)');
        _c.beginPath();_c.moveTo(-11,0);_c.lineTo(22,-mx);_c.lineTo(-22,-mx);_c.lineTo(11,0);
        _c.fillStyle=gr;_c.fill();_c.restore();
      }
      // حلقات
      for(var j=0;j<_g.length;j++){
        var rg=_g[j];rg.r+=rg.sp;rg.a-=.0018;
        if(rg.r>rg.mx||rg.a<=0){rg.r=38+Math.random()*32;rg.a=.14+Math.random()*.14;}
        _c.beginPath();_c.arc(cx,cy*.6,rg.r,0,Math.PI*2);
        _c.strokeStyle='rgba(201,168,76,'+rg.a.toFixed(2)+')';_c.lineWidth=1;_c.stroke();
      }
      // جسيمات عائمة
      for(var k=0;k<_p.length;k++){
        var p=_p[k];p.ph+=p.sp;
        p.x+=p.vx+Math.sin(t*.001+p.ph)*.28;p.y+=p.vy;
        if(p.y<-8)p.y=_hh+8;if(p.x<-8)p.x=_w+8;if(p.x>_w+8)p.x=-8;
        var sh=(Math.sin(p.ph)+1)*.5,al=p.a*(.38+sh*.62);
        _c.beginPath();_c.arc(p.x,p.y,p.r,0,Math.PI*2);
        if(p.gold){_c.fillStyle='rgba(201,168,76,'+al.toFixed(2)+')';_c.shadowBlur=5;_c.shadowColor='#C9A84C';}
        else{_c.fillStyle='rgba(255,255,255,'+(al*.45).toFixed(2)+')';_c.shadowBlur=3;_c.shadowColor='rgba(255,255,255,.3)';}
        _c.fill();_c.shadowBlur=0;
      }
      // رزاز ذهبي من الأسفل
      var fade=Math.min(t/400,1);
      for(var m=0;m<_bottom.length;m++){
        var b=_bottom[m];b.ph+=b.sp;
        b.x+=b.vx+Math.sin(t*.0008+b.ph)*.4;b.y+=b.vy;
        if(b.y<-20){b.y=_hh+Math.random()*50;b.x=Math.random()*_w;}
        var bal=b.a*fade*(Math.sin(b.ph)+1)*.5;
        _c.beginPath();_c.arc(b.x,b.y,b.r,0,Math.PI*2);
        _c.fillStyle='rgba(201,168,76,'+Math.min(bal,.9).toFixed(2)+')';
        _c.shadowBlur=8;_c.shadowColor='rgba(201,168,76,.6)';
        _c.fill();_c.shadowBlur=0;
        // هالة صغيرة
        _c.beginPath();_c.arc(b.x,b.y,b.r*2.5,0,Math.PI*2);
        _c.fillStyle='rgba(201,168,76,'+(bal*.1).toFixed(2)+')';
        _c.fill();
      }
      _r=requestAnimationFrame(_d);
    };
    _r=requestAnimationFrame(_d);
  }
  document.addEventListener('DOMContentLoaded',function(){_init();setTimeout(_stop,1800);});
})();

// ════ MODULE 3: CELEBRATION ════
(function(){
  // State Machine
  var STATE = 'IDLE'; // IDLE | ARMED | CELEBRATING | COOLDOWN
  var _cooldownT = 0;
  var _celRAF = null;
  var _timers = [];
  var _ctx = null;
  var _w = 0, _h = 0;
  var _pts = [];
  var _initialized = false;

  // ── Init Canvas مرة واحدة ──
  function _initCanvas(){
    if(_initialized) return;
    var c = document.getElementById('qo-canvas');
    if(!c) return;
    var dpr = window.devicePixelRatio||1;
    _w = window.innerWidth; _h = window.innerHeight;
    c.width = _w*dpr; c.height = _h*dpr;
    c.style.width = _w+'px'; c.style.height = _h+'px';
    _ctx = c.getContext('2d');
    _ctx.scale(dpr,dpr);
    _initPts();
    _initialized = true;
  }

  // ── جسيمات مرة واحدة ──
  function _initPts(){
    var cols=['#FFD54F','#FFC107','#E8D5A3','#C9A84C','#FFFFFF','#F59E0B'];
    _pts = [];
    for(var i=0;i<120;i++) _pts.push({
      x:0,y:0,vx:0,vy:0,
      sz:Math.random()*4.5+1.5,
      col:cols[Math.floor(Math.random()*cols.length)],
      al:1,rot:0,
      rs:(Math.random()-.5)*.18,
      g:.1+Math.random()*.08
    });
  }

  // ── Reset جسيمات ──
  function _resetPts(){
    for(var i=0;i<_pts.length;i++){
      var p=_pts[i];
      p.x=_w/2+(Math.random()-.5)*_w*.45;
      p.y=_h/2+(Math.random()-.5)*_h*.35;
      p.vx=(Math.random()-.5)*5.5;
      p.vy=-(Math.random()*4.5+1.5);
      p.al=1;
      p.rot=Math.random()*Math.PI*2;
    }
  }

  // ── تشغيل ──
  function _start(){
    if(STATE !== 'ARMED') return;
    STATE = 'CELEBRATING';

    try{if(navigator.vibrate)navigator.vibrate([60,40,60]);}catch(e){}

    var cv = document.getElementById('cvs');
    if(cv) cv.classList.add('qibla-glow');

    _resetPts();

    var c = document.getElementById('qo-canvas');
    if(c) c.style.opacity='1';

    var txt = document.getElementById('qibla-success');
    if(txt){
      txt.style.display='block';
      txt.style.opacity='0';
      void txt.offsetWidth;
      requestAnimationFrame(function(){txt.style.opacity='1';});
    }

    var st = Date.now();
    var _draw = function(){
      if(STATE !== 'CELEBRATING'){_celRAF=null;return;}
      var el=Date.now()-st, pr=Math.min(el/2500,1);
      _ctx.clearRect(0,0,_w,_h);
      for(var i=0;i<_pts.length;i++){
        var p=_pts[i];
        p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.vx*=.99;p.rot+=p.rs;
        p.al=Math.max(0,1-pr*1.15);
        if(p.y>_h+20||p.al<=0) continue;
        _ctx.save();
        _ctx.translate(p.x,p.y);_ctx.rotate(p.rot);
        _ctx.globalAlpha=p.al;_ctx.fillStyle=p.col;
        if(p.col==='#C9A84C'||p.col==='#FFD54F'||p.col==='#F59E0B'){
          _ctx.shadowBlur=8;_ctx.shadowColor='#FFD700';
        }
        _ctx.fillRect(-p.sz/2,-p.sz/4,p.sz,p.sz/2);
        _ctx.shadowBlur=0;_ctx.restore();
      }
      _celRAF = requestAnimationFrame(_draw);
    };
    _celRAF = requestAnimationFrame(_draw);

    _timers.push(setTimeout(function(){
      var c2=document.getElementById('qo-canvas');if(c2)c2.style.opacity='0';
      var t2=document.getElementById('qibla-success');
      if(t2){t2.style.opacity='0';setTimeout(function(){t2.style.display='none';},500);}
      var cv2=document.getElementById('cvs');if(cv2)cv2.classList.remove('qibla-glow');
    },2500));

    _timers.push(setTimeout(function(){
      if(_celRAF){cancelAnimationFrame(_celRAF);_celRAF=null;}
      if(_ctx) _ctx.clearRect(0,0,_w,_h);
      for(var i=0;i<_timers.length;i++) clearTimeout(_timers[i]);
      _timers.length=0;
      STATE='COOLDOWN';
      _cooldownT=Date.now();
    },3100));
  }

  // ── State Machine ──
  function _celCheck(qDiff){
    var absD = qDiff<=180 ? qDiff : 360-qDiff;
    if(STATE==='IDLE'){
      if(absD<1.0){ STATE='ARMED'; _start(); }
    } else if(STATE==='COOLDOWN'){
      if(Date.now()-_cooldownT>=5000 && absD>3.0){ STATE='IDLE'; }
    }
  }

  // ── expose ──
  window._celCheck = _celCheck;

  document.addEventListener('DOMContentLoaded', function(){
    _initCanvas();
  });
})();
// ════ END MODULE 3 ════
