'use strict';

const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const source=fs.readFileSync('js/azkar-new.js','utf8');
const page=fs.readFileSync('pages/azkar.html','utf8');
const serviceWorker=fs.readFileSync('service-worker.js','utf8');

assert(page.includes('azkar-new.js?v=20260828-web-reminder1'),'Azkar page must request the corrected Web reminder runtime');
assert(serviceWorker.includes("VERSION='qiblaastro-v5.74-native-adhan-owner-20260829'"),'corrected Web reminder must use the current offline cache generation');

class ClassList{
  constructor(){this.values=new Set();}
  add(name){this.values.add(name);}
  remove(name){this.values.delete(name);}
  toggle(name,on){if(on===undefined)on=!this.values.has(name);if(on)this.values.add(name);else this.values.delete(name);return on;}
  contains(name){return this.values.has(name);}
}

class Element{
  constructor(id,tag){this.id=id||'';this.tagName=(tag||'div').toUpperCase();this.dataset={};this.classList=new ClassList();this.listeners={};this.children=[];this.textContent='';this.innerHTML='';this.disabled=false;this.selectedIndex=0;this.value='';this.style={};this.clientHeight=400;this.scrollHeight=100;this.scrollTop=0;}
  addEventListener(type,fn){(this.listeners[type]||(this.listeners[type]=[])).push(fn);}
  fire(type){for(const fn of this.listeners[type]||[])fn({target:this,stopPropagation(){},preventDefault(){}});}
  appendChild(child){this.children.push(child);if(this.id==='azAudioPhrase'&&this.children.length===1)this.value=child.value;return child;}
  querySelectorAll(selector){if(selector==='.az-interval')return this.children;return[];}
  querySelector(selector){if(selector==='.az-audio-status')return elements.azAudioStatus;return null;}
  closest(selector){if(selector==='.az-audio-panel')return elements.azAudioPanel;if(selector==='button,select')return this.tagName==='BUTTON'||this.tagName==='SELECT'?this:null;return null;}
}

const ids=['azkarApp','azHome','azReader','azAudio','azCategoryGrid','azBackHome','azAudioEntry','azAudioBack','azReaderSection','azReaderPosition','azReaderIndex','azRepeatLabel','azCounterValue','azDhikrScroller','azDhikrText','azDhikrSource','azDhikrVirtue','azCounter','azDhikrCard','azAudioPhrase','azAudioPreview','azIntervals','azPreviewBtn','azAudioToggle','azAudioState','azAudioSummary'];
const elements=Object.fromEntries(ids.map(id=>[id,new Element(id,id==='azAudioPhrase'?'select':id.includes('Btn')||id==='azAudioToggle'?'button':'div')]));
elements.azAudioPanel=new Element('azAudioPanel');
elements.azAudioStatus=new Element('azAudioStatus');
elements.azAudioToggle.closest=selector=>selector==='.az-audio-panel'?elements.azAudioPanel:null;
elements.azAudioPanel.querySelector=selector=>selector==='.az-audio-status'?elements.azAudioStatus:null;

let visibility='visible',now=0,nextTimer=1;
const documentListeners={},windowListeners={},timers=new Map(),audioInstances=[];
const document={
  readyState:'complete',
  get visibilityState(){return visibility;},
  getElementById(id){return elements[id]||null;},
  createElement(tag){return new Element('',tag);},
  addEventListener(type,fn){(documentListeners[type]||(documentListeners[type]=[])).push(fn);}
};
class ControlledDate extends Date{static now(){return now;}}
class FakeAudio{
  constructor(src){this.src=src;this.preload='';this.currentTime=0;this.muted=false;this.playCount=0;this.pauseCount=0;audioInstances.push(this);}
  play(){this.playCount++;return null;}
  pause(){this.pauseCount++;}
}
function addTimer(kind,fn,delay){const id=nextTimer++;timers.set(id,{id,kind,fn,delay,active:true});return id;}
function clearTimer(id){const timer=timers.get(id);if(timer)timer.active=false;}
function activeTimers(kind){return [...timers.values()].filter(t=>t.active&&(!kind||t.kind===kind));}
function fireTimer(timer){timer.active=false;timer.fn();}

const context={
  console,Math,JSON,Number,Object,Array,Promise,Date:ControlledDate,Audio:FakeAudio,document,
  navigator:{vibrate(){}},requestAnimationFrame(fn){fn();},
  setTimeout(fn,delay){return addTimer('timeout',fn,delay);},clearTimeout:clearTimer,
  setInterval(fn,delay){return addTimer('interval',fn,delay);},clearInterval:clearTimer,
  addEventListener(type,fn){(windowListeners[type]||(windowListeners[type]=[])).push(fn);},
  QIBLAASTRO_AZKAR_DATA:{categories:[],items:{},audioPhrases:[{text:'سبحان الله',audio:'../assets/audio/azkar-alerts/test.mp3'}],intervals:[5,10]}
};
context.window=context;context.globalThis=context;
vm.runInNewContext(source,context,{filename:'azkar-new.js'});

const interval5=elements.azIntervals.children.find(button=>button.textContent==='5 دقيقة');
const interval10=elements.azIntervals.children.find(button=>button.textContent==='10 دقيقة');
assert(interval5&&interval10,'test interval controls were not created');
interval5.fire('click');
context.AzkarPage.startReminder();

assert.strictEqual(activeTimers('interval').length,0,'Web reminder must use a deadline-based one-shot timer, not a drifting interval');
let timer=activeTimers('timeout').find(item=>item.delay===300000);
assert(timer,'five-minute reminder must arm a 300000ms deadline');
assert.strictEqual(audioInstances.length,1,'start must prepare one reusable audio element under the user action');
assert.strictEqual(audioInstances[0].playCount,1,'start must prime the reusable player once');

elements.azAudioBack.fire('click');
now=300000;
fireTimer(timer);
assert.strictEqual(audioInstances.length,1,'leaving the reminder view must not discard the user-unlocked audio element');
assert.strictEqual(audioInstances[0].playCount,2,'the due five-minute reminder must play on the prepared element');

interval10.fire('click');
const state=context.AzkarPage.getState();
assert.strictEqual(state.selectedInterval,10);
assert.strictEqual(state.nextReminderAt,900000,'changing the interval while running must replace the active deadline');
timer=activeTimers('timeout').find(item=>item.delay===600000);
assert(timer,'running reminder must be re-armed immediately for the selected ten-minute interval');

visibility='hidden';
now=900000;
fireTimer(timer);
assert.strictEqual(audioInstances[0].playCount,2,'hidden Web pages must not emit reminder audio');
visibility='visible';
for(const fn of documentListeners.visibilitychange||[])fn();
assert.strictEqual(audioInstances[0].playCount,3,'a throttled due reminder must fire once when the visible page resumes');
assert(activeTimers('timeout').some(item=>item.delay===600000),'resume delivery must arm the following deadline');

console.log('Azkar Web reminder: primed reusable audio, deadline reschedule and visible catch-up: PASS');
