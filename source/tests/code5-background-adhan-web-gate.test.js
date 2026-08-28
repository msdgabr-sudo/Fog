'use strict';

const fs=require('fs');
const assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');

const page=read('pages/prayer.html');
const bootstrap=read('js/presentation/bootstrap.js');
const sync=read('js/presentation/prayer/schedule-sync.js');
const scheduler=read('android-twa/native/prayer-widget/PrayerNativeScheduler.java');
const receiver=read('android-twa/native/prayer-widget/PrayerNotificationReceiver.java');
const service=read('android-twa/native/prayer-widget/AdhanPlaybackService.java');
const boot=read('android-twa/native/prayer-widget/PrayerBootReceiver.java');
const manifestPatch=read('android-twa/apply_native_widget.ps1');

// Browser audio preview is optional and must never gate prayer settings or Native delivery.
assert(!page.includes('qa-audio-readiness'),'prayer screen must not expose the obsolete Web audio readiness gate');
assert(!page.includes('اختبار صلاحية الصوت'),'prayer screen must not imply that a Web proof tone enables background Adhan');
assert(!bootstrap.includes('audio-readiness.js'),'prayer screen loading must not wait for Web audio readiness');
assert(bootstrap.includes("js/presentation/prayer/screen.js?v=20260814-phone-acceptance1"),'prayer screen must load directly after Native sync/UI modules');

// A real user change must still trigger a full authenticated Native prayer sync.
for(const selector of ['[data-advance]','[data-prayer-mode]','[data-qa-adhan-toggle]']){
  assert(sync.includes(selector),`Native prayer sync must observe ${selector}`);
}
assert(sync.includes("function explicitSync(){return nativeSync('explicit');}"),'explicit full Native sync contract missing');
assert(sync.includes("q.set('notify',st.enabled?'1':'0')"),'Native sync must carry master Adhan enable state');
assert(sync.includes("q.set('plan',payload.planText)"),'Native sync must carry the offline date-stamped prayer plan');
assert(sync.includes("q.set('advance',String(st.advance||0))"),'Native sync must carry advance alert state');
assert(sync.includes('scheme=qiblaastro;package=com.qiblalabs;category=android.intent.category.BROWSABLE'),'Native prayer intent must stay package-scoped');

// Closed-app/offline Android chain: exact prayer alarm where allowed + idle-safe backup.
assert(scheduler.includes('setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)'),'actual prayer must use exact idle-safe alarm when permission is available');
assert(scheduler.includes('setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,backup)'),'actual prayer must retain an idle-safe backup alarm');
assert(scheduler.includes('canScheduleExactAlarms()'),'scheduler must check Android exact-alarm capability');
assert(receiver.includes('context.startForegroundService(service)'),'closed-app receiver must start Native foreground playback');
assert(service.includes('getResources().openRawResourceFd(rawId)'),'Adhan playback must use bundled local audio, not network audio');
assert(service.includes('AudioAttributes.USAGE_ALARM'),'Native playback must use alarm audio semantics');
assert(service.includes('PowerManager.PARTIAL_WAKE_LOCK'),'Native playback must hold a wake lock while playing');
assert(boot.includes('PrayerNativeScheduler.reschedule(context)'),'Native alarms must restore after reboot/package replacement/time changes');
assert(manifestPatch.includes('android.permission.SCHEDULE_EXACT_ALARM'),'generated app must request exact alarm special access');
assert(manifestPatch.includes('android.permission.RECEIVE_BOOT_COMPLETED'),'generated app must receive reboot restoration events');
assert(manifestPatch.includes('android:stopWithTask="false"'),'Adhan foreground playback must not be tied to the recent-task card');

console.log('Code 5 background Adhan: Web audio gate removed; authenticated Native exact/offline/closed-app chain preserved: PASS');
