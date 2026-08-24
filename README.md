# QiblaAstro Android Release Repository

> **Repository operators and future ChatGPT conversations:** read [`REPOSITORY_STATE.md`](./REPOSITORY_STATE.md) before any branch, release, source-materialization, deployment, or Android packaging operation.

This repository is the release/deployment home of QiblaAstro ELITE.

## Operating model

- **Authoritative working branch:** `main`
- Intended steady state: **one working branch only**
- Immutable consolidation reference tag: `qiblaastro-3.1.0-single-branch-reference`
- The reference tag is historical/read-only evidence. It must never be moved, rewritten, reused, or treated as a development branch.
- Historical `release/aab-3.1.0` is retained only during consolidation and may be deleted **only after** the reference tag exists remotely and its target SHA has been verified.

The complete rules, protected systems, provenance model, and recovery instructions are maintained in `REPOSITORY_STATE.md`.

## Release identity

- Application ID: `com.qiblalabs`
- Release line: `3.1.0`
- Version code: `3`
- Android target: API 36
- TWA origin: `https://app.qiblalabs.com`
- Current application/release source: `main/source`
- Historical Mizan baseline provenance: `6e49775df5742413371a4165ea985173c43f5f5e`
- Final release format: signed Android App Bundle (`.aab`)

The historical Mizan SHA is provenance only. Current `main/source` contains validated post-handoff fixes and must not be overwritten by re-materializing that old snapshot.

## Security

Signing keystores, passwords, service-account credentials, local Android SDK paths, generated APK/AAB files, and other secrets must never be committed to this repository.

Final signing remains outside GitHub using the guarded local signing workflow and verified upload key.
