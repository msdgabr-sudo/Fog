'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const css=read('css/digital-compass/digital-compass.css');
const page=read('pages/digital-compass.html');
const controller=read('js/digital-compass/digital-compass-controller.js');

function rulePreludes(source){
  const clean=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^@import[^\n]*\n/m,'');
  const preludes=[];
  let boundary=0;
  for(let index=0;index<clean.length;index++){
    if(clean[index]==='{'){
      const prelude=clean.slice(boundary,index).trim();
      if(prelude&&!prelude.startsWith('@'))preludes.push(prelude);
      boundary=index+1;
    }else if(clean[index]==='}')boundary=index+1;
  }
  return preludes;
}
for(const prelude of rulePreludes(css))for(const selector of prelude.split(',')){
  const normalized=selector.trim();
  assert(normalized.startsWith('.qd-screen')||normalized.startsWith('.qd-test-'),'selector escaped qd boundary: '+normalized);
}
assert(!css.includes(':root'));
assert(!/(^|[\s,{>+~])(html|body)(?=[\s,{>+~.#[:])/m.test(css));
assert(!/position\s*:\s*(fixed|sticky)/i.test(css));
assert(!/mix-blend-mode|background-blend-mode/i.test(css));
assert(css.includes('isolation: isolate;')&&css.includes('contain: layout paint style;')&&css.includes('overflow: clip;'));
const ids=[...page.matchAll(/\bid=["']([^"']+)["']/g)].map((match)=>match[1]);
const classes=[...page.matchAll(/\bclass=["']([^"']+)["']/g)].flatMap((match)=>match[1].trim().split(/\s+/));
assert(ids.length>0&&ids.every((id)=>id.startsWith('qd-')));
assert(classes.length>0&&classes.every((name)=>name.startsWith('qd-')));
assert.strictEqual((page.match(/class=["'][^"']*\bqd-screen\b[^"']*["']/g)||[]).length,1);
assert(!/\b(?:style|on\w+)=["']/i.test(page));
assert.strictEqual((controller.match(/document\.getElementById\(/g)||[]).length,1);
assert(controller.includes("screenRoot.querySelector('#'+id)"));
console.log('PASS fog Digital Compass style isolation');
