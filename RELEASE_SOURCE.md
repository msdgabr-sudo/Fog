# QiblaAstro ELITE 4.1.7 — Release Source and Provenance

> Read `REPOSITORY_STATE.md` before release, branch, source-materialization, or recovery work.

## Current source of truth

The authoritative application and Android release source is now:

- Repository: `msdgabr-sudo/q-app-an`
- Working/release branch: **`main`**
- Source directory: `source/`
- Package ID: `com.qiblalabs`
- Version name: `4.1.7`
- Version code: `4`
- Minimum SDK: `23`
- Compile SDK: `36`
- Target SDK: `36`
- TWA origin: `https://app.qiblalabs.com`

The repository is being consolidated to one working branch. `release/aab-3.1.0` is historical and must receive no new product changes. It may be deleted only after the immutable consolidation tag described in `REPOSITORY_STATE.md` has been created remotely and verified.

## Historical Mizan baseline provenance

The `source/` directory was originally materialized from:

- Source repository: `msdgabr-sudo/Mizan`
- Historical source branch: `a2-release-prep`
- Historical approved baseline commit: `6e49775df5742413371a4165ea985173c43f5f5e`

`source/.release-source-sha` retains that SHA as a **provenance marker**.

This SHA is **not an instruction to replace current `main/source`**. Current main intentionally includes validated post-baseline fixes, including location-permission and Falaki runtime/presentation fixes. Re-materializing the historical Mizan baseline over `main/source` would discard valid current work and is forbidden unless the repository owner explicitly authorizes a recovery operation after a separate audit.

The old materialization workflow is therefore retained only as a manual read-only provenance audit. It must not write to `source/` or push generated source commits.

## Immutable consolidation reference

Required reference tag:

`qiblaastro-3.1.0-single-branch-reference`

The tag is a fixed historical checkpoint for recovery/audit after consolidation. It is **not a development branch** and must never be moved, force-updated, rewritten, or reused for a later release. See `REPOSITORY_STATE.md` for the mandatory creation/deletion order.

## Acceptance evidence from historical handoff

At historical Mizan baseline `6e49775df5742413371a4165ea985173c43f5f5e`, both the complete pre-native release gate and APK Release Candidate workflow completed successfully. The APK workflow verified generated Android identity, API level, required permissions, forbidden permissions, native Azkar reminders, authenticated prayer notifications, local Adhan integration, authenticated Widget integration and the native launcher bridge, then produced the APK RC artifact.

APK RC workflow run: `31848703422`
APK RC artifact digest: `sha256:f882e633388e6174a4419ece1c6ea96fa669df0cdd4ef3ca4b3a93a0fbc767e1`

This historical evidence establishes the handoff baseline. Current `main` must additionally pass the current main release-verification workflow before any new Android package is treated as release-ready.

## Verified signing identities

Play App Signing certificate SHA-256 supplied from Google Play Console:

`2F:04:F6:F6:4D:09:E0:82:32:BC:5A:1F:DD:58:4B:19:8F:37:92:F6:18:18:98:AC:F0:0C:7F:AC:C0:BA:7D:B8`

Local upload keystore SHA-256, independently checked with `keytool` and matched to the Google Play Upload key certificate:

`E8:6F:83:F1:61:0B:6F:AA:4F:57:62:4F:44:B1:B8:74:83:49:DB:84:69:EB:3C:CE:06:A4:BA:05:5B:CB:EC:A7`

Expected local upload-key alias: `qiblaastro`.

The current Digital Asset Links configuration contains the Play App Signing fingerprint above and retains the second historical Play app-signing fingerprint documented in repository history. Do not remove certificate fingerprints without a certificate-rotation audit.

## Release invariants

Release packaging may not casually alter protected application behavior or scientific engines. In particular, preserve:

- QT / computational Qibla mathematics;
- WMM2025 magnetic-declination mathematics;
- digital-compass mathematics;
- astronomical verification/camera calculations;
- prayer calculation equations;
- trusted GNSS security policy;
- Quran/Azkar content unless explicitly scoped and reviewed.

The release must include the approved native integrations, including localized Azkar reminders, authenticated prayer notifications and local Adhan audio, authenticated home Widget, and `QiblaLauncherActivity` with its guarded per-install token behavior.

This ad-free release must not gain advertising-ID permission, and exact-alarm permission must not be introduced without a separately approved policy change.

## Signing boundary

The upload keystore and all signing passwords are external secrets. They must never be committed. Expected key file is `qiblaastro-upload.jks`, alias `qiblaastro`.

The GitHub release gate builds an unsigned AAB proof from current `main/source`. Final signing is performed locally with the verified upload keystore using `build-final-signed-aab.ps1`; the wrapper temporarily places the key in the ignored source keystore directory and removes it when finished.

Before Play upload, verify the final signed AAB and generated hashes. Google Play will re-sign distributed APKs with the Play App Signing certificate above.
