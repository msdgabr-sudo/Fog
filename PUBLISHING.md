# QiblaAstro publishing source

## Current production authority

The authoritative repository is `msdgabr-sudo/Fog`.

- Working/deployment branch: `main`
- Web root: `source/`
- Production host: `https://app.qiblalabs.com`
- Android package: `com.qiblalabs`
- Current release: `4.1.7`
- Current Android versionCode: `5`
- GitHub Pages deployment: `.github/workflows/deploy-app-pages.yml` from `main` only

`msdgabr-sudo/q-app-an` is historical rollback/reference material. It is not the current publishing owner and must not receive normal product changes or production deployment work.

## Current Code 5 Android release

The approved Code 5 native source snapshot used for the signed 4.1.7 release is:

`937bea4b3a0d424177a35386a00bbccce1605895`

The repository contains `sign-verified-code5-aab.ps1`, which is intentionally pinned to the exact approved unsigned Code 5 AAB and approved Upload Key identity. It signs that verified artifact only; it does not rebuild application source.

Do not rebuild or re-sign Code 5 merely for Web/PWA changes. A future native Android change requires a separately reviewed release with a higher `versionCode` and a newly verified unsigned artifact.

The old generic `build-final-signed-aab.ps1` entry point is retired and must remain fail-closed so it cannot accidentally rebuild the obsolete Code 4 release line.

## Code 3 migration safety

The Web runtime currently retains the explicit `LEGACY_CODE3_MIGRATION_GUARD=true` in `source/js/presentation/prayer/schedule-sync.js` while migration compatibility is still intentionally preserved.

This guard is runtime compatibility only. It does not make Code 3 the release source and it does not make `q-app-an` the publishing repository.

Removal of the guard must be a separate reviewed Web change after the remaining Code 3 population is considered retired.

## Protected publishing invariants

Repository/publishing maintenance must not casually alter:

- computational Qibla / QT mathematics;
- WMM2025 mathematics;
- digital-compass mathematics;
- astronomical verification/camera calculations;
- prayer-time calculation equations;
- trusted GNSS security policy;
- native Adhan/Azkar scheduling behavior;
- Digital Asset Links certificate fingerprints.

Signing keys, passwords, service-account credentials, and keystores remain external to GitHub.

## Historical provenance

`source/.release-source-sha` records the historical Mizan handoff baseline:

`6e49775df5742413371a4165ea985173c43f5f5e`

It is a provenance marker only. It is not an instruction to overwrite current `Fog/main/source` with the old Mizan snapshot.

For rollback investigation, preserve `q-app-an` and historical branches/tags as read-only evidence unless the repository owner explicitly authorizes their removal.
