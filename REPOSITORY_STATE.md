# QiblaAstro q-app-an — Repository Operating State

> **READ THIS FILE BEFORE ANY BRANCH, RELEASE, ANDROID, DEPLOYMENT, OR SOURCE-MATERIALIZATION OPERATION.**
>
> This file exists so a new maintainer, automation, or future ChatGPT conversation can recover the repository's operating model without relying on previous chat history.

## 1. Authoritative working branch

The intended steady state of this repository is **ONE working branch only**:

- **`main`** — the single source of truth for the deployed web application, current application source, release verification, and future Android packaging work.

Do not create a parallel long-lived development/release branch unless the repository owner explicitly changes this policy.

### Consolidation status

The historical branch `release/aab-3.1.0` is temporarily retained only until the immutable reference tag described below has been created and verified. It must not receive new product changes.

**Deletion order is mandatory:**
1. complete the `main` release gates;
2. create and verify the immutable reference tag at the approved consolidated `main` commit;
3. only then delete `release/aab-3.1.0`.

Never delete the historical release branch before the reference tag exists remotely.

## 2. Immutable reference tag

Required tag name:

`qiblaastro-3.1.0-single-branch-reference`

### Purpose of this tag

This tag is a **historical recovery/checkpoint reference**, not a working line of development. It records the exact repository state at the moment q-app-an was consolidated to the single-branch `main` model.

It exists so that, even if a future conversation has no knowledge of the work that led here, the repository itself can identify a known consolidation checkpoint.

### Mandatory tag rules

- **DO NOT develop on this tag.**
- **DO NOT move, force-update, rewrite, retarget, or reuse this tag.**
- **DO NOT treat this tag as a branch.**
- **DO NOT make future releases by changing what this tag points to.**
- If a future historical checkpoint is needed, create a **new tag with a new name**.
- `main` continues forward; this tag remains permanently fixed to its original commit.

A checkout of the tag is for inspection, recovery comparison, or historical audit only and should normally be treated as read-only/detached HEAD.

## 3. Historical source provenance versus current source of truth

The `source/` directory was originally materialized from:

- Repository: `msdgabr-sudo/Mizan`
- Historical source branch: `a2-release-prep`
- Historical approved baseline SHA: `6e49775df5742413371a4165ea985173c43f5f5e`

`source/.release-source-sha` records that **historical baseline provenance**.

It does **NOT** mean that current `main/source` must be byte-for-byte replaced by that old Mizan snapshot. `main/source` intentionally contains validated post-baseline fixes made after handoff, including location-permission and Falaki presentation/runtime fixes.

**Current `main/source` is authoritative. Never overwrite it by re-materializing the historical Mizan baseline.**

The former materialization workflow has therefore been converted to a manual, read-only provenance audit.

## 4. Current release identity

- Product: `QiblaAstro ELITE`
- Package / Application ID: `com.qiblalabs`
- Version name: `3.1.0`
- Version code: `3`
- Minimum SDK: `23`
- Compile SDK: `36`
- Target SDK: `36`
- TWA origin: `https://app.qiblalabs.com`
- Web deployment source: `main`
- Android release source: current `main/source`

## 5. Protected application systems

Unless an explicitly scoped task proves a change is necessary, do not alter protected scientific/runtime systems while doing repository, release, UI, cache, or branch maintenance:

- computational Qibla / QT mathematics;
- WMM2025 and magnetic-declination mathematics;
- digital-compass mathematics;
- astronomical verification/camera solving;
- prayer-time calculation equations;
- trusted GNSS security policy.

WMM2025 corrects magnetic north versus true north. It does not calculate the Qibla.

Computational Qibla and astronomical verification remain separate systems; astronomical verification must never overwrite the computational Qibla result.

## 6. Location and Falaki post-baseline fixes that must be preserved

The current `main` line contains fixes made after the historical Mizan baseline. They are not permission to weaken trusted GNSS policy.

Important behavior to preserve:

- Location permission grant is distinct from availability of the first GNSS fix.
- `PERMISSION_DENIED` is the location-permission rejection case; GNSS timeout/unavailability must not create a permission-onboarding loop.
- Notification permission remains contextual and is not requested concurrently with first-run location permission.
- Trusted GNSS remains the authoritative live location source for protected application calculations.
- Falaki may keep its own last trusted location solely to render current-time astronomy immediately on reopen; that stored location must not become a fallback input for QT, WMM2025, prayer calculations, compass, or astronomical verification.

## 7. Release workflows after consolidation

- `.github/workflows/deploy-app-pages.yml` deploys the web application from `main`.
- `.github/workflows/verify-release-snapshot.yml` is the release verification/AAB proof gate for current `main` source.
- `.github/workflows/materialize-frozen-source.yml` is historical provenance **READ-ONLY** audit only. It must never recreate, replace, commit, or push `source/`.

Any future workflow change that can overwrite `main/source` from the historical Mizan baseline is a regression and must be rejected.

## 8. Signing boundary

Signing material remains external to GitHub:

- Upload-key alias: `qiblaastro`
- Keystores/passwords/service-account credentials must never be committed.
- Final signing is local using the existing guarded wrapper and verified upload key.

Do not add signing secrets to Actions merely to simplify the one-branch model.

## 9. Instructions for a future conversation or maintainer

When continuing this project in a new conversation:

1. Read this file first.
2. Inspect the live `main` HEAD before making any conclusion or write.
3. Treat `main` as the only working source branch after consolidation.
4. Treat `qiblaastro-3.1.0-single-branch-reference` as immutable historical evidence only.
5. Never reset `main` to the tag or to Mizan baseline SHA without explicit owner authorization and a proven recovery need.
6. Run release/security gates after changes that affect release behavior.
7. Do not infer current code state from old conversation text when GitHub can be inspected directly.

## 10. Consolidation completion criterion

The repository is fully consolidated only when all of the following are true:

- current `main` release verification passes;
- remote tag `qiblaastro-3.1.0-single-branch-reference` exists at the approved consolidation commit;
- tag target SHA has been verified;
- historical branch `release/aab-3.1.0` has then been deleted;
- a branch listing shows `main` as the only branch.

Until all five conditions are verified, report consolidation as **in progress**, not complete.
