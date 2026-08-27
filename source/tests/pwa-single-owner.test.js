'use strict';

const fs = require('fs');
const assert = require('assert');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const index = read('index.html');
const homeFinal = read('js/home-final.js');
const englishRollout = read('js/i18n/english-rollout.js');
const homeFinalizer = read('js/home-reference-finalizer.js');
const worker = read('service-worker.js');

const registrationSources = [
  ['index.html', index],
  ['js/home-final.js', homeFinal],
  ['js/i18n/english-rollout.js', englishRollout],
  ['js/home-reference-finalizer.js', homeFinalizer]
];
let registrations = 0;
registrationSources.forEach(function (entry) {
  const count = (entry[1].match(/serviceWorker\.register\s*\(/g) || []).length;
  registrations += count;
  if (entry[0] !== 'js/home-final.js') {
    assert.strictEqual(count, 0, 'competing Service Worker registration remains in ' + entry[0]);
  }
});
assert.strictEqual(registrations, 1, 'production parent runtime must contain exactly one Service Worker registration');

assert(homeFinal.includes("navigator.serviceWorker.register('./service-worker.js',{scope:'./'})"), 'sole owner must register the relative production worker and scope');
assert(homeFinal.includes('registration.update()'), 'sole owner must request a worker update check');
assert(homeFinal.includes("data.type!=='SW_UPDATED'"), 'sole owner must consume worker activation messages');
assert(homeFinal.includes("localStorage.setItem('qiblaastro-version'"), 'sole owner must persist the active worker version');
assert(homeFinal.includes("window.addEventListener('beforeinstallprompt'"), 'sole owner must retain the deferred install prompt');
assert(homeFinal.includes("window.addEventListener('appinstalled'"), 'sole owner must clear the prompt after installation');
assert(homeFinal.includes("window.addEventListener('online'"), 'sole owner must retain online state synchronization');
assert(homeFinal.includes("window.addEventListener('offline'"), 'sole owner must retain offline state synchronization');
assert(!homeFinal.includes('window.location.reload()'), 'worker activation must not force an uncontrolled reload loop');

assert(!englishRollout.includes('forceFreshWorker'), 'language startup must not be coupled to PWA registration');
assert(/loading=true;loadPacks\(\)\.then/.test(englishRollout), 'language startup must continue directly through its own phrase-pack loader');
assert.strictEqual(fs.existsSync('js/22-init.js'), false, 'the unloaded init shadow must stay deleted');
assert(homeFinalizer.includes('navigator.serviceWorker.getRegistration()'), 'Home finalizer may request an update from the existing owner');
assert(!homeFinalizer.includes('serviceWorker.register('), 'Home finalizer must not create another registration');

assert(worker.includes("const APP_CACHE=VERSION+'-app'"), 'production worker cache ownership must remain unchanged');
assert(worker.includes("const NETWORK_TIMEOUT_MS=4000"), 'production worker must bound network-first requests before offline fallback');
assert(worker.includes("fetchWithTimeout(r,'no-store')"), 'production worker code refresh must use the bounded network-first helper');
assert(worker.includes("if(!response||!response.ok)throw new Error('network response unavailable')"), 'HTTP failures must fall back to the cached application copy');
assert(worker.includes("type:'SW_UPDATED',version:VERSION"), 'production worker must continue notifying controlled clients');

console.log('PASS PWA registration, install state, network state and update messages have one owner');
