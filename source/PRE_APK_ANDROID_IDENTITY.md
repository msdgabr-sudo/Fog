# QiblaAstro ELITE — Pre-APK Android Identity

**Branch:** `pre-aab/offline-adhan-priority`

**Status:** Release-preparation identity freeze  
**Date:** 2026-08-28

## Approved release identity

- Developer account type: `Personal`
- Developer name / brand: `Qiblalabs`
- App name: `QiblaAstro ELITE`
- Android Package ID: `com.qiblalabs`
- Version Name: `4.1.7`
- Version Code: `4`
- Approved TWA origin: `https://app.qiblalabs.com/`
- Web Manifest URL: `https://app.qiblalabs.com/manifest.json`
- Digital Asset Links URL: `https://app.qiblalabs.com/.well-known/assetlinks.json`
- Privacy Policy: `https://qiblalabs.com/privacy.html`
- GA4 Measurement ID: `G-1D1GKVZB74`
- Ads in first release: `No`

## Analytics/privacy boundary

GA4 is limited to coarse usage telemetry: application/surface open, stable screen/page names, navigation views, and active-screen duration. No application location coordinates, camera frames, compass readings, astronomical-verification values, prayer-specific user data, Quran reading detail, Adhkar content, or Android bridge tokens may be transmitted to GA4.

The release-preparation analytics implementation is web/TWA `gtag.js` only. It does not add Firebase Analytics, an advertising SDK, `AD_ID`, or a new Android runtime permission. Therefore this analytics work does not itself create a new Android permission dialog. Google Play Data safety must still disclose analytics collection consistently with the public privacy policy.

Analytics is non-essential. If applicable consent is denied, analytics measurement must not be treated as required application functionality. QiblaAstro must continue operating normally without analytics. No attempt may be made to bypass a user's consent choice merely to preserve metrics.

Current release analytics cache: `qiblaastro-v6.08-release-analytics`.

## Android / TWA hard gates

1. Do not change `com.qiblalabs` after the first Play upload.
2. Treat `https://app.qiblalabs.com/` as the production TWA origin; do not substitute a GitHub Pages path in the production Android package.
3. Do not publish `.well-known/assetlinks.json` with a guessed certificate fingerprint.
4. Generate or obtain the real Android signing certificate first.
5. Record the real SHA-256 signing certificate fingerprint.
6. Only then publish `.well-known/assetlinks.json` for `com.qiblalabs` at the root of the approved origin.
7. Verify the Digital Asset Links URL over HTTPS before considering TWA fullscreen ready.
8. Build and test an AAB on the Internal testing track before production.
9. First release must not request `AD_ID` or include an advertising SDK unless Play disclosures/privacy are intentionally revised.
10. Never commit a signing keystore, signing password, Play service-account JSON, or private key to this public repository.

## Build tooling decision

- Use the current GoogleChromeLabs Bubblewrap/PWABuilder TWA toolchain only after the approved origin is live and serving the intended A2 release candidate.
- Bubblewrap must preserve Package ID `com.qiblalabs`, host `app.qiblalabs.com`, start path `/?twa=1`, app version `4.1.7`, version code `4`, and the approved 512px/maskable icons.
- Keep signing material outside Git and inject it only at build/signing time.
- When Play App Signing is enabled, publish the Google Play **app signing certificate** SHA-256 in Digital Asset Links. A locally signed test APK may additionally require its own certificate fingerprint for local fullscreen verification.

## Acceptance gate before AAB upload

- PWA manifest valid.
- Service Worker registration/offline startup validated.
- Required icons and maskable icons validated.
- Camera/location permissions validated.
- GA4 Realtime test confirms approved Measurement ID, stable screen names and engagement timing only when analytics is legally/appropriately enabled.
- Privacy page publicly reachable and consistent with Play Data safety.
- `app.qiblalabs.com` resolves to the intended release candidate over HTTPS.
- Package ID and version fields match this document.
- Signing certificate SHA-256 captured.
- Digital Asset Links verified.
- TWA opens without browser chrome.
- Internal testing build installs and launches successfully.
