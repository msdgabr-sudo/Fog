'use strict';

/*
 * Frozen compatibility gate for the short migration window where a tester may
 * still have Google Play versionCode 3 while app.qiblalabs.com serves Fog Web.
 * Legacy Android contract reviewed against:
 * msdgabr-sudo/q-app-an@228c2f91f9ae794fdb25560271bf67612309e94d
 *
 * This test intentionally checks only the cross-version Web -> Android contract.
 * It does not authorize a domain cutover by itself.
 */
const fs=require('fs'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');

const prayer=read('js/presentation/prayer/schedule-sync.js');
const azkar=read('js/azkar-native-reminders.js');
const bootstrap=read('js/native-bridge-bootstrap.js');
const permissions=read('js/presentation/permissions-onboarding.js');
const code5Native=read('android-twa/native/prayer-widget/PrayerWidgetSyncActivity.java');
const twa=JSON.parse(read('android-twa/twa-manifest.json'));
const assetlinks=JSON.parse(read('.well-known/assetlinks.json'));
const cname=read('CNAME').trim();

const PLAY_CERTS=[
  '2F:04:F6:F6:4D:09:E0:82:32:BC:5A:1F:DD:58:4B:19:8F:37:92:F6:18:18:98:AC:F0:0C:7F:AC:C0:BA:7D:B8',
  'BD:44:CA:0B:4C:F9:7A:D6:C2:66:63:92:D0:84:04:8F:E1:6C:86:36:7A:8C:E8:B2:52:81:9C:29:2F:7B:13:C5'
];

// Same origin / package identity must survive the repository cutover.
assert.strictEqual(cname,'app.qiblalabs.com','custom domain must remain app.qiblalabs.com');
assert.strictEqual(twa.packageId,'com.qiblalabs','Android package identity changed');
assert.strictEqual(twa.host,'app.qiblalabs.com','TWA host identity changed');
assert.strictEqual(twa.startUrl,'/?twa=1','TWA surface marker must remain available');
assert.strictEqual(twa.features&&twa.features.locationDelegation&&twa.features.locationDelegation.enabled,true,'location delegation must remain enabled');

// Digital Asset Links must keep Google Play App Signing identities, not Upload Key identities.
assert(Array.isArray(assetlinks)&&assetlinks.length===1,'assetlinks must keep one first-party Android target');
assert.strictEqual(assetlinks[0].target.package_name,'com.qiblalabs','assetlinks package mismatch');
assert.deepStrictEqual(assetlinks[0].target.sha256_cert_fingerprints,PLAY_CERTS,'Play App Signing fingerprints changed');

// Code 3 and Code 5 launchers seed the same per-install fragment token contract.
assert(bootstrap.includes("sessionStorage.setItem('qiblaastro:native-token',token)"),'Fog Web must capture the legacy/current native token');
assert(bootstrap.includes("sessionStorage.setItem('qiblaastro:twa','1')"),'Fog Web must retain TWA surface state');
assert(bootstrap.includes("params.delete('nativeToken')"),'native token must be stripped from the visible URL after capture');

// Legacy Code 3 PrayerWidgetSyncActivity accepts qiblaastro://prayer-sync with
// token, notify, plan, t_*, m_*, advance and profile. The normal full delivery
// handoff therefore remains compatible when it carries the user's real choices.
assert(prayer.includes('intent://prayer-sync?'),'prayer bridge host/scheme contract missing');
assert(prayer.includes('scheme=qiblaastro;package=com.qiblalabs;category=android.intent.category.BROWSABLE'),'prayer intent must remain package-scoped to com.qiblalabs');
for(const token of [
  "q.set('token',token)",
  "q.set('notify',st.enabled?'1':'0')",
  "q.set('plan',payload.planText)",
  "q.set('advance',String(st.advance||0))",
  "q.set('profile',st.profile||'makkah')",
  "q.set('t_'+id,String(payload.times[id]))",
  "q.set('m_'+id,(st.prayers&&st.prayers[payload.map[id]])||'off')"
]) assert(prayer.includes(token),`legacy prayer handoff field missing: ${token}`);

// There is no reliable Web-side version handshake between Code 3 and Code 5.
// Code 3 ignores widgetOnly, so independent widget-only handoff must be disabled
// for the migration window rather than guessing the legacy native Adhan state.
assert(prayer.includes('var LEGACY_CODE3_MIGRATION_GUARD=true'),'Code 3 migration guard must remain explicitly enabled');
assert(prayer.includes('function maybeWidgetSync(reason){if(LEGACY_CODE3_MIGRATION_GUARD)return false;'),'automatic independent widget-only sync must fail closed during migration');
assert(prayer.includes("if(!captureToken()||(!autoEnabled()&&!hasExplicitPrayerPrefs()))return false;"),'manual widget refresh must require an already-authorized prayer state during migration');
assert(prayer.includes("return nativeSync('widget-legacy-safe',false);"),'authorized widget refresh must reuse the Code 3/5-compatible full sync');
assert(prayer.includes("q.set('widgetOnly','1')"),'Code 5 widget-only capability may remain dormant for post-migration re-enable');
assert(code5Native.includes('widgetOnly="1".equals')&&code5Native.includes('if(widgetOnly){finish();return;}'),'Code 5 must keep its dormant widget-only capability isolated from permission UI');
assert(code5Native.includes('if(!widgetOnly)e.putString("mode_"+id'),'Code 5 widget-only capability must preserve Adhan delivery choices when re-enabled after migration');

// Legacy Code 3 AzkarReminderActivity accepts qiblaastro://azkar-reminder with
// token + start/stop + interval + one of these stable phrase ids. Sending ten
// minutes remains fully compatible because Code 3 accepts any interval >= 5.
assert(azkar.includes('intent://azkar-reminder?token='),'Azkar bridge host/scheme contract missing');
assert(azkar.includes('scheme=qiblaastro;package=com.qiblalabs;category=android.intent.category.BROWSABLE'),'Azkar intent must remain package-scoped');
assert(azkar.includes("'&mode='+encodeURIComponent(mode)"),'Azkar start/stop mode missing');
assert(azkar.includes("'&interval='+encodeURIComponent(String(Math.max(10,minutes||10)))"),'Azkar interval field missing');
assert(azkar.includes("'&phrase='+encodeURIComponent(phraseId(text))"),'Azkar phrase field missing');
for(const id of ['subhanallah','alhamdulillah','allahuakbar','lailahaillallah','astaghfirullah','astaghfirullahalazim','subhanallahwabihamdih','lahawla','hasbiyallah','salat']){
  assert(azkar.includes(`'${id}'`),`legacy Code 3 Azkar phrase id missing: ${id}`);
}
assert(azkar.includes('Math.max(10,n)'),'Fog must clamp Android Azkar intervals to ten minutes while staying above the Code 3 native minimum');

// Location remains a browser/TWA permission path, so both old and new wrappers
// continue through Android Web/TWA location delegation without a new native API.
assert(permissions.includes('root.navigator.geolocation.getCurrentPosition('),'location permission must remain on the delegated Web/TWA path');
assert(permissions.includes("typeof root.tryBrowserGPS==='function'"),'Fog Web must continue to hand granted location to the existing trusted GNSS lifecycle');

console.log('Code 3 -> Fog Web cutover compatibility: PASS');
console.log('Identity/DAL/token stable; Prayer/Adhan full sync compatible; independent widget-only sync fail-closed; Azkar compatible at ten-minute floor; delegated location preserved.');