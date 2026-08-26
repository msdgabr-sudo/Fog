# QiblaAstro ELITE — Android Permission & Capability Release Matrix

**Branch:** `main`
**Package:** `com.qiblalabs`
**Origin:** `https://app.qiblalabs.com`  
**Target:** Android 16 / API 36

This document is a release boundary. A permission must not be added merely "just in case". Each permission/capability must have a current user-facing feature, a runtime flow, a privacy disclosure where applicable, and a physical-device acceptance test.

## Gate A — First TWA build: approved now

### Precise / approximate location
- Web feature: GNSS Qibla, prayer calculations, astronomical verification inputs.
- TWA config: `features.locationDelegation.enabled = true`.
- Expected Android wrapper permissions after Bubblewrap generation:
  - `android.permission.ACCESS_COARSE_LOCATION`
  - `android.permission.ACCESS_FINE_LOCATION`
- Runtime behavior: Android permission dialog; user may grant approximate or precise location.
- Privacy rule: precise coordinates remain functional data and must not be sent by our GA4 event layer.
- Acceptance: fresh install -> location request -> GNSS succeeds; denial produces controlled UI; granting later restores function.

### Notifications
- Feature: notification delegation plus native prayer and Azkar reminders.
- TWA config: `enableNotifications = true`.
- Required on Android 13+ / target API 36:
  - `android.permission.POST_NOTIFICATIONS`
- Runtime behavior: request in context, after explaining why reminders need it; do not surprise-request unrelated permissions at first paint.
- Acceptance: fresh install with permission reset -> Allow/Don't allow paths tested separately.

### Camera
- Feature: sun/moon astronomical observation.
- Current architecture: camera is requested by the web application through the trusted browser/TWA site permission flow.
- Release rule: do **not** add `android.permission.CAMERA` to the wrapper merely for symmetry unless the generated/native architecture demonstrably requires it.
- Acceptance: open astronomical verification -> site/TWA camera permission -> live camera opens; denial remains recoverable via site settings.

### Device orientation / motion
- Feature: digital compass / astronomical alignment.
- Release rule: no generic Android runtime permission is added just for orientation/accelerometer sensor readings in this wrapper.
- Acceptance: heading/motion update on a real device; device-specific browser sensor behavior tested.

### Audio playback
- Feature: Quran, Serenity, Adhan preview, native full Adhan, and short native Azkar reminder audio.
- Release rule: playback does not justify microphone permission.
- Explicitly forbidden: `android.permission.RECORD_AUDIO`.

## Gate B — Native background Adhan / Azkar scheduler: IMPLEMENTED

The requirement is stronger than ordinary PWA notifications: a selected adhan or dhikr must trigger at its configured time while the app is closed and the screen may be locked.

The native sources, manifest injector, merged-manifest permission gate, and structural build are present. Real-device lock-screen/Doze acceptance remains mandatory before production rollout.

### Exact scheduling
Prayer permission:
- `android.permission.SCHEDULE_EXACT_ALARM`

Rules:
- Use only for actual user-selected prayer events. Periodic Azkar and pre-prayer notices intentionally remain inexact with `setAndAllowWhileIdle`.
- Android special access is not pre-granted on fresh installs targeting modern Android.
- Before scheduling, check `canScheduleExactAlarms()`.
- Explain the need inside the app before opening the system "Alarms & reminders" access screen.
- If access is revoked after scheduling, retain the deduplicated inexact backup; the next app sync continues with inexact delivery until access is granted again.
- Reschedule after permission state changes and after reboot.
- Do not use `USE_EXACT_ALARM` unless a separate Play-policy review proves it is appropriate.

### Background audio playback
Required permissions for the implemented native playback service:
- `android.permission.FOREGROUND_SERVICE`
- `android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK`
- `android.permission.WAKE_LOCK`

Expected component:
- Android media playback foreground service / MediaSession-compatible service with `foregroundServiceType="mediaPlayback"`.

Rules:
- Use a visible stop-capable playback notification, MediaSession state, proper audio focus, and bundled local sound only.
- Do not add microphone foreground-service types.
- Android 15+ must not start a media playback foreground service directly from `BOOT_COMPLETED`.
- Boot handling may restore/reschedule user alarms, but actual playback starts from the legitimate scheduled/user event flow.

### Reboot resilience
`RECEIVE_BOOT_COMPLETED` and non-exported boot receivers restore future prayer/Azkar schedules. Boot never starts playback; playback begins only from a scheduled user-facing prayer event.

Acceptance for Gate B:
1. Configure a dhikr reminder a few minutes ahead.
2. Close/swipe away the app.
3. Lock screen.
4. Reminder fires at the configured time with the intended user experience.
5. Repeat with an adhan schedule.
6. Restart device, then confirm future schedules are restored without auto-playing audio at boot.
7. Revoke exact-alarm access and verify safe degradation.
8. Revoke notification permission and verify no crash / misleading success state.
9. Test battery saver / Doze behavior on at least one real Android device.

## Explicitly forbidden for first release unless requirements change

- `android.permission.RECORD_AUDIO` — no microphone capture.
- `com.google.android.gms.permission.AD_ID` — first release is ad-free.
- `android.permission.READ_EXTERNAL_STORAGE`
- `android.permission.WRITE_EXTERNAL_STORAGE`
- `android.permission.MANAGE_EXTERNAL_STORAGE`
- contacts permissions.
- calendar permissions.
- SMS / call-log / phone permissions.
- background location — current Qibla/prayer calculations do not justify continuous background location.

## Google Play / privacy alignment

- Developer account: Personal.
- Brand: Qiblalabs.
- GA4 is enabled for usage telemetry; our event layer must not send precise GNSS coordinates or camera observation data.
- Privacy policy: `https://qiblalabs.com/privacy.html`.
- First release: no advertising SDK.
- Any future permission change requires re-checking Play Data safety and the privacy policy before production.

## Automated gates

- `check_twa_config.py` verifies frozen TWA identity and configuration.
- `check_generated_permissions.py` inspects the AndroidManifest generated by Bubblewrap and blocks unjustified permissions before the structural build.
- `build_signed_release.ps1` runs configuration, API-36 and generated-permission gates before signing a local release.
