# QiblaAstro ELITE — A2 Delivery / APK & AAB Handoff

**Date:** 2026-08-14  
**Release branch:** `A2`  
**Release-preparation branch:** `a2-release-prep`  
**Purpose:** freeze the completed application work, isolate release normalization, and define the remaining gates before APK/AAB.

## 1. Application source of truth

`A2` remains the application source of truth. `pre` is not merged wholesale. Release normalization is isolated on `a2-release-prep` and must be reviewed before any merge to A2.

## 2. Android/TWA identity prepared for release

Approved release configuration: `com.qiblalabs`, `app.qiblalabs.com`, QiblaAstro ELITE, version `3.1.0` / code `3`, start URL `/?twa=1`, standalone portrait, notifications and location delegation enabled. Signing material remains outside Git.

The following release contracts are synchronized to `3.1.0` / `3`:
- `android-twa/twa-manifest.json`
- `android-twa/check_twa_config.py`
- `tools/pre_apk_check.py`
- `.github/workflows/a2-apk-rc.yml`
- `PRE_APK_ANDROID_IDENTITY.md`

## 3. Google Analytics 4 release identity

Approved GA4 Measurement ID: `G-1D1GKVZB74`.

Release-prep includes `js/analytics/privacy-safe-screen-tracker.js`.
It reports only stable application screen name, application surface (`web`, `pwa`, `android_twa`), virtual page/screen views, and active-screen duration in milliseconds.

Stable names cover Home, Digital Qibla, Astronomical Verification, Prayer Times, Quran, Adhkar, Serenity, Astronomy, GNSS and Settings.

Each internal SPA navigation emits a GA4 `page_view` with a synthetic `/app/<screen>` location and stable page title. On screen exit/background, `screen_engagement` is emitted with `engagement_time_msec`.

The tracker does not read application sensor/location/content payloads. It does not add Firebase Analytics, an advertising SDK, `AD_ID`, or any Android runtime permission. Synthetic analytics page locations exclude live query strings and fragments.

Analytics is explicitly non-essential. Failure to load GA4, blocked cookies, browser privacy controls, or a denied consent state must never block navigation, prayer calculations, GNSS, compass, astronomical verification, Quran, Adhkar, Serenity, notifications or Widget functionality. No application feature may depend on GA4 being available.

No custom cookie-consent popup is introduced by this release-preparation work. If a consent mechanism is legally required for a particular region, declining analytics must be respected and the application must continue working normally without analytics. Google Play Data safety and the public privacy policy must remain consistent with actual analytics behavior.

Current release analytics cache: `qiblaastro-v6.08-release-analytics`.

## 4. Release-control deltas ported from `pre`

Only release-control data was manually normalized; no whole-branch merge: `PRE_APK_ANDROID_IDENTITY.md`, `android-twa/check_twa_config.py`, `tools/pre_apk_check.py`, and the GA4 ID delta in `js/home-final.js`.

Application UI and scientific engines remain based on A2.

## 5. Release gate coverage

The repository-side pre-APK gate checks package/name/version/domain consistency, TWA version consistency, manifests/icons, approved GA4 ID, isolated screen tracking, stable screen names, synthetic analytics URLs, absence of sensitive application payload access, absence of Firebase/advertising SDK markers or `AD_ID`, Service Worker precache/version, and Digital Asset Links package consistency when present.

`a2-pre-native-release-gate.yml` and `a2-mobile-layout-gate.yml` now run on both `A2` and `a2-release-prep`. `a2-apk-rc.yml` builds the release-candidate APK only from `a2-release-prep` and first runs the repository Pre-APK and TWA configuration gates.

## 6. Remaining work before final APK/AAB release path

1. Obtain green CI on the final `a2-release-prep` head, including Pre-APK/TWA, pre-native, mobile-layout, i18n and Prayer UI gates.
2. Verify `https://app.qiblalabs.com/` serves the intended release candidate over HTTPS, including manifest, Service Worker and icons.
3. Confirm GA4 Realtime receives expected virtual page names and `screen_engagement` events without sensitive parameters when analytics is available.
4. Complete Google Play Data safety declarations consistently with the privacy policy, including analytics disclosure.
5. Create/confirm the upload signing key outside Git and capture the SHA-256 certificate fingerprint.
6. If Play App Signing is enabled, obtain the Google Play app-signing certificate SHA-256 and publish the correct fingerprint in `https://app.qiblalabs.com/.well-known/assetlinks.json`.
7. Verify Digital Asset Links over HTTPS and confirm the TWA opens fullscreen without browser chrome.
8. Use the generated `3.1.0` debug APK Release Candidate for real-device acceptance first.
9. After device acceptance, build/sign the AAB and upload it to Google Play Internal testing before any production decision.

## 7. Security rules

Never commit signing secrets, never guess a Digital Asset Links fingerprint, do not add Firebase Analytics/ads solely for analytics, and never transmit GNSS coordinates, camera data, compass readings, astronomical verification values, prayer-specific user data, Quran reading detail or Adhkar content to analytics.

## Handoff conclusion

A2 remains protected. `a2-release-prep` is the controlled release-preparation branch for QiblaAstro ELITE `3.1.0` / code `3`. APK RC generation is allowed only after its release gates pass; AAB follows real-device APK acceptance and signing/Digital Asset Links verification.