# QiblaAstro 4.1.7 (code 4) — Google Play submission checklist

This checklist is for the existing Google Play application update with package `com.qiblalabs`.

## Immutable release identity
- Package: `com.qiblalabs`
- Version name: `4.1.7`
- Version code: `4`
- Min SDK: `23`
- Compile SDK: `36`
- Target SDK: `36` (Android 16)
- Upload signing: use only the original approved Upload Key; never generate a replacement key for this update.

## Foreground service declaration — REQUIRED in Play Console
Code 4 uses one foreground service type: `mediaPlayback`, solely for audible local Adhan playback at a prayer time previously enabled by the user.

In Play Console > Policy / App content > Foreground service permissions, declare the `mediaPlayback` use case.

Suggested factual declaration text:

**Feature using the foreground service**
> When the user explicitly enables Adhan for prayer notifications, QiblaAstro schedules the selected prayer times locally on the device. At an enabled prayer time, the app starts a media-playback foreground service only to play the bundled Adhan audio and shows a visible ongoing notification with a Stop action. The service ends when the Adhan completes, is stopped, or loses required playback conditions.

**User impact if the task is deferred**
> The audible Adhan could start after the prayer time selected by the user, defeating the purpose of the time-sensitive prayer alert.

**User impact if the task is interrupted**
> The user-requested Adhan audio would stop before completion. The user can stop playback at any time from the visible notification.

**How the user initiates the feature**
> The user enables Adhan/notifications in the prayer settings and grants the required notification and, where applicable, Alarms & reminders access. No hidden background playback is enabled without that user choice.

### Demonstration video for the Play declaration
Record a short real-device video that visibly demonstrates:
1. Open QiblaAstro prayer settings.
2. Enable Adhan for a prayer.
3. Show the notification permission / Alarms & reminders flow if Android presents it.
4. Demonstrate the scheduled Adhan starting at its test/prayer event while the app is not required to remain on the prayer screen.
5. Show the foreground playback notification.
6. Press **Stop** from the notification and show that playback stops.

Use a real build of the feature being submitted. Do not describe or demonstrate functionality that is not present in the submitted release.

## Exact alarms
- Manifest uses `android.permission.SCHEDULE_EXACT_ALARM` (user-granted special access).
- `android.permission.USE_EXACT_ALARM` is forbidden by the release gate.
- Exact alarms are used only for user-facing selected prayer events.
- If exact access is unavailable, the implementation keeps an idle-safe inexact fallback rather than crashing.

## Foreground Adhan implementation
- Service type: `mediaPlayback`.
- Required permissions: `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MEDIA_PLAYBACK`.
- Audio is bundled locally in `res/raw`; the service does not download Adhan audio.
- Service has a visible notification and user Stop action.
- The boot/time-change receiver only reschedules prayer alarms and refreshes the widget; it does not start Adhan playback from `BOOT_COMPLETED`.

## Permissions deliberately NOT requested
The merged-release permission gate rejects these if they appear:
- `USE_EXACT_ALARM`
- `USE_FULL_SCREEN_INTENT`
- `RECORD_AUDIO`
- `ACCESS_BACKGROUND_LOCATION`
- `AD_ID`
- broad external-storage/media permissions
- contacts/calendar permissions
- battery-optimization exemption permission

## Android 16 / 16 KB page-size guard
The release AAB is required to contain no native `.so` shared libraries. QiblaAstro's TWA wrapper does not need native shared code. `check_aab_release.py` fails the release if a future dependency introduces any `.so` library, forcing an explicit 16 KB compatibility review before publication.

## TWA trust / Digital Asset Links
- Keep package `com.qiblalabs` unchanged.
- Keep the already-proven Code 3 `assetlinks.json` certificate fingerprints unless the actual Play App Signing certificate changes in Play Console.
- Do not replace Digital Asset Links with the Upload Key fingerprint merely because the AAB is signed with the Upload Key. Play App Signing can use a different app-signing certificate for installed builds.

## Preferred final path on the Windows computer — sign the already verified AAB
The complete release workflow at source commit `eafcaf92eae8be276ad36f7884771a268ee1e968` built and structurally verified the unsigned Code 4 AAB. Its approved AAB SHA-256 is:

`A7F87CAD4F398D107BC6B77F59C4C724A23D5F9CAC594568D3D1CE15DBC17BB6`

This is the preferred final route because the application is not rebuilt on the user's computer; only the exact CI-proven AAB is verified and signed with the original Upload Key, which never leaves that computer.

1. Download and extract the GitHub Actions artifact `QiblaAstro-4.1.7-code4-unsigned-AAB-proof` from the approved run. The extracted file must be named `QiblaAstro-4.1.7-code4-unsigned.aab`.
2. Update/switch the local checkout to `pre-aab/offline-adhan-priority` so the guarded signing script is present.
3. From the repository root run:

```powershell
.\sign-verified-code4-aab.ps1 `
  -UnsignedAabPath "C:\PATH\TO\QiblaAstro-4.1.7-code4-unsigned.aab" `
  -KeystorePath "D:\YOUR-SECURE-PATH\qiblaastro-upload.jks"
```

Use the actual local paths. Enter the keystore password only into the local `keytool`/`jarsigner` prompts; never put the password in a command, file, GitHub, or chat.

The signing script fails closed unless all of these are true:
- the unsigned AAB hash is byte-for-byte the approved CI artifact;
- BundleConfig, Android manifest and DEX are present;
- all four bundled Adhan resources are present;
- no native `.so` library exists;
- the keystore alias is `qiblaastro` and its certificate SHA-256 is the original approved Upload Key fingerprint;
- `jarsigner` validates the final AAB;
- the certificate read back from the signed AAB matches the approved Upload Key;
- signature records remain present after signing.

Successful output:
- `dist/QiblaAstro-4.1.7-code4-final.aab` — upload this file to Google Play;
- `dist/QiblaAstro-4.1.7-code4-final.aab.sha256`;
- `dist/QiblaAstro-4.1.7-code4-SIGNING-REPORT.txt`.

## Full local rebuild — secondary reproducibility path
If an independent full Android rebuild is deliberately required, use the root guarded build instead:

```powershell
.\build-final-signed-aab.ps1 -KeystorePath "D:\YOUR-SECURE-PATH\qiblaastro-upload.jks"
```

That route additionally requires the complete Android/Bubblewrap/JDK/SDK toolchain and reruns the release build. It is useful for reproducibility, but it introduces more local-environment variables than signing the already verified CI AAB.

## Before Play publication
- Upload only `QiblaAstro-4.1.7-code4-final.aab`, never the unsigned proof AAB.
- Complete the Play Console foreground-service declaration for `mediaPlayback` and attach the real-device demonstration video.
- Review the Play pre-launch/report warnings before promoting the release.
- Keep the generated SHA-256 and signing/release report with the release records.
