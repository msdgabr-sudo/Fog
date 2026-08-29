# QiblaAstro ELITE 4.1.7 — Release Source and Provenance

> Read `REPOSITORY_STATE.md` before release, branch, Android, deployment, source-materialization, or recovery work.

## Current source of truth

The authoritative application and Android release repository is:

- Repository: `msdgabr-sudo/Fog`
- Authoritative branch: `main`
- Source directory: `source/`
- Package ID: `com.qiblalabs`
- Version name: `4.1.7`
- Version code: `5`
- Minimum SDK: `23`
- Compile SDK: `36`
- Target SDK: `36`
- TWA origin: `https://app.qiblalabs.com`

`msdgabr-sudo/q-app-an` is historical rollback/reference material only. It is not the current source of truth and must not receive normal product changes.

## Current Code 5 signed-release provenance

The approved native source snapshot used for the signed Code 5 release is:

`937bea4b3a0d424177a35386a00bbccce1605895`

The dedicated `sign-verified-code5-aab.ps1` script is intentionally pinned to the exact CI-built unsigned Code 5 AAB and to the approved Upload Key certificate. It signs that already-verified artifact only and does not rebuild application code.

The generic `build-final-signed-aab.ps1` entry point is retired because it represented the obsolete Code 4 / old release-branch process. It must remain fail-closed.

A future native Android release must use a higher `versionCode`, a newly reviewed unsigned AAB proof, and a newly approved signing procedure. Do not repurpose the pinned Code 5 signer for a different artifact.

Web/PWA updates made after the approved Code 5 native snapshot do not by themselves require rebuilding the installed Android wrapper.

## Historical Mizan baseline provenance

The `source/` directory was originally materialized from:

- Source repository: `msdgabr-sudo/Mizan`
- Historical source branch: `a2-release-prep`
- Historical approved baseline commit: `6e49775df5742413371a4165ea985173c43f5f5e`

`source/.release-source-sha` retains that SHA as a provenance marker.

This SHA is not an instruction to replace current `Fog/main/source`. Current source intentionally contains validated work after that handoff. Re-materializing the historical Mizan baseline over current source would discard valid work and is forbidden unless the repository owner explicitly authorizes a recovery operation after a separate audit.

## Release invariants

Release and repository maintenance may not casually alter protected application behavior or scientific engines. Preserve:

- QT / computational Qibla mathematics;
- WMM2025 magnetic-declination mathematics;
- digital-compass mathematics;
- astronomical verification/camera calculations;
- prayer calculation equations;
- trusted GNSS security policy;
- Quran/Azkar content unless explicitly scoped and reviewed;
- native Adhan/Azkar scheduling and playback behavior unless explicitly scoped and reviewed.

Computational Qibla and astronomical verification remain separate systems; astronomical verification must never overwrite the computational Qibla result.

The release must remain ad-free and must not gain advertising-ID permission.

## Signing identities and security boundary

Play App Signing certificate SHA-256 currently recorded for production verification:

`2F:04:F6:F6:4D:09:E0:82:32:BC:5A:1F:DD:58:4B:19:8F:37:92:F6:18:18:98:AC:F0:0C:7F:AC:C0:BA:7D:B8`

Approved Upload Key certificate SHA-256:

`E8:6F:83:F1:61:0B:6F:AA:4F:57:62:4F:44:B1:B8:74:83:49:DB:84:69:EB:3C:CE:06:A4:BA:05:5B:CB:EC:A7`

Expected Upload Key alias: `qiblaastro`.

The upload keystore and all passwords are external secrets. They must never be committed to this or any other repository.

Do not remove or replace Digital Asset Links fingerprints without a certificate-rotation audit.

## Workflow roles

- `.github/workflows/deploy-app-pages.yml` deploys `source/` to `app.qiblalabs.com` from `main`.
- `.github/workflows/verify-release-snapshot.yml` verifies the current Android/release snapshot and can build an unsigned AAB proof; it is not a signing workflow.
- Historical source-materialization logic must remain read-only provenance tooling and must never overwrite current `main/source`.
