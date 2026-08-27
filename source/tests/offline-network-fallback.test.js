'use strict';

const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const workerSource=fs.readFileSync('service-worker.js','utf8');
const homeSource=fs.readFileSync('js/home-final.js','utf8');
const origin='https://app.qiblalabs.com/';
const nativeResponse=global.Response;
const nativeHeaders=global.Headers;

function absolute(value){return new URL(typeof value==='string'?value:value.url,origin).href;}
function cacheKey(value,ignoreSearch){var u=new URL(absolute(value));if(ignoreSearch)u.search='';return u.href;}
class TestRequest{
  constructor(value,options){options=options||{};this.url=absolute(value);this.method=options.method||value.method||'GET';this.mode=options.mode||value.mode||'cors';this.headers=new nativeHeaders(options.headers||value.headers||{});this.signal=options.signal;}
}
class MemoryCache{
  constructor(fetcher){this.entries=new Map();this.fetcher=fetcher;}
  async match(request,options){const key=cacheKey(request,options&&options.ignoreSearch);for(const [stored,response] of this.entries){if(cacheKey(stored,options&&options.ignoreSearch)===key)return response.clone();}return undefined;}
  async put(request,response){this.entries.set(cacheKey(request,false),response.clone());}
  async addAll(requests){const staged=[];for(const request of requests){const response=await this.fetcher(request);if(!response||!response.ok)throw new Error('precache failed');staged.push([request,response]);}for(const [request,response] of staged)await this.put(request,response);}
}

let network='ok';
async function fetcher(request,options){
  const signal=options&&options.signal||request.signal;
  if(network==='hang')return new Promise((resolve,reject)=>{if(signal)signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})),{once:true});});
  if(network==='offline')throw new Error('offline');
  if(network==='error')return new nativeResponse('server error',{status:503});
  return new nativeResponse('cached:'+absolute(request),{status:200,headers:{'Content-Type':absolute(request).endsWith('.mp3')?'audio/mpeg':'text/plain'}});
}
const stores=new Map(),handlers={};
const caches={
  async open(name){if(!stores.has(name))stores.set(name,new MemoryCache(fetcher));return stores.get(name);},
  async match(request,options){for(const cache of stores.values()){const hit=await cache.match(request,options);if(hit)return hit;}return undefined;},
  async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}
};
const self={location:{origin:'https://app.qiblalabs.com',href:origin+'service-worker.js'},clients:{async matchAll(){return[];},async claim(){}},skipWaiting:async()=>{},addEventListener:(type,fn)=>{handlers[type]=fn;}};
const context={console,URL,Promise,Object,Array,Number,Math,Error,AbortController,Request:TestRequest,Response:nativeResponse,Headers:nativeHeaders,caches,fetch:fetcher,self,setTimeout(fn,ms){if(ms<=5000)queueMicrotask(fn);return 1;},clearTimeout(){}};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(workerSource,context);

async function dispatch(type,request){let promise;const event={request,waitUntil(p){promise=p;},respondWith(p){promise=p;}};handlers[type](event);return promise;}

(async()=>{
  await dispatch('install');
  assert(stores.size>=1,'precache was not created');

  network='offline';
  const offlinePage=await dispatch('fetch',{url:origin+'?twa=1',method:'GET',mode:'navigate',headers:new nativeHeaders()});
  assert.strictEqual(offlinePage.status,200,'offline navigation must return the cached application shell');
  assert((await offlinePage.text()).includes('index.html'),'offline root navigation must fall back to the cached index');

  network='error';
  const cachedCode=await dispatch('fetch',{url:origin+'js/azkar-new.js?v=fresh',method:'GET',mode:'cors',headers:new nativeHeaders()});
  assert.strictEqual(cachedCode.status,200,'HTTP server failure must fall back to cached code');

  network='hang';
  const timedOutCode=await dispatch('fetch',{url:origin+'js/presentation/prayer/adhan-ui.js?v=fresh',method:'GET',mode:'cors',headers:new nativeHeaders()});
  assert.strictEqual(timedOutCode.status,200,'a stalled network must time out to cached code');

  const ranged=await dispatch('fetch',{url:origin+'audio/adhan/mecca.mp3',method:'GET',mode:'cors',headers:new nativeHeaders({range:'bytes=0-5'})});
  assert.strictEqual(ranged.status,206,'cached Adhan must support offline byte ranges');
  assert.strictEqual((await ranged.arrayBuffer()).byteLength,6);

  assert(/const\s+NETWORK_TIMEOUT_MS\s*=/.test(workerSource),'bounded network fallback is missing');
  assert(homeSource.includes("document.addEventListener('DOMContentLoaded',registerWorker"),'offline installation must start at DOM readiness instead of waiting for every page asset');
  console.log('Offline runtime fallback: cached navigation, HTTP failure, stalled network and Adhan range: PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});

