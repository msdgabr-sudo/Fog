'use strict';
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const homeFinal=fs.readFileSync('js/home-final.js','utf8');
const englishRollout=fs.readFileSync('js/i18n/english-rollout.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const bridge=fs.readFileSync('js/i18n/internal-screen-language-bridge.js','utf8');
const finalPhrases=fs.readFileSync('js/i18n/internal-screen-final-phrases.js','utf8');
function must(re,text,msg){if(!re.test(text))throw new Error(msg);}
function forbid(re,text,msg){if(re.test(text))throw new Error(msg);}
const registrations=[html,homeFinal,englishRollout].reduce((n,source)=>n+(source.match(/serviceWorker\.register\s*\(/g)||[]).length,0);
if(registrations!==1)throw new Error('production must register exactly one Service Worker; found '+registrations);
forbid(/serviceWorker\.register\s*\(/,html,'index.html must delegate registration to the guaranteed external runtime.');
forbid(/serviceWorker\.register\s*\(/,englishRollout,'language rollout must not own PWA registration.');
must(/serviceWorker\.register\(['\"]\.\/service-worker\.js['\"]/,homeFinal,'home-final.js does not register service-worker.js.');
must(/registration\.update\s*\(\s*\)/,homeFinal,'PWA owner does not explicitly check for SW updates.');
must(/data\.type!==['\"]SW_UPDATED['\"]/,homeFinal,'PWA owner does not handle SW_UPDATED.');
must(/const VERSION=['\"]qiblaastro-[^'\"]+['\"]/,sw,'Service Worker does not use an explicit QiblaAstro cache version.');
for(const p of ['english-rollout.js','internal-screen-language-bridge.js','internal-screen-phrases.js','internal-screen-final-phrases.js','prayer-phrases.js','pages/prayer.html','pages/quran.html','pages/azkar.html','pages/serenity.html','pages/falaki.html'])if(!sw.includes(p))throw new Error('Service Worker missing critical multilingual asset: '+p);
must(/postMessage\(\{type:['\"]SW_UPDATED['\"],version:VERSION\b/,sw,'Service Worker does not notify controlled clients after activation.');
must(/MIZAN_INTERNAL_FINAL_PHRASES/,bridge,'Internal bridge does not merge final internal phrase pack.');
must(/MIZAN_INTERNAL_FINAL_DYNAMIC/,bridge,'Internal bridge does not merge final internal dynamic patterns.');
must(/internal-screen-final-phrases\.js/,bridge,'Internal bridge does not load final internal phrase pack.');
must(/compass:1/,bridge,'Compass is not blocked in internal i18n bridge.');
must(/verification:1/,bridge,'Verification is not blocked in internal i18n bridge.');
forbid(/getUserMedia|mediaDevices|DeviceOrientationEvent|AbsoluteOrientationSensor/,bridge,'Internal i18n bridge touches camera/orientation APIs.');
for(const key of ['أذكار المساء','أذكار النوم','أذكار الاستيقاظ','أذكار السفر','أذكار بعد الصلاة','الأدعية'])if(!finalPhrases.includes(key))throw new Error('Final internal phrase pack missing UI key: '+key);
console.log('PASS: index.html, versioned Service Worker and internal multilingual presentation are coherently wired.');
