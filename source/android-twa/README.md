# QiblaAstro ELITE — Android TWA build workspace

This directory is intentionally isolated from the Web application's runtime/scientific engines.

## Current Google Play update identity

- Origin: `https://app.qiblalabs.com`
- Package ID: `com.qiblalabs`
- App name: `QiblaAstro ELITE`
- Version name: `4.1.7`
- Version code: `5`
- Previous published baseline: `3.1.0` (code `3`) with the same package ID
- Minimum SDK: `23`
- Compile SDK: `36`
- Target SDK: `36`
- Release policy: no ads / no `AD_ID`

The approved native source snapshot used for the signed Code 5 release is:

`937bea4b3a0d424177a35386a00bbccce1605895`

## Hard safety boundaries

1. Never commit a `.jks` / `.keystore`, passwords, Play service-account JSON, or signing secrets.
2. This is an update to an existing Google Play app. Never generate or substitute a new Upload Key without an explicit key-rotation process.
3. Keep the Upload Key outside the entire Git repository.
4. With Play App Signing, the certificate that signs APKs delivered to users can differ from the Upload Key certificate. Preserve the proven Digital Asset Links fingerprints unless a certificate-rotation audit explicitly changes them.
5. Do not publish guessed or placeholder fingerprints.
6. API 36 enforcement and the no-native-`.so` release checks remain fail-closed requirements.
7. Actual prayer events may use user-granted `SCHEDULE_EXACT_ALARM`; the Play-restricted `USE_EXACT_ALARM` permission remains forbidden unless separately approved.
8. Full Adhan playback is bundled locally and uses the reviewed native foreground media-playback path.
9. Do not modify Web Qibla/astronomy/GNSS/camera engines from this Android workspace.

## Current Code 5 signing boundary

`sign-verified-code5-aab.ps1` is the dedicated Code 5 signing tool. It is intentionally pinned to the exact approved CI-built unsigned Code 5 AAB and the approved Upload Key certificate.

It does **not** rebuild the application. It must not be pointed at an arbitrary or newly built AAB.

The old repository-root `build-final-signed-aab.ps1` path is retired and fail-closed because it represented the obsolete Code 4 / old release-branch process.

Do not rebuild or re-sign Code 5 merely because Web/PWA files changed after the approved native source snapshot.

## Future native Android release

Any future native change requires all of the following before Google Play upload:

- a higher `versionCode` than 5;
- reviewed changes in the Android/native source;
- successful current release/security gates;
- a newly generated and verified unsigned AAB proof;
- a newly approved signing procedure for that exact artifact;
- structural verification, signature verification, and SHA-256 recording.

Do not reuse the pinned Code 5 signer for a future Code 6+ artifact.

## CI verification

`.github/workflows/verify-release-snapshot.yml` is the unsigned Android/release proof gate. It verifies the triggering current-source snapshot and may build an unsigned AAB artifact. GitHub Actions is not the signing authority; Upload Key material remains local and external.
