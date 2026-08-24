# QiblaAstro ELITE — Android TWA build workspace

This directory is intentionally isolated from the web application's runtime engines.

## Frozen identity
- Origin: `https://app.qiblalabs.com`
- Package ID: `com.qiblalabs.qiblaastro`
- App name: `QiblaAstro ELITE`
- Version name: `1.0.0`
- Version code: `1`
- First Play release: no ads / no `AD_ID`

## Hard safety boundaries
1. Never commit a `.jks` / `.keystore`, passwords, Play service-account JSON, or signing secrets.
2. The local key created for upload is an **Upload Key**. With Play App Signing, the certificate that signs APKs delivered to users can be different.
3. Production `assetlinks.json` must contain the SHA-256 of the certificate(s) that actually sign installed builds. For Google Play delivery this includes the Play App Signing certificate fingerprint shown in Play Console.
4. Do not publish a guessed or placeholder fingerprint.
5. Bubblewrap 1.24.1 currently generates `targetSdkVersion 35`. This project is required to target API 36 before Play submission so it remains compliant after 31 Aug 2026. Run the guarded target-API checker/patch after Bubblewrap generation and after every Bubblewrap `update`.
6. Do not modify web Qibla/astronomy/GNSS/camera engines from this Android workspace.

## Intended sequence
1. Confirm `https://app.qiblalabs.com` and manifest/icon URLs over HTTPS.
2. Generate Android project from `twa-manifest.json` using Bubblewrap.
3. Enforce `compileSdkVersion >= 36` and `targetSdkVersion = 36`.
4. Generate a local Upload Key outside Git tracking.
5. Build a signed local APK/AAB for internal validation.
6. Capture local certificate SHA-256 for direct-device test builds.
7. Enable Play App Signing and obtain the **Play App Signing certificate SHA-256** from Play Console.
8. Publish `.well-known/assetlinks.json` with the real certificate fingerprint(s).
9. Verify TWA launches without browser chrome.
10. Separately validate Android background behavior for Adhan and periodic Azkar audio. TWA notification delegation alone is not considered proof that scheduled background audio works when the app is closed.

## Bubblewrap commands (once Bubblewrap is available)
```bash
cd android-twa
bubblewrap update --skipVersionUpgrade --manifest=./twa-manifest.json
python3 ensure_target_api_36.py
bubblewrap build --skipSigning --manifest=./twa-manifest.json
```

The unsigned build is only a structural build gate. A release artifact must later be signed with the approved Upload Key.
