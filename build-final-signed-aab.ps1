param(
    [Parameter(Mandatory = $true)]
    [string]$KeystorePath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceRoot = Join-Path $Root 'source'
$AndroidRoot = Join-Path $SourceRoot 'android-twa'
$FrozenShaFile = Join-Path $SourceRoot '.release-source-sha'
$ExpectedSourceSha = '6e49775df5742413371a4165ea985173c43f5f5e'
$ExpectedBranch = 'pre-aab/offline-adhan-priority'
$ExpectedRepository = 'msdgabr-sudo/Fog'
$ExpectedAlias = 'qiblaastro'
$ExpectedUploadSha256 = 'E8:6F:83:F1:61:0B:6F:AA:4F:57:62:4F:44:B1:B8:74:83:49:DB:84:69:EB:3C:CE:06:A4:BA:05:5B:CB:EC:A7'
$Manifest = Join-Path $AndroidRoot 'twa-manifest.json'

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Test-Jdk17Home([string]$JdkHome) {
    if (-not $JdkHome) { return $false }
    $JavaExe = Join-Path $JdkHome 'bin\java.exe'
    if (-not (Test-Path -LiteralPath $JavaExe -PathType Leaf)) { return $false }
    $SavedPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $VersionText = (& $JavaExe -version 2>&1 | Out-String)
        $ExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $SavedPreference
    }
    if ($ExitCode -ne 0) { return $false }
    return ($VersionText -match 'version\s+"17(?:\.|\")')
}

function Resolve-Jdk17Home {
    $Candidates = New-Object System.Collections.Generic.List[string]
    if ($env:JAVA_HOME) { $Candidates.Add($env:JAVA_HOME) }

    $AdoptiumRoot = 'C:\Program Files\Eclipse Adoptium'
    if (Test-Path -LiteralPath $AdoptiumRoot -PathType Container) {
        Get-ChildItem -LiteralPath $AdoptiumRoot -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { $Candidates.Add($_.FullName) }
    }

    $JavaRoot = 'C:\Program Files\Java'
    if (Test-Path -LiteralPath $JavaRoot -PathType Container) {
        Get-ChildItem -LiteralPath $JavaRoot -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { $Candidates.Add($_.FullName) }
    }

    $PathJava = Get-Command java -ErrorAction SilentlyContinue
    if ($PathJava -and $PathJava.Source) {
        $BinDir = Split-Path -Parent $PathJava.Source
        $HomeFromPath = Split-Path -Parent $BinDir
        if ($HomeFromPath) { $Candidates.Add($HomeFromPath) }
    }

    foreach ($Candidate in ($Candidates | Select-Object -Unique)) {
        if (Test-Jdk17Home $Candidate) { return (Resolve-Path -LiteralPath $Candidate).Path }
    }
    throw 'A compatible JDK 17 installation was not found. This guarded release build requires JDK 17.'
}

foreach ($Command in @('git','python','node','bubblewrap','keytool','jarsigner')) {
    Require-Command $Command
}

Write-Host 'QiblaAstro ELITE 4.1.7 - guarded final Google Play build' -ForegroundColor Cyan
Write-Host 'Package: com.qiblalabs'
Write-Host 'Version: 4.1.7 (code 4)'
Write-Host 'Target SDK: 36 (Android 16)'
Write-Host ''

Write-Host '[1/18] Verify repository, release branch and clean source state...' -ForegroundColor Yellow
$ResolvedRoot = (Resolve-Path -LiteralPath $Root).Path
Push-Location $Root
try {
    $RepoTop = (& git rev-parse --show-toplevel).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'This folder is not a Git checkout.' }
    $RepoTop = (Resolve-Path -LiteralPath $RepoTop).Path
    if (-not [string]::Equals($RepoTop,$ResolvedRoot,[System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Run the release script from the repository root. Git root is: $RepoTop"
    }
    $CurrentBranch = (& git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $CurrentBranch -ne $ExpectedBranch) {
        throw "Wrong release branch. Expected '$ExpectedBranch' but found '$CurrentBranch'."
    }
    $Origin = (& git remote get-url origin).Trim()
    if ($LASTEXITCODE -ne 0 -or $Origin -notmatch 'msdgabr-sudo[\\/]Fog(?:\.git)?$') {
        throw "Wrong Git origin. Expected repository $ExpectedRepository but found '$Origin'."
    }
    $Dirty = (& git status --porcelain --untracked-files=all | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Could not verify Git working-tree status.' }
    if ($Dirty) {
        throw "Release checkout is not clean. Commit/stash intentional work and remove generated/untracked release files before signing.`n$Dirty"
    }
    $ReleaseHead = (& git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or $ReleaseHead -notmatch '^[0-9a-fA-F]{40}$') { throw 'Could not resolve release commit SHA.' }
} finally {
    Pop-Location
}
Write-Host "PASS: clean release checkout at $ReleaseHead" -ForegroundColor Green

if (-not (Test-Path -LiteralPath $FrozenShaFile -PathType Leaf)) {
    throw 'Source provenance marker is missing. Use the complete approved Fog checkout before signing.'
}
$ActualSourceSha = (Get-Content -LiteralPath $FrozenShaFile -Raw).Trim()
if ($ActualSourceSha -ne $ExpectedSourceSha) {
    throw "Frozen baseline provenance mismatch. Expected $ExpectedSourceSha but found $ActualSourceSha"
}
if (-not (Test-Path -LiteralPath $KeystorePath -PathType Leaf)) {
    throw "Upload keystore not found: $KeystorePath"
}
$ResolvedKeystore = (Resolve-Path -LiteralPath $KeystorePath).Path
if ($ResolvedKeystore.StartsWith($ResolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Security boundary violation: the upload keystore must remain outside the entire Git repository.'
}

# Pin only this PowerShell process to JDK 17; no machine-wide Java setting is changed.
$BuildJdk = Resolve-Jdk17Home
$env:JAVA_HOME = $BuildJdk
$env:Path = (Join-Path $BuildJdk 'bin') + ';' + $env:Path
Write-Host "Build JDK: $BuildJdk" -ForegroundColor Green
Write-Host "Expected upload key SHA-256: $ExpectedUploadSha256"
Write-Host "Expected alias: $ExpectedAlias"
Write-Host 'Enter passwords only into the local signing prompts. Never commit the key or password.' -ForegroundColor Yellow

Write-Host '[2/18] Verify external Google Play upload key identity...' -ForegroundColor Yellow
$SavedErrorActionPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = 'Continue'
    $KeyInfo = (& keytool -list -v -keystore $ResolvedKeystore -alias $ExpectedAlias | Out-String)
    $KeytoolExitCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $SavedErrorActionPreference
}
if ($KeytoolExitCode -ne 0) { throw 'Upload key verification failed.' }
$FingerprintMatch = [regex]::Match($KeyInfo, 'SHA256:\s*([0-9A-Fa-f:]+)')
if (-not $FingerprintMatch.Success) { throw 'Could not read SHA-256 fingerprint from the upload keystore.' }
$ActualUploadSha256 = $FingerprintMatch.Groups[1].Value.ToUpperInvariant()
if ($ActualUploadSha256 -ne $ExpectedUploadSha256) {
    throw "Upload key fingerprint mismatch. Expected $ExpectedUploadSha256 but found $ActualUploadSha256"
}
Write-Host 'PASS: local key matches the approved Google Play Upload certificate.' -ForegroundColor Green

Write-Host '[3/18] Run release-candidate source gates, including offline and Adhan...' -ForegroundColor Yellow
Push-Location $SourceRoot
try {
    & python .\tools\pre_apk_check.py
    if ($LASTEXITCODE -ne 0) { throw 'Pre-APK source gate failed.' }
    & python .\android-twa\check_twa_config.py
    if ($LASTEXITCODE -ne 0) { throw 'TWA configuration gate failed.' }
    foreach ($Test in @(
        '.\tests\android-release-version.test.js',
        '.\tests\adhan-runtime-resilience.test.js',
        '.\tests\offline-complete-shell.test.js',
        '.\tests\offline-network-fallback.test.js',
        '.\tests\permissions-gnss-adhan-cycle.test.js',
        '.\tests\prayer-widget-safe-autosync.test.js',
        '.\tests\native-android-localization-security.test.js',
        '.\tests\pre-native-release-readiness.test.js'
    )) {
        & node $Test
        if ($LASTEXITCODE -ne 0) { throw "Release source test failed: $Test" }
    }
} finally {
    Pop-Location
}

Write-Host '[4/18] Regenerate Android project from frozen Bubblewrap config...' -ForegroundColor Yellow
Push-Location $AndroidRoot
try {
    & bubblewrap update --skipVersionUpgrade --manifest=.\twa-manifest.json
    if ($LASTEXITCODE -ne 0) { throw 'Bubblewrap project generation failed.' }
} finally {
    Pop-Location
}
$GeneratedManifest = Join-Path $AndroidRoot 'app\src\main\AndroidManifest.xml'
if (-not (Test-Path -LiteralPath $GeneratedManifest -PathType Leaf)) { throw 'Generated AndroidManifest.xml missing.' }

Write-Host '[5/18] Enforce Android 16 / API 36...' -ForegroundColor Yellow
& python (Join-Path $AndroidRoot 'ensure_target_api_36.py')
if ($LASTEXITCODE -ne 0) { throw 'API 36 enforcement failed.' }

Write-Host '[6/18] Apply reviewed native Azkar/prayer/Adhan/widget integrations...' -ForegroundColor Yellow
& python (Join-Path $AndroidRoot 'apply_native_integrations.py') --all
if ($LASTEXITCODE -ne 0) { throw 'Native integration injection failed.' }

Write-Host '[7/18] Verify generated Play identity and native integration...' -ForegroundColor Yellow
& python (Join-Path $AndroidRoot 'check_generated_release_identity.py')
if ($LASTEXITCODE -ne 0) { throw 'Generated Android identity/API gate failed.' }
& python (Join-Path $AndroidRoot 'check_native_azkar_bridge.py')
if ($LASTEXITCODE -ne 0) { throw 'Native Azkar reminder gate failed.' }
& python (Join-Path $AndroidRoot 'check_native_widget.py')
if ($LASTEXITCODE -ne 0) { throw 'Native prayer/Adhan/widget gate failed.' }
& python (Join-Path $AndroidRoot 'check_release_integration.py')
if ($LASTEXITCODE -ne 0) { throw 'Post-injection release integration gate failed.' }

$GeneratedManifestText = Get-Content -LiteralPath $GeneratedManifest -Raw
foreach ($RequiredComponent in @('QiblaLauncherActivity','PrayerWidgetSyncActivity','QiblaWidgetProvider','AdhanPlaybackService','PrayerNotificationReceiver')) {
    if (-not $GeneratedManifestText.Contains($RequiredComponent)) { throw "Generated native component missing: $RequiredComponent" }
}
if ($GeneratedManifestText.Contains('WidgetDataActivity')) { throw 'Legacy WidgetDataActivity must remain absent.' }

Write-Host '[8/18] Bind Gradle to Android SDK 36 and JDK 17...' -ForegroundColor Yellow
$SdkCandidates = @()
foreach ($Candidate in @($env:ANDROID_SDK_ROOT, $env:ANDROID_HOME, 'C:\Android')) {
    if ($Candidate -and -not ($SdkCandidates -contains $Candidate)) { $SdkCandidates += $Candidate }
}
$SdkRoot = $null
foreach ($Candidate in $SdkCandidates) {
    if (Test-Path -LiteralPath (Join-Path $Candidate 'platforms\android-36') -PathType Container) {
        $SdkRoot = $Candidate
        break
    }
}
if (-not $SdkRoot) { throw "Android SDK root with platforms\android-36 was not found. Checked: $($SdkCandidates -join ', ')" }
if (-not (Test-Path -LiteralPath (Join-Path $SdkRoot 'build-tools\35.0.0') -PathType Container)) {
    throw "Android Build Tools 35.0.0 missing under $SdkRoot."
}
$ApkSignerCandidates = @(
    (Join-Path $SdkRoot 'build-tools\36.0.0\apksigner.bat'),
    (Join-Path $SdkRoot 'build-tools\35.0.0\apksigner.bat')
)
$ApkSigner = $ApkSignerCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $ApkSigner) { throw "apksigner.bat was not found under Android Build Tools in $SdkRoot" }
Set-Content -LiteralPath (Join-Path $AndroidRoot 'local.properties') -Value "sdk.dir=$($SdkRoot.Replace('\','/'))" -Encoding ASCII
Write-Host "Gradle SDK root: $SdkRoot"
Write-Host "Gradle JAVA_HOME: $env:JAVA_HOME"

Write-Host '[9/18] Merge release manifest under the pinned JDK...' -ForegroundColor Yellow
$GradleWrapper = Join-Path $AndroidRoot 'gradlew.bat'
if (-not (Test-Path -LiteralPath $GradleWrapper -PathType Leaf)) { throw 'Generated gradlew.bat missing.' }
Push-Location $AndroidRoot
try {
    & $GradleWrapper '--stop' | Out-Host
    & $GradleWrapper '--version' '--no-daemon' | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Gradle JVM verification failed.' }
    & $GradleWrapper ':app:processReleaseMainManifest' '--no-daemon'
    if ($LASTEXITCODE -ne 0) { throw 'Release manifest merge task failed.' }
} finally {
    Pop-Location
}

Write-Host '[10/18] Validate merged release Android permissions...' -ForegroundColor Yellow
& python (Join-Path $AndroidRoot 'check_generated_permissions.py')
if ($LASTEXITCODE -ne 0) { throw 'Merged release permission gate failed.' }

Write-Host '[11/18] Build unsigned APK + AAB...' -ForegroundColor Yellow
Push-Location $AndroidRoot
try {
    & bubblewrap build --skipSigning --skipPwaValidation --manifest=.\twa-manifest.json
    if ($LASTEXITCODE -ne 0) { throw 'Unsigned Bubblewrap build failed.' }
} finally {
    Pop-Location
}

$UnsignedApk = Join-Path $AndroidRoot 'app-release-unsigned-aligned.apk'
$UnsignedAabCandidates = @(
    (Join-Path $AndroidRoot 'app\build\outputs\bundle\release\app-release.aab'),
    (Join-Path $AndroidRoot 'app-release-bundle.aab')
)
$UnsignedAab = $UnsignedAabCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not (Test-Path -LiteralPath $UnsignedApk -PathType Leaf)) { throw "Expected unsigned aligned APK was not produced: $UnsignedApk" }
if (-not $UnsignedAab) { throw 'Expected unsigned AAB was not produced.' }

Write-Host '[12/18] Inspect unsigned AAB structure and enforce no-native-code/16KB guard...' -ForegroundColor Yellow
& python (Join-Path $AndroidRoot 'check_aab_release.py') $UnsignedAab
if ($LASTEXITCODE -ne 0) { throw 'Unsigned AAB structural/16KB gate failed.' }

$SignedAab = Join-Path $AndroidRoot 'app-release-bundle-signed.aab'
$SignedApk = Join-Path $AndroidRoot 'app-release-signed.apk'
Remove-Item -LiteralPath $SignedAab,$SignedApk -Force -ErrorAction SilentlyContinue

Write-Host '[13/18] Sign AAB with the verified external upload key...' -ForegroundColor Yellow
& jarsigner -keystore $ResolvedKeystore -signedjar $SignedAab $UnsignedAab $ExpectedAlias
if ($LASTEXITCODE -ne 0) { throw 'AAB signing with jarsigner failed.' }

Write-Host '[14/18] Verify signed AAB cryptographically and structurally...' -ForegroundColor Yellow
& jarsigner -verify -verbose -certs $SignedAab | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'Signed AAB jarsigner verification failed.' }
& python (Join-Path $AndroidRoot 'check_aab_release.py') $SignedAab --require-signature
if ($LASTEXITCODE -ne 0) { throw 'Signed AAB structural/signature-record gate failed.' }

Write-Host '[15/18] Sign APK with the same verified upload key...' -ForegroundColor Yellow
& $ApkSigner sign --ks $ResolvedKeystore --ks-key-alias $ExpectedAlias --out $SignedApk $UnsignedApk
if ($LASTEXITCODE -ne 0) { throw 'APK signing with apksigner failed.' }

Write-Host '[16/18] Verify signed APK certificate...' -ForegroundColor Yellow
$ApkVerify = (& $ApkSigner verify --verbose --print-certs $SignedApk | Out-String)
if ($LASTEXITCODE -ne 0) { throw 'Signed APK verification failed.' }
$ApkVerify | Out-Host
$NormalizedExpected = $ExpectedUploadSha256.Replace(':','').ToLowerInvariant()
$NormalizedApkVerify = ($ApkVerify -replace '[^0-9A-Fa-f]','').ToLowerInvariant()
if (-not $NormalizedApkVerify.Contains($NormalizedExpected)) {
    throw 'Signed APK certificate output does not contain the approved upload-key SHA-256 fingerprint.'
}

Write-Host '[17/18] Stage final artifacts and SHA-256 hashes...' -ForegroundColor Yellow
$Dist = Join-Path $Root 'dist'
New-Item -ItemType Directory -Force -Path $Dist | Out-Null
$FinalAab = Join-Path $Dist 'QiblaAstro-4.1.7-code4-final.aab'
$FinalApk = Join-Path $Dist 'QiblaAstro-4.1.7-code4-final.apk'
Copy-Item -LiteralPath $SignedAab -Destination $FinalAab -Force
Copy-Item -LiteralPath $SignedApk -Destination $FinalApk -Force
$Hashes = Get-FileHash -Algorithm SHA256 -LiteralPath $FinalAab,$FinalApk
$HashFile = Join-Path $Dist 'SHA256SUMS.txt'
$Hashes | ForEach-Object { "{0}  {1}" -f $_.Hash, (Split-Path -Leaf $_.Path) } | Set-Content -LiteralPath $HashFile -Encoding ASCII

Write-Host '[18/18] Write auditable final release report...' -ForegroundColor Yellow
$AabHash = ($Hashes | Where-Object { $_.Path -eq $FinalAab }).Hash
$ApkHash = ($Hashes | Where-Object { $_.Path -eq $FinalApk }).Hash
$ReportFile = Join-Path $Dist 'QiblaAstro-4.1.7-code4-RELEASE-REPORT.txt'
@"
QiblaAstro Google Play Release Report
=====================================
Release commit: $ReleaseHead
Repository: $ExpectedRepository
Branch: $ExpectedBranch
Package: com.qiblalabs
Version name: 4.1.7
Version code: 4
Min SDK: 23
Target SDK: 36
Compile SDK: 36
Upload certificate SHA-256: $ExpectedUploadSha256
AAB: QiblaAstro-4.1.7-code4-final.aab
AAB SHA-256: $AabHash
APK: QiblaAstro-4.1.7-code4-final.apk
APK SHA-256: $ApkHash
Bundled Adhan: verified
Offline release gates: passed
Native .so libraries in AAB: none (16 KB native page-size risk not applicable)
Restricted USE_EXACT_ALARM permission: forbidden by release gate
User-granted SCHEDULE_EXACT_ALARM: required for exact prayer delivery
Foreground Adhan type: mediaPlayback
Final status: PASSED ALL GUARDED LOCAL RELEASE GATES
"@ | Set-Content -LiteralPath $ReportFile -Encoding UTF8

Write-Host ''
Write-Host 'PASS: FINAL GOOGLE PLAY AAB PRODUCED AND VERIFIED.' -ForegroundColor Green
Write-Host "Release commit: $ReleaseHead" -ForegroundColor Green
Write-Host "Final AAB: $FinalAab" -ForegroundColor Green
Write-Host "Release report: $ReportFile" -ForegroundColor Green
$Hashes | Format-Table -AutoSize
