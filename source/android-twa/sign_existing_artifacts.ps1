$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Here

$Keystore = Join-Path $Here 'keystore\qiblaastro-upload.jks'
$Alias = 'qiblaastro'
$UnsignedApk = Join-Path $Here 'app-release-unsigned-aligned.apk'
$UnsignedAabCandidates = @(
    (Join-Path $Here 'app\build\outputs\bundle\release\app-release.aab'),
    (Join-Path $Here 'app-release-bundle.aab')
)
$UnsignedAab = $UnsignedAabCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
$SignedApk = Join-Path $Here 'app-release-signed.apk'
$SignedAab = Join-Path $Here 'app-release-bundle-signed.aab'

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

Write-Host 'QiblaAstro ELITE — sign already-built artifacts only' -ForegroundColor Cyan
Write-Host 'This script does NOT run Bubblewrap or Gradle.' -ForegroundColor DarkYellow

Require-Command 'keytool'
Require-Command 'jarsigner'

if (-not (Test-Path -LiteralPath $Keystore -PathType Leaf)) {
    throw "Upload keystore not found: $Keystore"
}
if (-not (Test-Path -LiteralPath $UnsignedApk -PathType Leaf)) {
    throw "Unsigned APK not found: $UnsignedApk"
}
if (-not $UnsignedAab) {
    throw "Unsigned AAB not found. Checked: $($UnsignedAabCandidates -join ', ')"
}

$SdkRoot = 'C:\Android'
$ApkSignerCandidates = @(
    (Join-Path $SdkRoot 'build-tools\36.0.0\apksigner.bat'),
    (Join-Path $SdkRoot 'build-tools\35.0.0\apksigner.bat')
)
$ApkSigner = $ApkSignerCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $ApkSigner) {
    throw "apksigner.bat not found under C:\Android build-tools 36.0.0 or 35.0.0"
}

Write-Host '[1/5] Verify upload key identity...' -ForegroundColor Yellow
& keytool -list -keystore $Keystore -alias $Alias | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'Upload key verification failed.' }

Write-Host '[2/5] Confirm existing unsigned artifacts...' -ForegroundColor Yellow
Get-Item -LiteralPath $UnsignedAab,$UnsignedApk | Select-Object FullName,Length,LastWriteTime | Format-Table -AutoSize

Write-Host '[3/5] Ensure signed AAB exists and verifies...' -ForegroundColor Yellow
if (Test-Path -LiteralPath $SignedAab -PathType Leaf) {
    Write-Host 'Existing signed AAB found; verifying instead of signing it again.' -ForegroundColor DarkYellow
    & jarsigner -verify -verbose -certs $SignedAab | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Existing signed AAB verification failed.' }
} else {
    Write-Host 'No signed AAB found. Signing once with jarsigner...' -ForegroundColor DarkYellow
    & jarsigner -keystore $Keystore -signedjar $SignedAab $UnsignedAab $Alias
    if ($LASTEXITCODE -ne 0) { throw 'AAB signing failed.' }
    & jarsigner -verify -verbose -certs $SignedAab | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Signed AAB verification failed.' }
}

Write-Host '[4/5] Sign and verify APK with apksigner...' -ForegroundColor Yellow
Write-Host 'apksigner will request the keystore password interactively. No password is passed on the command line or stdin.' -ForegroundColor DarkYellow
Remove-Item -LiteralPath $SignedApk -Force -ErrorAction SilentlyContinue
& $ApkSigner sign --ks $Keystore --ks-key-alias $Alias --out $SignedApk $UnsignedApk
if ($LASTEXITCODE -ne 0) { throw 'APK signing failed.' }
& $ApkSigner verify --verbose --print-certs $SignedApk | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'Signed APK verification failed.' }

Write-Host '[5/5] Final signed artifacts...' -ForegroundColor Yellow
$Final = Get-Item -LiteralPath $SignedAab,$SignedApk
$Final | Select-Object FullName,Length,LastWriteTime | Format-Table -AutoSize
Write-Host 'PASS: existing artifacts signed successfully without rebuilding.' -ForegroundColor Green
Write-Host 'Next: upload app-release-bundle-signed.aab to Google Play Internal testing.' -ForegroundColor Yellow
