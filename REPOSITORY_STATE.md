# QiblaAstro Fog — Repository Operating State

> **READ THIS FILE BEFORE ANY BRANCH, RELEASE, ANDROID, DEPLOYMENT, OR SOURCE-MATERIALIZATION OPERATION.**
>
> This file records the current operating model so maintenance does not depend on old chat history or obsolete repository instructions.

## 1. Authoritative working source

The authoritative source of truth is:

- Repository: `msdgabr-sudo/Fog`
- Branch: `main`
- Application/web source: `source/`
- Production host: `https://app.qiblalabs.com`

Short-lived maintenance/test branches may be created for isolated review, but they are not alternative release sources. Normal product/deployment work returns to `main` only after review.

`msdgabr-sudo/q-app-an` and older release branches/tags are historical rollback/reference material. Do not develop on them and do not delete them casually.

## 2. Current release identity

- Product: `QiblaAstro ELITE`
- Package / Application ID: `com.qiblalabs`
- Version name: `4.1.7`
- Version code: `5`
- Minimum SDK: `23`
- Compile SDK: `36`
- Target SDK: `36`
- TWA origin: `https://app.qiblalabs.com`
- Web deployment source: `Fog/main/source`

The approved native source snapshot used for the signed Code 5 release is:

`937bea4b3a0d424177a35386a00bbccce1605895`

Current `main` may contain newer Web/PWA presentation fixes without requiring a new Android wrapper. A native Android change requires a separately reviewed release with a higher `versionCode`.

## 3. Historical source provenance

The `source/` directory originated from the historical Mizan handoff:

- Repository: `msdgabr-sudo/Mizan`
- Branch: `a2-release-prep`
- Baseline SHA: `6e49775df5742413371a4165ea985173c43f5f5e`

`source/.release-source-sha` records that historical provenance only.

**Never overwrite current `Fog/main/source` by re-materializing that historical snapshot.** Current source intentionally contains validated work after the handoff.

## 4. Protected application systems

Unless an explicitly scoped task proves a change is necessary, repository/release/UI/cache cleanup must not alter:

- computational Qibla / QT mathematics;
- WMM2025 and magnetic-declination mathematics;
- digital-compass mathematics;
- astronomical verification/camera solving;
- prayer-time calculation equations;
- trusted GNSS security policy;
- native Adhan/Azkar scheduling behavior.

WMM2025 corrects magnetic north versus true north; it does not calculate the Qibla.

Computational Qibla and astronomical verification remain separate systems. Astronomical verification must never overwrite the computational Qibla result.

## 5. Runtime compatibility state

`source/js/presentation/prayer/schedule-sync.js` currently retains `LEGACY_CODE3_MIGRATION_GUARD=true` as an intentional Web compatibility guard.

This does not make Code 3 the current release. Remove or disable that guard only as a separately reviewed change after the remaining Code 3 population is considered retired.

Do not delete `q-app-an` merely because Code 3 is operationally retired; it remains useful historical rollback evidence.

## 6. Current workflow roles

- `.github/workflows/deploy-app-pages.yml` deploys the production Web/PWA from `main` only.
- `.github/workflows/verify-release-snapshot.yml` verifies the current Android/release snapshot and builds an unsigned AAB proof when intentionally triggered by relevant release-source changes or manual dispatch.
- Historical materialization tooling is provenance-only and must never recreate, replace, commit, or push `source/` over current `main`.

A workflow that can silently overwrite current source from an old repository/baseline is a regression and must be rejected.

## 7. Signing boundary

- Upload-key alias: `qiblaastro`
- Keystores/passwords/service-account credentials must never be committed.
- `sign-verified-code5-aab.ps1` is pinned to the exact approved Code 5 unsigned artifact and must not be reused for another artifact.
- `build-final-signed-aab.ps1` is retired and fail-closed because it represented the obsolete Code 4 build path.

A future native release requires a new reviewed build/signing path and a higher versionCode.

## 8. Maintenance rules

When continuing maintenance:

1. Inspect live `main` before drawing conclusions or writing.
2. Work on an isolated short-lived branch for sensitive cleanup.
3. Compare the branch to `main` before merge.
4. Prefer documentation/tooling cleanup before touching runtime files.
5. Never mix repository cleanup with scientific, compass, astronomical, prayer, Adhan, Azkar, or GNSS behavior changes.
6. Run the relevant CI/deployment gates after any change that can affect release or runtime packaging.
7. Preserve historical references until their removal is explicitly authorized and independently reviewed.

## 9. Completion standard for cleanup work

Repository cleanup is complete only when the intended stale documentation/tooling is corrected, runtime behavior remains unchanged, the diff contains no unrelated application changes, and the applicable GitHub gates pass after merge.
