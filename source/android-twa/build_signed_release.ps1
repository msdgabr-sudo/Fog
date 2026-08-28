param(
    [Parameter(Mandatory = $true)]
    [string]$KeystorePath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# QiblaAstro 4.1.7 (code 4)
# LEGACY ENTRY POINT ONLY.
# There is exactly one authoritative signed Google Play build implementation:
# ../../build-final-signed-aab.ps1. Keeping signing logic in one place prevents
# an older script from bypassing release identity, Android API, offline/Adhan,
# AAB structural, 16 KB, Git-cleanliness, or upload-certificate gates.

$AndroidRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $AndroidRoot '..\..')).Path
$FinalScript = Join-Path $RepoRoot 'build-final-signed-aab.ps1'

if (-not (Test-Path -LiteralPath $FinalScript -PathType Leaf)) {
    throw "Authoritative final release script not found: $FinalScript"
}

Write-Host 'QiblaAstro 4.1.7 (code 4) — redirecting to the guarded final Windows release path.' -ForegroundColor Cyan
Write-Host 'No signing key is accepted from inside the repository.' -ForegroundColor Yellow

& $FinalScript -KeystorePath $KeystorePath
if ($LASTEXITCODE -ne 0) {
    throw "Guarded final release build failed with exit code $LASTEXITCODE"
}
