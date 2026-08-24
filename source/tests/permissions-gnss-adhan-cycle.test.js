'use strict';
const fs=require('fs'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');

const permissions=read('js/presentation/permissions-onboarding.js');
const gnss=read('js/05-gnss.js');
const nav=read('js/06-navigation.js');
const bootstrap=read('js/presentation/bootstrap.js');
const index=read('index.html');
const sync=read('js/presentation/prayer/schedule-sync.js');
const adhanUi=read('js/presentation/prayer/adhan-ui.js');
const runtime=read('js/runtime/trusted-location-dependent-sync.js');
const nativeActivity=read('android-twa/native/prayer-widget/PrayerWidgetSyncActivity.java');
const nativeScheduler=read('android-twa/native/prayer-widget/PrayerNativeScheduler.java');
const nativeReceiver=read('android-twa/native/prayer-widget/PrayerNotificationReceiver.java');
const twa=JSON.parse(read('android-twa/twa-manifest.json'));
const sw=read('service-worker.js');

// Android/TWA permission contract.
assert.strictEqual(twa.features&&twa.features.locationDelegation&&twa.features.locationDelegation.enabled,true,'TWA Android location delegation must stay enabled');
assert.strictEqual(twa.enableNotifications,true,'TWA notifications must stay enabled');
assert(nativeActivity.includes('POST_NOTIFICATIONS'),'Native prayer bridge must request Android 13+ notification permission');
assert(nativeActivity.includes('PrayerNativeScheduler.reschedule(this)'),'Native prayer bridge must persist and schedule received prayer data');

// First-run location permission is its own bounded user-gesture flow.
assert(permissions.includes("qiblaastro:permissions-onboarding:v3-location-only"),'Location-only state must not reuse the stale coupled v2 onboarding state');
assert(permissions.includes('getLocationPermissionStatus'),'Permission flow must observe the browser/TWA geolocation permission state');
assert(permissions.includes('root.navigator.geolocation.getCurrentPosition('),'The explicit location button must call geolocation so Android/TWA can show its native dialog');
assert(permissions.includes('function requestLocation(){')&&!permissions.includes('async function requestLocation()'),'The native geolocation request must not await the Permissions API observer');
assert(!permissions.includes("if(status&&status.state==='granted')return 'granted'"),'Permissions API state must not bypass the actual geolocation request');
assert(!permissions.includes("if(status&&status.state==='denied')return 'denied'"),'Permissions API state must not replace the actual geolocation request');
assert(permissions.includes('timer=root.setTimeout(settleFromObservedPermission,10000)'),'Permission request needs an independent bounded safety timeout');
assert(permissions.includes('enableHighAccuracy:false'),'Permission prompting must be separate from the later trusted high-accuracy GNSS acquisition');
assert(permissions.includes('maximumAge:60000'),'Permission prompting may use a non-authoritative cached location only to settle the permission dialog');
assert(permissions.includes("?p:'prompt'"),'An unresolved Android permission dialog must return control to the UI instead of hanging');
assert(permissions.includes("if(saved&&saved.location==='granted')permission='granted'"),'GNSS startup recovery must honor a granted permission even before onboarding is fully completed');

// Existing trusted GNSS engine remains authoritative; no replacement engine or fallback location.
assert(index.includes('function tryBrowserGPS()'),'Production inline trusted GNSS engine must remain present');
assert(permissions.includes("typeof root.tryBrowserGPS==='function'")&&permissions.includes('root.tryBrowserGPS()'),'Permissions cycle must reuse the existing production GNSS function');
assert(permissions.includes('trustedGnssReady()'),'Permissions cycle must wait for the existing trusted finite GNSS state');
assert(gnss.includes('gnssHasTrustedFix')&&gnss.includes("gnssSource='gps'"),'Trusted GNSS state contract must remain in the GNSS source');
assert(!/ipapi|ipinfo|geolocation-db|fetch\s*\(/i.test(gnss),'GNSS must not reintroduce IP/external location fallback');
assert(!nav.includes("gnssSource==='default'")&&!nav.includes('gnssSource==="default"'),'Retired GNSS source state must not survive in navigation');
assert(nav.includes("id==='compass'&&!gnssHasTrustedFix")&&nav.includes("if(!gnssHasTrustedFix)tryBrowserGPS()"),'Navigation recovery must use the authoritative trusted-fix state');
assert(nav.includes("&&gnssHasTrustedFix){updateQiblaFromPosition();}"),'Navigation must not publish Qibla before a trusted fix exists');
for(const forbidden of ['calcQibla(','refreshMdeclFromTrustedGnss(','calcPrayers(','sunPos(','moonPos(']){
  assert(!permissions.includes(forbidden),`Permissions integration must not touch protected calculation token: ${forbidden}`);
}

// Prayer runtime remains the only owner of prayer schedule calculation.
assert(runtime.includes('QiblaPrayerMethods.calculate'),'Prayer runtime must retain the approved prayer calculation engine');
assert(sync.includes('QiblaPrayerNativePlan.build(14)'),'Native prayer handoff must retain the validated dated plan');

// Location completion must not wait for, invoke or mutate the Adhan flow.
assert(permissions.includes("mergeState({completed:true,location:'granted',notifications:'contextual'"),'A successful location grant must complete the location onboarding immediately');
assert(permissions.includes('إذن إشعارات الأذان سيُطلب بشكل مستقل عند تفعيل الأذان'),'Successful location copy must make the independent Adhan permission lifecycle explicit');
for(const coupled of ['prepareAdhanStage','activateNativeAdhan','QiblaPrayerNativeSync','qiblaastro:prayer-runtime-sync','جاري تحديد الموقع وتجهيز الأذان']){
  assert(!permissions.includes(coupled),`Location onboarding must not contain coupled Adhan token: ${coupled}`);
}
assert(permissions.includes("notifications:'contextual'"),'Location onboarding may only describe notification permission as contextual');

// Existing Adhan permissions remain contextual in their own web/native modules.
assert(adhanUi.includes('function requestNotificationPermission()'),'Adhan UI must retain its independent notification permission request');
assert(adhanUi.includes('Notification.requestPermission()'),'Web notification permission must remain inside Adhan UI');
assert(sync.includes("q.set('notify',st.enabled?'1':'0')"),'Native handoff must continue to request notifications only from Adhan state');
assert(nativeActivity.includes('"1".equals(data.getQueryParameter("notify"))'),'Android notification permission must remain conditional on enabled Adhan notifications');
assert(nativeScheduler.includes('AlarmManager.RTC_WAKEUP')&&nativeScheduler.includes('setAndAllowWhileIdle'),'Native Adhan must remain scheduled for closed-app/Doze delivery');
assert(nativeScheduler.includes('PendingIntent.getBroadcast')&&nativeScheduler.includes('PrayerNotificationReceiver.class'),'Native Adhan delivery must remain BroadcastReceiver-based');
assert(nativeReceiver.includes('USAGE_ALARM')&&nativeReceiver.includes('rawForAdhan'),'Native receiver must retain local Adhan alarm audio');

// Service worker and loader must force this exact integration to replace stale first-run code.
assert(bootstrap.includes('permissions-onboarding.js?v=20260819-code3-location-only1'),'Bootstrap must request the fresh location-only permission asset');
assert(sw.includes("'./js/presentation/permissions-onboarding.js'"),'Permissions integration must stay in critical cache');
assert(sw.includes("VERSION='qiblaastro-3.1.0-code3-location-only-r1'"),'Service worker must evict the stale coupled cache');
assert(sw.includes("PERMISSIONS_RELEASE='code3-location-only-20260819-r1'"),'Service worker must advertise the location-only permissions release');
assert(!sw.includes("'./js/05-gnss.js'"),'Service worker must not activate the unused external GNSS implementation beside the production inline engine');

console.log('Permissions cycle: explicit bounded Android location request -> immediate independent completion -> trusted existing GNSS: PASS');
console.log('Adhan cycle: separate contextual web/native notification permission -> RTC_WAKEUP BroadcastReceiver local Adhan: PASS');
console.log('Safety: retired GNSS state removed; no IP fallback and no Qibla/WMM/prayer/Falaki/raw-equation implementation added to onboarding: PASS');
