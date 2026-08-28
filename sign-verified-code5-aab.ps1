param(
    [Parameter(Mandatory = $true)]
    [string]$UnsignedAabPath,
    [Parameter(Mandatory = $true)]
    [string]$KeystorePath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# This script signs only the exact unsigned Code 5 AAB that passed the complete
# GitHub release workflow at the approved source commit below.
# It does not rebuild or modify application code.
$ApprovedSourceCommit = '937bea4b3a0d424177a35386a00bbccce1605895'
$ApprovedUnsignedSha256 = 'A87BF3C8A893E1FD8AEC0AA8F7731E99F8EE7183F109FC70EE53477744DF4A16'
$ExpectedAlias = 'qiblaastro'
$ExpectedUploadSha256 = 'E8:6F:83:F1:61:0B:6F:AA:4F:57:62:4F:44:B1:B8:74:83:49:DB:84:69:EB:3C:CE:06:A4:BA:05:5B:CB:EC:A7'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Dist = Join-Path $Root 'dist'

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name. Install/use a JDK that provides keytool and jarsigner."
    }
}

function Read-ZipEntries([string]$Path) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $Archive = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try {
        return @($Archive.Entries | ForEach-Object { $_.FullName })
    }
    finally {
        $Archive.Dispose()
    }
}

function Assert-AabStructure([string]$Path,[bool]$RequireSignature) {
    $Names = Read-ZipEntries $Path
    $Required = @(
        'BundleConfig.pb',
        'base/manifest/AndroidManifest.xml',
        'base/dex/classes.dex',
        'base/res/raw/adhan_mecca.mp3',
        'base/res/raw/adhan_ahmed_al_nufais.mp3',
        'base/res/raw/adhan_islam_sobhi.mp3',
        'base/res/raw/adhan_fajr.mp3'
    )
    foreach ($Entry in $Required) {
        if ($Names -notcontains $Entry) { throw "Required AAB entry missing: $Entry" }
    }
    $Native = @($Names | Where-Object { $_ -match '(?i)\.so$' })
    if ($Native.Count -ne 0) {
        throw "Native .so libraries unexpectedly entered the AAB. Stop for explicit Android 16 KB review: $($Native -join ', ')"
    }
    $Adhan = @($Names | Where-Object { $_ -match '(?i)^base/res/raw/adhan_[^/]+\.mp3$' })
    if ($Adhan.Count -ne 4) { throw "Expected exactly four bundled Adhan resources; found $($Adhan.Count)." }
    if ($RequireSignature) {
        $Sf = @($Names | Where-Object { $_ -match '(?i)^META-INF/[^/]+\.SF$' })
        $Block = @($Names | Where-Object { $_ -match '(?i)^META-INF/[^/]+\.(RSA|DSA|EC)$' })
        if ($Sf.Count -eq 0 -or $Block.Count -eq 0) { throw 'Signed AAB is missing jarsigner signature records.' }
    }
}

foreach ($Command in @('keytool','jarsigner')) { Require-Command $Command }
if (-not (Test-Path -LiteralPath $UnsignedAabPath -PathType Leaf)) { throw "Unsigned AAB not found: $UnsignedAabPath" }
if (-not (Test-Path -LiteralPath $KeystorePath -PathType Leaf)) { throw "Upload keystore not found: $KeystorePath" }
$UnsignedAab = (Resolve-Path -LiteralPath $UnsignedAabPath).Path
$Keystore = (Resolve-Path -LiteralPath $KeystorePath).Path
$ResolvedRoot = (Resolve-Path -LiteralPath $Root).Path
if ($Keystore.StartsWith($ResolvedRoot,[System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Security boundary violation: keep the Upload Key outside the Git repository.'
}

Write-Host 'QiblaAstro 4.1.7 (code 5) — sign verified CI AAB locally' -ForegroundColor Cyan
Write-Host "Approved source commit: $ApprovedSourceCommit"
Write-Host 'Package: com.qiblalabs'
Write-Host 'Target SDK: 36'
Write-Host ''

Write-Host '[1/7] Verify exact CI-built unsigned AAB SHA-256...' -ForegroundColor Yellow
$UnsignedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $UnsignedAab).Hash.ToUpperInvariant()
if ($UnsignedHash -ne $ApprovedUnsignedSha256) {
    throw "Unsigned AAB hash mismatch. Expected $ApprovedUnsignedSha256 but found $UnsignedHash. Do NOT sign this file."
}
Write-Host 'PASS: unsigned AAB is byte-for-byte the approved Code 5 CI artifact.' -ForegroundColor Green

Write-Host '[2/7] Verify AAB structure, bundled Adhan and no native .so libraries...' -ForegroundColor Yellow
Assert-AabStructure $UnsignedAab $false
Write-Host 'PASS: structural and Android 16 KB fail-closed gate passed.' -ForegroundColor Green

Write-Host '[3/7] Verify original Google Play Upload Key certificate...' -ForegroundColor Yellow
$SavedPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = 'Continue'
    $KeyInfo = (& keytool -list -v -keystore $Keystore -alias $ExpectedAlias | Out-String)
    $KeyExit = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $SavedPreference
}
if ($KeyExit -ne 0) { throw 'Upload key verification failed.' }
$KeyMatch = [regex]::Match($KeyInfo,'SHA256:\s*([0-9A-Fa-f:]+)')
if (-not $KeyMatch.Success) { throw 'Could not read SHA-256 fingerprint from Upload Key.' }
$ActualKey = $KeyMatch.Groups[1].Value.ToUpperInvariant()
if ($ActualKey -ne $ExpectedUploadSha256) {
    throw "Wrong Upload Key. Expected $ExpectedUploadSha256 but found $ActualKey."
}
Write-Host 'PASS: original approved Upload Key confirmed.' -ForegroundColor Green

Write-Host '[4/7] Sign AAB locally; password remains on this computer...' -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $Dist | Out-Null
$FinalAab = Join-Path $Dist 'QiblaAstro-4.1.7-code5-final.aab'
Remove-Item -LiteralPath $FinalAab -Force -ErrorAction SilentlyContinue
& jarsigner -keystore $Keystore -signedjar $FinalAab $UnsignedAab $ExpectedAlias
if ($LASTEXITCODE -ne 0) { throw 'AAB signing failed.' }

Write-Host '[5/7] Verify jarsigner signature and signer certificate...' -ForegroundColor Yellow
& jarsigner -verify -verbose -certs $FinalAab | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'Signed AAB jarsigner verification failed.' }
$SavedPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = 'Continue'
    $JarCert = (& keytool -printcert -jarfile $FinalAab | Out-String)
    $JarCertExit = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $SavedPreference
}
if ($JarCertExit -ne 0) { throw 'Could not read signed AAB certificate.' }
$JarMatch = [regex]::Match($JarCert,'SHA256:\s*([0-9A-Fa-f:]+)')
if (-not $JarMatch.Success) { throw 'Signed AAB certificate SHA-256 was not found.' }
$ActualSigner = $JarMatch.Groups[1].Value.ToUpperInvariant()
if ($ActualSigner -ne $ExpectedUploadSha256) {
    throw "Signed AAB certificate mismatch. Expected $ExpectedUploadSha256 but found $ActualSigner."
}
Write-Host 'PASS: final AAB is signed by the approved Upload Key.' -ForegroundColor Green

Write-Host '[6/7] Reinspect the signed AAB after signing...' -ForegroundColor Yellow
Assert-AabStructure $FinalAab $true
Write-Host 'PASS: signature records present; Adhan resources intact; no native .so libraries.' -ForegroundColor Green

Write-Host '[7/7] Hash and write final release record...' -ForegroundColor Yellow
$FinalHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $FinalAab).Hash.ToUpperInvariant()
$HashFile = Join-Path $Dist 'QiblaAstro-4.1.7-code5-final.aab.sha256'
"$FinalHash  QiblaAstro-4.1.7-code5-final.aab" | Set-Content -LiteralPath $HashFile -Encoding ASCII
$ReportFile = Join-Path $Dist 'QiblaAstro-4.1.7-code5-SIGNING-REPORT.txt'
@"
QiblaAstro Google Play Local Signing Report
==========================================
Approved source commit: $ApprovedSourceCommit
Package: com.qiblalabs
Version name: 4.1.7
Version code: 5
Target SDK: 36
Approved unsigned AAB SHA-256: $ApprovedUnsignedSha256
Upload certificate SHA-256: $ExpectedUploadSha256
Final signed AAB SHA-256: $FinalHash
Bundled Adhan resources: 4 verified
Native .so libraries: 0 verified
Final status: SIGNED AND VERIFIED FOR GOOGLE PLAY UPLOAD
"@ | Set-Content -LiteralPath $ReportFile -Encoding UTF8

Write-Host ''
Write-Host 'PASS: FINAL SIGNED GOOGLE PLAY CODE 5 AAB IS READY.' -ForegroundColor Green
Write-Host "AAB: $FinalAab" -ForegroundColor Green
Write-Host "SHA-256: $FinalHash" -ForegroundColor Green
Write-Host "Report: $ReportFile" -ForegroundColor Green
