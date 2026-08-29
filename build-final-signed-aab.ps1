param(
    [Parameter(Mandatory = $false)]
    [string]$KeystorePath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

throw @'
RETIRED RELEASE ENTRY POINT
===========================

build-final-signed-aab.ps1 is intentionally disabled.

It belonged to the obsolete Code 4 / pre-aab release path and must not rebuild
or sign the current QiblaAstro 4.1.7 (versionCode 5) release.

Current Code 5 rule:
- do not rebuild/re-sign Code 5 for Web/PWA-only changes;
- sign-verified-code5-aab.ps1 may sign only its exact approved CI-built unsigned
  Code 5 artifact and is pinned to that artifact's SHA-256;
- any future native Android release requires a higher versionCode, a newly
  reviewed unsigned AAB proof, and a newly approved signing procedure.

No signing key or password should ever be committed to this repository.
'@
