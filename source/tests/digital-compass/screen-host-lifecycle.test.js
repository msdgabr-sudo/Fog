'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(path.resolve(__dirname,'../../js/presentation/compass/digital-screen-host.js'),'utf8');
const screen={id:'qd-screen'};
const canonical={id:'cvs'};
const page={id:'page-compass',children:[canonical],appendChild(node){this.children.push(node);nodes.set(node.id,node);if(node.child===screen)nodes.set('qd-screen',screen);return node;}};
const nodes=new Map([['page-compass',page],['cvs',canonical]]);

function createElement(name){
  if(name==='template'){
    return{content:{querySelectorAll(selector){return selector==='#qd-screen'?[screen]:[];}},set innerHTML(value){this.markup=value;}};
  }
  return{id:'',hidden:false,attributes:{},setAttribute(key,value){this.attributes[key]=value;},appendChild(child){this.child=child.querySelectorAll?screen:child;}};
}

let mounts=0;
let unmounts=0;
const events=[];
const sandbox={
  document:{getElementById(id){return nodes.get(id)||null;},createElement},
  sessionStorage:{getItem(){return 'digital';}},
  fetch:async(url,options)=>{
    assert(url.startsWith('pages/digital-compass.html'));
    assert.strictEqual(options.cache,'no-store');
    return{ok:true,status:200,async text(){return'<section id="qd-screen"></section>';}};
  },
  QiblaDigitalCompassController:{async mount(){mounts++;return true;},unmount(){unmounts++;}},
  CustomEvent:function(type){this.type=type;},
  dispatchEvent(event){events.push(event.type);},
  console:{error(error){throw error;}}
};
sandbox.globalThis=sandbox;sandbox.window=sandbox;
vm.runInNewContext(source,sandbox,{filename:'digital-screen-host.js'});

(async()=>{
  const host=sandbox.QiblaDigitalCompassScreenHost;
  await host.mount();
  assert.strictEqual(host.isMounted(),true);
  assert.strictEqual(host.isActive(),true);
  assert.strictEqual(page.children[0],canonical,'canonical canvas must retain its node and position');
  assert.strictEqual(page.children.length,2,'digital host must append as one sibling');
  assert.strictEqual(nodes.get('qa-digital-compass-host').child,screen);
  assert.strictEqual(mounts,1);
  assert(events.includes('qiblaastro:digital-compass-mounted'));
  host.setActive(false);
  assert.strictEqual(nodes.get('qa-digital-compass-host').hidden,true);
  assert.strictEqual(unmounts,1);
  host.setActive(true);
  assert.strictEqual(nodes.get('qa-digital-compass-host').hidden,false);
  assert.strictEqual(mounts,2);
  await host.mount();
  assert.strictEqual(page.children.length,2,'repeat mount must not duplicate the screen');
  console.log('PASS fog isolated digital compass screen host lifecycle');
})().catch((error)=>{console.error(error);process.exitCode=1;});
