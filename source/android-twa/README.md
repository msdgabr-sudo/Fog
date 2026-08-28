# QiblaAstro ELITE — Android TWA build workspace

This directory is intentionally isolated from the web application's runtime engines.

## Frozen Google Play update identity
- Origin: `https://app.qiblalabs.com`
- Package ID: `com.qiblalabs`
- App name: `QiblaAstro ELITE`
- Version name: `4.1.7`
- Version code: `4`
- Previous published Play version: `3.1.0` (code `3`) with the same package ID
- Release policy: no ads / no `AD_ID`

## Hard safety boundaries
1. Never commit a `.jks` / `.keystore`, passwords, Play service-account JSON, or signing secrets.
2. **This is an update to an existing Google Play app. Do not generate or substitute a new Upload Key.** Use only the original approved Upload Key. The guarded root build script verifies its SHA-256 certificate fingerprint before signing.
3. Keep the Upload Key outside the entire Git repository. Supply its external Windows path only when running the final root build script.
4. With Play App Signing, the certificate that signs APKs delivered to users can be different from the Upload Key certificate. `assetlinks.json` must contain the certificate fingerprint(s) that actually sign installed builds; do not replace the already-proven Code 3 values with the Upload Key fingerprint.
5. Do not publish a guessed or placeholder fingerprint.
6. Bubblewrap 1.24.1 can generate a lower target SDK. This project must enforce Android 16 / API 36 before submission. `check_generated_release_identity.py` fails if package/version/min/compile/target SDK drift.
7. `check_aab_release.py` fails if any native `.so` library enters the AAB. The current wrapper needs no native shared libraries; this fail-closed rule prevents an unnoticed Android 16 KB page-size compatibility regression.
8. Actual prayer events use user-granted `SCHEDULE_EXACT_ALARM`; the Play-restricted `USE_EXACT_ALARM` permission is forbidden by the release gate.
9. Full Adhan playback is bundled locally and runs only through a declared `mediaPlayback` foreground service with the required foreground-service permissions.
10. Do not modify web Qibla/astronomy/GNSS/camera engines from this Android workspace.

## Authoritative final Windows build
The only approved signed-release entry point is the repository-root script:

```powershell
.\build-final-signed-aab.ps1 -KeystorePath "D:\YOUR-SECURE-PATH\qiblaastro-upload.jks"
```

Use the real path of the **existing original** Upload Key on your computer. The example path above is not a required location.

The script fails closed unless all of the following pass:
- correct `msdgabr-sudo/Fog` checkout and `pre-aab/offline-adhan-priority` branch;
- clean Git working tree;
- original Upload Key alias and certificate fingerprint;
- source identity, offline and Adhan tests;
- generated package `com.qiblalabs`, version `4.1.7` / code `4`;
- min SDK 23, compile SDK 36, target SDK 36;
- reviewed native prayer/Adhan/widget integration;
- merged Android permission policy;
- unsigned and signed AAB structural checks;
- no native `.so` files in the AAB;
- AAB jarsigner verification and APK apksigner verification;
- final SHA-256 hashes and an auditable release report.

Successful output is written to `dist/`:
- `QiblaAstro-4.1.7-code4-final.aab` — the Google Play upload artifact;
- `QiblaAstro-4.1.7-code4-final.apk` — local/device validation artifact;
- `SHA256SUMS.txt`;
- `QiblaAstro-4.1.7-code4-RELEASE-REPORT.txt`.

## Structural CI build
GitHub Actions builds an **unsigned proof AAB** from the exact triggering release-candidate commit. It is a structural and regression gate only; it is never a substitute for the locally signed Google Play artifact because the Upload Key must not be stored in GitHub.
